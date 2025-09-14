import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Redis from 'ioredis';

// Cache configuration interface
interface CacheConfig {
  ttl: number; // Time to live in seconds
  prefix: string; // Key prefix for namespacing
  compress?: boolean; // Whether to compress data
}

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  memoryUsage?: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis.Redis;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
  };

  // Cache TTL configurations for different data types (in seconds)
  private readonly TTL_CONFIG = {
    JOB_SEARCH: 3600, // 1 hour
    JOB_DETAILS: 86400, // 24 hours
    USER_PROFILE: 300, // 5 minutes
    RESUME_DATA: 600, // 10 minutes
    APPLICATION_LIST: 60, // 1 minute
    DASHBOARD_STATS: 300, // 5 minutes
    API_RESPONSE: 300, // 5 minutes default
    SAVED_SEARCH: 1800, // 30 minutes
    JOB_SUGGESTIONS: 3600, // 1 hour
    COMPANY_INFO: 604800, // 1 week
  };

  constructor(private configService: ConfigService) {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private initializeRedis() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    
    this.redis = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
      maxRetriesPerRequest: 3,
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  /**
   * Get cached data with automatic deserialization
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      
      if (data) {
        this.stats.hits++;
        this.updateHitRate();
        this.logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(data);
      }
      
      this.stats.misses++;
      this.updateHitRate();
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with automatic serialization
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.TTL_CONFIG.API_RESPONSE;
      
      await this.redis.setex(key, expiry, serialized);
      this.stats.sets++;
      
      this.logger.debug(`Cache set for key: ${key} with TTL: ${expiry}s`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.stats.deletes++;
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.stats.deletes += keys.length;
        this.logger.debug(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Cache job search results
   */
  async cacheJobSearch(params: any, results: any): Promise<void> {
    const key = this.generateJobSearchKey(params);
    await this.set(key, results, this.TTL_CONFIG.JOB_SEARCH);
  }

  /**
   * Get cached job search results
   */
  async getCachedJobSearch(params: any): Promise<any> {
    const key = this.generateJobSearchKey(params);
    return this.get(key);
  }

  /**
   * Cache user dashboard data
   */
  async cacheDashboard(userId: string, data: any): Promise<void> {
    const key = `dashboard:${userId}`;
    await this.set(key, data, this.TTL_CONFIG.DASHBOARD_STATS);
  }

  /**
   * Get cached dashboard data
   */
  async getCachedDashboard(userId: string): Promise<any> {
    const key = `dashboard:${userId}`;
    return this.get(key);
  }

  /**
   * Cache resume data
   */
  async cacheResume(resumeId: string, data: any): Promise<void> {
    const key = `resume:${resumeId}`;
    await this.set(key, data, this.TTL_CONFIG.RESUME_DATA);
  }

  /**
   * Get cached resume data
   */
  async getCachedResume(resumeId: string): Promise<any> {
    const key = `resume:${resumeId}`;
    return this.get(key);
  }

  /**
   * Invalidate user-specific caches
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `dashboard:${userId}`,
      `applications:${userId}:*`,
      `profile:${userId}`,
      `resumes:${userId}:*`,
    ];

    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }
    
    this.logger.log(`Invalidated cache for user: ${userId}`);
  }

  /**
   * Cache with automatic refresh
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, execute factory function
    const result = await factory();
    
    // Cache the result
    await this.set(key, result, ttl);
    
    return result;
  }

  /**
   * Implement cache-aside pattern with stale-while-revalidate
   */
  async getWithStaleRevalidate<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number,
    staleTtl: number
  ): Promise<T> {
    const data = await this.redis.get(key);
    const staleKey = `${key}:stale`;
    
    if (data) {
      // Return fresh data
      return JSON.parse(data);
    }
    
    // Check for stale data
    const staleData = await this.redis.get(staleKey);
    
    if (staleData) {
      // Return stale data and refresh in background
      this.refreshInBackground(key, staleKey, factory, ttl, staleTtl);
      return JSON.parse(staleData);
    }
    
    // No cached data, fetch fresh
    const fresh = await factory();
    await this.set(key, fresh, ttl);
    await this.set(staleKey, fresh, staleTtl);
    
    return fresh;
  }

  /**
   * Refresh cache in background
   */
  private async refreshInBackground<T>(
    key: string,
    staleKey: string,
    factory: () => Promise<T>,
    ttl: number,
    staleTtl: number
  ): Promise<void> {
    try {
      const fresh = await factory();
      await this.set(key, fresh, ttl);
      await this.set(staleKey, fresh, staleTtl);
      this.logger.debug(`Background refresh completed for key: ${key}`);
    } catch (error) {
      this.logger.error(`Background refresh failed for key ${key}:`, error);
    }
  }

  /**
   * Generate cache key for job searches
   */
  private generateJobSearchKey(params: any): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== null) {
          acc[key] = params[key];
        }
        return acc;
      }, {});
    
    return `job-search:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate() {
    const total = this.stats.hits + this.stats.misses;
    if (total > 0) {
      this.stats.hitRate = (this.stats.hits / total) * 100;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const info = await this.redis.info('memory');
      const memoryUsage = parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0');
      
      return {
        ...this.stats,
        memoryUsage,
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return this.stats;
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.log('All cache cleared');
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(): Promise<void> {
    this.logger.log('Cache warm-up started');
    
    // Implement cache warming logic here
    // This could include pre-loading popular job searches,
    // company information, frequently accessed resumes, etc.
    
    this.logger.log('Cache warm-up completed');
  }
}