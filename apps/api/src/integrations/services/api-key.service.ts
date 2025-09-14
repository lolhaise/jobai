import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@jobai/database';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export interface ApiKeyConfig {
  provider: string;
  keyType: 'bearer' | 'apikey' | 'basic' | 'custom';
  key: string;
  secret?: string;
  endpoint?: string;
  expiresAt?: Date;
  rateLimits?: {
    requests: number;
    per: number;
  };
  metadata?: Record<string, any>;
}

export interface ApiKeyValidation {
  valid: boolean;
  provider?: string;
  expiresAt?: Date;
  rateLimits?: {
    requests: number;
    per: number;
  };
  error?: string;
}

export interface ApiKeyStats {
  totalKeys: number;
  activeKeys: number;
  expiredKeys: number;
  keysByProvider: Record<string, number>;
  recentUsage: {
    provider: string;
    requests: number;
    lastUsed: Date;
  }[];
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);
  private keyCache = new Map<string, ApiKeyConfig & { hashedKey: string; lastAccess: Date }>();
  private usageStats = new Map<string, { requests: number; lastUsed: Date }>();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {
    this.initializeDefaultKeys();
  }

  /**
   * Initialize API keys from environment variables
   */
  private async initializeDefaultKeys(): Promise<void> {
    const providers = [
      { name: 'remoteok', envKey: 'REMOTE_OK_API_KEY' },
      { name: 'remotive', envKey: 'REMOTIVE_API_KEY' },
      { name: 'themuse', envKey: 'THE_MUSE_API_KEY' },
      { name: 'usajobs', envKey: 'USA_JOBS_API_KEY' },
      { name: 'linkedin', envKey: 'LINKEDIN_API_KEY' },
      { name: 'indeed', envKey: 'INDEED_API_KEY' },
      { name: 'glassdoor', envKey: 'GLASSDOOR_API_KEY' },
    ];

    for (const provider of providers) {
      const apiKey = this.configService.get<string>(provider.envKey);
      
      if (apiKey) {
        try {
          const existingKey = await this.getApiKey(provider.name);
          
          if (!existingKey) {
            await this.storeApiKey({
              provider: provider.name,
              keyType: 'bearer',
              key: apiKey,
              metadata: { source: 'environment', initialized: new Date() },
            });

            this.logger.log(`Initialized API key for ${provider.name}`);
          }
        } catch (error) {
          this.logger.error(`Failed to initialize API key for ${provider.name}`, error.stack);
        }
      }
    }
  }

  /**
   * Store an API key securely
   */
  async storeApiKey(config: ApiKeyConfig): Promise<string> {
    try {
      // Generate a unique identifier for the key
      const keyId = crypto.randomUUID();
      const hashedKey = await bcrypt.hash(config.key, 12);

      // Store in database
      await this.prisma.apiKey.create({
        data: {
          id: keyId,
          provider: config.provider,
          keyType: config.keyType,
          hashedKey,
          secret: config.secret ? await this.encrypt(config.secret) : null,
          endpoint: config.endpoint,
          expiresAt: config.expiresAt,
          rateLimits: config.rateLimits ? JSON.stringify(config.rateLimits) : null,
          metadata: config.metadata ? JSON.stringify(config.metadata) : null,
        },
      });

      // Update cache
      this.keyCache.set(config.provider, {
        ...config,
        hashedKey,
        lastAccess: new Date(),
      });

      this.logger.log(`API key stored for provider: ${config.provider}`);
      return keyId;

    } catch (error) {
      this.logger.error(`Failed to store API key for ${config.provider}`, error.stack);
      throw new BadRequestException(`Failed to store API key: ${error.message}`);
    }
  }

  /**
   * Get API key configuration for a provider
   */
  async getApiKey(provider: string): Promise<ApiKeyConfig | null> {
    try {
      // Check cache first
      const cached = this.keyCache.get(provider);
      if (cached && (!cached.expiresAt || cached.expiresAt > new Date())) {
        cached.lastAccess = new Date();
        return {
          provider: cached.provider,
          keyType: cached.keyType,
          key: cached.key,
          secret: cached.secret,
          endpoint: cached.endpoint,
          expiresAt: cached.expiresAt,
          rateLimits: cached.rateLimits,
          metadata: cached.metadata,
        };
      }

      // Fetch from database
      const dbKey = await this.prisma.apiKey.findFirst({
        where: {
          provider,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!dbKey) {
        return null;
      }

      const config: ApiKeyConfig = {
        provider: dbKey.provider,
        keyType: dbKey.keyType as any,
        key: '', // Don't expose the actual key
        secret: dbKey.secret ? await this.decrypt(dbKey.secret) : undefined,
        endpoint: dbKey.endpoint || undefined,
        expiresAt: dbKey.expiresAt || undefined,
        rateLimits: dbKey.rateLimits ? JSON.parse(dbKey.rateLimits) : undefined,
        metadata: dbKey.metadata ? JSON.parse(dbKey.metadata) : undefined,
      };

      // Update cache (without actual key for security)
      this.keyCache.set(provider, {
        ...config,
        hashedKey: dbKey.hashedKey,
        lastAccess: new Date(),
      });

      return config;

    } catch (error) {
      this.logger.error(`Failed to get API key for ${provider}`, error.stack);
      return null;
    }
  }

  /**
   * Validate an API key
   */
  async validateApiKey(provider: string, key: string): Promise<ApiKeyValidation> {
    try {
      const config = await this.getApiKey(provider);
      
      if (!config) {
        return {
          valid: false,
          error: 'API key not found for provider',
        };
      }

      // Check expiration
      if (config.expiresAt && config.expiresAt < new Date()) {
        return {
          valid: false,
          error: 'API key has expired',
        };
      }

      // Get hashed key for comparison
      const cached = this.keyCache.get(provider);
      if (!cached) {
        return {
          valid: false,
          error: 'API key validation failed',
        };
      }

      // Validate key
      const isValid = await bcrypt.compare(key, cached.hashedKey);
      
      if (!isValid) {
        return {
          valid: false,
          error: 'Invalid API key',
        };
      }

      // Update usage stats
      this.updateUsageStats(provider);

      return {
        valid: true,
        provider: config.provider,
        expiresAt: config.expiresAt,
        rateLimits: config.rateLimits,
      };

    } catch (error) {
      this.logger.error(`API key validation failed for ${provider}`, error.stack);
      return {
        valid: false,
        error: 'Validation error occurred',
      };
    }
  }

  /**
   * Rotate API key for a provider
   */
  async rotateApiKey(provider: string, newKey: string): Promise<string> {
    try {
      // Get existing configuration
      const existing = await this.getApiKey(provider);
      
      if (!existing) {
        throw new BadRequestException('No existing API key found for provider');
      }

      // Mark old key as expired
      await this.prisma.apiKey.updateMany({
        where: { provider },
        data: { 
          expiresAt: new Date(),
          metadata: JSON.stringify({
            ...(existing.metadata || {}),
            rotated: new Date(),
          }),
        },
      });

      // Store new key
      const newKeyId = await this.storeApiKey({
        ...existing,
        key: newKey,
        expiresAt: undefined, // Remove expiration for new key
        metadata: {
          ...(existing.metadata || {}),
          rotatedFrom: provider,
          rotatedAt: new Date(),
        },
      });

      // Clear cache to force refresh
      this.keyCache.delete(provider);

      this.logger.log(`API key rotated for provider: ${provider}`);
      return newKeyId;

    } catch (error) {
      this.logger.error(`Failed to rotate API key for ${provider}`, error.stack);
      throw new BadRequestException(`Failed to rotate API key: ${error.message}`);
    }
  }

  /**
   * Delete API key for a provider
   */
  async deleteApiKey(provider: string): Promise<boolean> {
    try {
      const result = await this.prisma.apiKey.updateMany({
        where: { provider },
        data: { 
          expiresAt: new Date(),
          metadata: JSON.stringify({
            deleted: new Date(),
            deletedBy: 'system',
          }),
        },
      });

      // Clear from cache
      this.keyCache.delete(provider);
      this.usageStats.delete(provider);

      this.logger.log(`API key deleted for provider: ${provider}`);
      return result.count > 0;

    } catch (error) {
      this.logger.error(`Failed to delete API key for ${provider}`, error.stack);
      return false;
    }
  }

  /**
   * List all API keys (without exposing actual keys)
   */
  async listApiKeys(): Promise<Array<{
    provider: string;
    keyType: string;
    endpoint?: string;
    expiresAt?: Date;
    createdAt: Date;
    lastUsed?: Date;
    requestCount?: number;
  }>> {
    try {
      const keys = await this.prisma.apiKey.findMany({
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      return keys.map(key => {
        const usage = this.usageStats.get(key.provider);
        
        return {
          provider: key.provider,
          keyType: key.keyType,
          endpoint: key.endpoint || undefined,
          expiresAt: key.expiresAt || undefined,
          createdAt: key.createdAt,
          lastUsed: usage?.lastUsed,
          requestCount: usage?.requests,
        };
      });

    } catch (error) {
      this.logger.error('Failed to list API keys', error.stack);
      return [];
    }
  }

  /**
   * Get API key statistics
   */
  async getStats(): Promise<ApiKeyStats> {
    try {
      const keys = await this.prisma.apiKey.findMany();
      const now = new Date();

      const totalKeys = keys.length;
      const activeKeys = keys.filter(key => !key.expiresAt || key.expiresAt > now).length;
      const expiredKeys = totalKeys - activeKeys;

      const keysByProvider = keys.reduce((acc, key) => {
        acc[key.provider] = (acc[key.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const recentUsage = Array.from(this.usageStats.entries())
        .map(([provider, stats]) => ({
          provider,
          requests: stats.requests,
          lastUsed: stats.lastUsed,
        }))
        .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
        .slice(0, 10);

      return {
        totalKeys,
        activeKeys,
        expiredKeys,
        keysByProvider,
        recentUsage,
      };

    } catch (error) {
      this.logger.error('Failed to get API key stats', error.stack);
      return {
        totalKeys: 0,
        activeKeys: 0,
        expiredKeys: 0,
        keysByProvider: {},
        recentUsage: [],
      };
    }
  }

  /**
   * Health check for API keys
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    keyCount: number;
  }> {
    const issues: string[] = [];
    const stats = await this.getStats();

    // Check for expired keys
    if (stats.expiredKeys > stats.activeKeys) {
      issues.push('More expired keys than active keys');
    }

    // Check for missing critical providers
    const criticalProviders = ['remoteok', 'remotive', 'themuse'];
    for (const provider of criticalProviders) {
      if (!stats.keysByProvider[provider]) {
        issues.push(`Missing API key for critical provider: ${provider}`);
      }
    }

    // Check cache health
    if (this.keyCache.size === 0 && stats.activeKeys > 0) {
      issues.push('API key cache is empty but active keys exist');
    }

    return {
      healthy: issues.length === 0,
      issues,
      keyCount: stats.activeKeys,
    };
  }

  /**
   * Update usage statistics
   */
  private updateUsageStats(provider: string): void {
    const existing = this.usageStats.get(provider) || { requests: 0, lastUsed: new Date() };
    
    this.usageStats.set(provider, {
      requests: existing.requests + 1,
      lastUsed: new Date(),
    });
  }

  /**
   * Encrypt sensitive data
   */
  private async encrypt(text: string): Promise<string> {
    const key = this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-change-in-production';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  private async decrypt(encryptedText: string): Promise<string> {
    const key = this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-change-in-production';
    const [ivHex, encrypted] = encryptedText.split(':');
    
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}