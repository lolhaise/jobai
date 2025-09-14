import { Logger } from '@jobai/shared';

export interface CacheConfig {
  enabled: boolean;
  defaultTTL: number; // seconds
  prefix: string;
  maxMemorySize?: number; // bytes, for in-memory cache
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  size: number;
}

/**
 * Cache manager with Redis support and in-memory fallback
 */
export class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
    size: 0,
  };
  private redisClient: any = null;
  private cleanupInterval: NodeJS.Timeout;
  private readonly logger: Logger;
  private readonly config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.logger = new Logger(`Cache:${config.prefix}`);

    // Initialize Redis client if configured
    if (config.redis) {
      this.initializeRedis();
    }

    // Start cleanup process for in-memory cache
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Clean up every minute

    this.logger.debug('Cache manager initialized', {
      enabled: config.enabled,
      prefix: config.prefix,
      defaultTTL: config.defaultTTL,
      redis: !!config.redis,
    });
  }

  /**
   * Initialize Redis client
   */
  private async initializeRedis(): Promise<void> {
    try {
      // Dynamic import to avoid Redis dependency if not used
      const Redis = await import('ioredis').then(m => m.default);
      
      this.redisClient = new Redis({
        host: this.config.redis!.host,
        port: this.config.redis!.port,
        password: this.config.redis!.password,
        db: this.config.redis!.db || 0,
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
      });

      this.redisClient.on('connect', () => {
        this.logger.info('Connected to Redis');
      });

      this.redisClient.on('error', (error: Error) => {
        this.logger.error('Redis error', error);
        // Fall back to memory cache on Redis errors
        this.redisClient = null;
      });

      this.redisClient.on('close', () => {
        this.logger.warn('Redis connection closed, falling back to memory cache');
        this.redisClient = null;
      });

    } catch (error) {
      this.logger.error('Failed to initialize Redis', error);
      this.redisClient = null;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.config.enabled) return null;

    const fullKey = this.getFullKey(key);

    try {
      // Try Redis first
      if (this.redisClient) {
        const value = await this.redisClient.get(fullKey);
        if (value) {
          this.stats.hits++;
          this.updateHitRate();
          
          const parsed = JSON.parse(value);
          this.logger.debug(`Redis cache hit for ${key}`);
          return parsed;
        }
      }

      // Fall back to memory cache
      const entry = this.memoryCache.get(fullKey);
      if (entry && !this.isExpired(entry)) {
        this.stats.hits++;
        this.updateHitRate();
        this.logger.debug(`Memory cache hit for ${key}`);
        return entry.data;
      }

      // Cache miss
      this.stats.misses++;
      this.updateHitRate();
      this.logger.debug(`Cache miss for ${key}`);
      return null;

    } catch (error) {
      this.logger.error(`Cache get error for ${key}`, error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.config.enabled) return;

    const fullKey = this.getFullKey(key);
    const cacheTTL = ttl || this.config.defaultTTL;

    try {
      const serialized = JSON.stringify(value);

      // Set in Redis if available
      if (this.redisClient) {
        await this.redisClient.setex(fullKey, cacheTTL, serialized);
        this.logger.debug(`Set in Redis cache: ${key} (TTL: ${cacheTTL}s)`);
      } else {
        // Set in memory cache
        const entry: CacheEntry<T> = {
          data: value,
          timestamp: Date.now(),
          ttl: cacheTTL * 1000, // Convert to milliseconds
        };

        this.memoryCache.set(fullKey, entry);
        this.logger.debug(`Set in memory cache: ${key} (TTL: ${cacheTTL}s)`);

        // Check memory limit
        this.enforceMemoryLimit();
      }

      this.stats.sets++;
      this.updateSize();

    } catch (error) {
      this.logger.error(`Cache set error for ${key}`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.config.enabled) return;

    const fullKey = this.getFullKey(key);

    try {
      // Delete from Redis
      if (this.redisClient) {
        await this.redisClient.del(fullKey);
        this.logger.debug(`Deleted from Redis cache: ${key}`);
      }

      // Delete from memory cache
      this.memoryCache.delete(fullKey);
      this.logger.debug(`Deleted from memory cache: ${key}`);

      this.stats.deletes++;
      this.updateSize();

    } catch (error) {
      this.logger.error(`Cache delete error for ${key}`, error);
    }
  }

  /**
   * Clear all cache entries with this prefix
   */
  async clear(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      // Clear Redis entries with prefix
      if (this.redisClient) {
        const keys = await this.redisClient.keys(`${this.config.prefix}:*`);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
        this.logger.debug(`Cleared ${keys.length} Redis cache entries`);
      }

      // Clear memory cache entries with prefix
      const memoryKeys = Array.from(this.memoryCache.keys())
        .filter(key => key.startsWith(`${this.config.prefix}:`));
      
      for (const key of memoryKeys) {
        this.memoryCache.delete(key);
      }

      this.logger.debug(`Cleared ${memoryKeys.length} memory cache entries`);
      this.updateSize();

    } catch (error) {
      this.logger.error('Cache clear error', error);
    }
  }

  /**
   * Check if cache is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateSize();
    return { ...this.stats };
  }

  /**
   * Get cache entry with metadata
   */
  async getWithMetadata<T>(key: string): Promise<{
    value: T | null;
    cached: boolean;
    timestamp?: number;
    ttl?: number;
  }> {
    if (!this.config.enabled) {
      return { value: null, cached: false };
    }

    const fullKey = this.getFullKey(key);

    // Check Redis first
    if (this.redisClient) {
      try {
        const [value, ttl] = await Promise.all([
          this.redisClient.get(fullKey),
          this.redisClient.ttl(fullKey),
        ]);

        if (value) {
          this.stats.hits++;
          this.updateHitRate();
          return {
            value: JSON.parse(value),
            cached: true,
            timestamp: Date.now() - (this.config.defaultTTL - ttl) * 1000,
            ttl: ttl > 0 ? ttl : undefined,
          };
        }
      } catch (error) {
        this.logger.error(`Redis getWithMetadata error for ${key}`, error);
      }
    }

    // Check memory cache
    const entry = this.memoryCache.get(fullKey);
    if (entry && !this.isExpired(entry)) {
      this.stats.hits++;
      this.updateHitRate();
      return {
        value: entry.data,
        cached: true,
        timestamp: entry.timestamp,
        ttl: Math.max(0, Math.floor((entry.timestamp + entry.ttl - Date.now()) / 1000)),
      };
    }

    this.stats.misses++;
    this.updateHitRate();
    return { value: null, cached: false };
  }

  /**
   * Increment a counter in cache
   */
  async increment(key: string, by: number = 1, ttl?: number): Promise<number> {
    if (!this.config.enabled) return 0;

    const fullKey = this.getFullKey(key);

    try {
      // Use Redis INCR if available
      if (this.redisClient) {
        const value = await this.redisClient.incrby(fullKey, by);
        if (ttl) {
          await this.redisClient.expire(fullKey, ttl);
        }
        return value;
      }

      // Use memory cache
      const entry = this.memoryCache.get(fullKey);
      const currentValue = (entry && !this.isExpired(entry)) ? (entry.data as number) : 0;
      const newValue = currentValue + by;

      await this.set(key, newValue, ttl);
      return newValue;

    } catch (error) {
      this.logger.error(`Cache increment error for ${key}`, error);
      return 0;
    }
  }

  /**
   * Get full cache key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.config.prefix}:${key}`;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.timestamp + entry.ttl;
  }

  /**
   * Clean up expired entries from memory cache
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
      this.updateSize();
    }
  }

  /**
   * Enforce memory limit for in-memory cache
   */
  private enforceMemoryLimit(): void {
    if (!this.config.maxMemorySize) return;

    const currentSize = this.estimateMemorySize();
    if (currentSize > this.config.maxMemorySize) {
      // Remove oldest entries
      const entries = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);

      let removedSize = 0;
      for (const [key, entry] of entries) {
        this.memoryCache.delete(key);
        removedSize += this.estimateEntrySize(entry);
        
        if (currentSize - removedSize <= this.config.maxMemorySize * 0.8) {
          break;
        }
      }

      this.logger.debug(`Evicted cache entries to free ${removedSize} bytes`);
    }
  }

  /**
   * Estimate memory usage of cache
   */
  private estimateMemorySize(): number {
    let size = 0;
    for (const entry of this.memoryCache.values()) {
      size += this.estimateEntrySize(entry);
    }
    return size;
  }

  /**
   * Estimate size of a cache entry
   */
  private estimateEntrySize(entry: CacheEntry<any>): number {
    return JSON.stringify(entry).length * 2; // Rough estimate (UTF-16)
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Update cache size
   */
  private updateSize(): void {
    this.stats.size = this.memoryCache.size;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.redisClient) {
      this.redisClient.disconnect();
    }

    this.memoryCache.clear();
    this.logger.debug('Cache manager destroyed');
  }
}