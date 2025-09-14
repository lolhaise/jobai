// Rate Limiter Service - Advanced rate limiting and DDoS protection
// Implements multiple strategies: token bucket, sliding window, and adaptive limiting

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';

// Rate limit configuration
interface RateLimitConfig {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
  blockDuration: number; // Block duration for violations
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

// DDoS detection configuration
interface DDoSConfig {
  burstThreshold: number;    // Requests per second threshold
  sustainedThreshold: number; // Sustained requests threshold
  blockDuration: number;      // Block duration in seconds
  adaptiveMode: boolean;      // Enable adaptive protection
}

@Injectable()
export class RateLimiterService {
  // Different rate limit tiers
  private readonly configs: Map<string, RateLimitConfig> = new Map([
    ['strict', {
      windowMs: 1000,
      maxRequests: 5,
      blockDuration: 3600000, // 1 hour
    }],
    ['normal', {
      windowMs: 60000,
      maxRequests: 100,
      blockDuration: 600000, // 10 minutes
    }],
    ['relaxed', {
      windowMs: 60000,
      maxRequests: 500,
      blockDuration: 60000, // 1 minute
    }],
    ['auth', {
      windowMs: 900000, // 15 minutes
      maxRequests: 5,
      blockDuration: 1800000, // 30 minutes
      skipSuccessfulRequests: true,
    }],
  ]);

  // DDoS protection configuration
  private readonly ddosConfig: DDoSConfig = {
    burstThreshold: 50,
    sustainedThreshold: 1000,
    blockDuration: 3600,
    adaptiveMode: true,
  };

  // Blocked IPs cache
  private blockedIPs: Set<string> = new Set();
  
  // Request patterns for anomaly detection
  private requestPatterns: Map<string, number[]> = new Map();

  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.initializeCleanup();
  }

  // Initialize cleanup tasks
  private initializeCleanup(): void {
    // Clean up expired blocks every minute
    setInterval(() => {
      this.cleanupExpiredBlocks();
    }, 60000);

    // Reset patterns every hour
    setInterval(() => {
      this.requestPatterns.clear();
    }, 3600000);
  }

  // Check rate limit
  async checkRateLimit(
    identifier: string,
    tier: string = 'normal',
    custom?: Partial<RateLimitConfig>
  ): Promise<void> {
    // Check if IP is blocked
    if (await this.isBlocked(identifier)) {
      throw new HttpException(
        {
          message: 'Too many requests. You have been temporarily blocked.',
          retryAfter: await this.getBlockExpiry(identifier),
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Get configuration
    const config = { ...this.configs.get(tier), ...custom };
    if (!config) {
      throw new Error(`Invalid rate limit tier: ${tier}`);
    }

    // Check DDoS patterns
    if (this.ddosConfig.adaptiveMode) {
      await this.checkDDoSPattern(identifier);
    }

    // Implement token bucket algorithm
    const result = await this.tokenBucket(identifier, config);
    
    if (!result.allowed) {
      // Block the identifier
      await this.blockIdentifier(identifier, config.blockDuration);
      
      throw new HttpException(
        {
          message: 'Rate limit exceeded',
          limit: config.maxRequests,
          windowMs: config.windowMs,
          retryAfter: new Date(Date.now() + config.windowMs),
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Track request pattern
    this.trackRequestPattern(identifier);
  }

  // Token bucket algorithm implementation
  private async tokenBucket(
    identifier: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number }> {
    const key = `rate_limit:token:${identifier}`;
    const now = Date.now();
    const refillRate = config.maxRequests / config.windowMs;

    // Lua script for atomic token bucket
    const script = `
      local key = KEYS[1]
      local max_tokens = tonumber(ARGV[1])
      local refill_rate = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local window = tonumber(ARGV[4])
      
      local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
      local tokens = tonumber(bucket[1]) or max_tokens
      local last_refill = tonumber(bucket[2]) or now
      
      -- Calculate tokens to add
      local time_passed = now - last_refill
      local tokens_to_add = time_passed * refill_rate
      tokens = math.min(max_tokens, tokens + tokens_to_add)
      
      -- Check if request is allowed
      if tokens >= 1 then
        tokens = tokens - 1
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, window / 1000)
        return {1, math.floor(tokens)}
      else
        return {0, 0}
      end
    `;

    const result = await this.redis.eval(
      script,
      1,
      key,
      config.maxRequests,
      refillRate,
      now,
      config.windowMs
    ) as [number, number];

    return {
      allowed: result[0] === 1,
      remaining: result[1],
    };
  }

  // Sliding window log algorithm (alternative)
  async slidingWindowLog(
    identifier: string,
    windowMs: number,
    maxRequests: number
  ): Promise<boolean> {
    const key = `rate_limit:sliding:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Remove old entries and count current window
    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    pipeline.zadd(key, now, `${now}-${crypto.randomBytes(4).toString('hex')}`);
    pipeline.zcount(key, windowStart, now);
    pipeline.expire(key, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    const count = results?.[2]?.[1] as number;
    
    return count <= maxRequests;
  }

  // Check for DDoS patterns
  private async checkDDoSPattern(identifier: string): Promise<void> {
    const key = `ddos:pattern:${identifier}`;
    const now = Date.now();
    
    // Track request timestamps
    await this.redis.zadd(key, now, now);
    await this.redis.expire(key, 60);
    
    // Check burst (requests in last second)
    const oneSecondAgo = now - 1000;
    const burstCount = await this.redis.zcount(key, oneSecondAgo, now);
    
    if (burstCount > this.ddosConfig.burstThreshold) {
      console.warn(`DDoS burst detected from ${identifier}: ${burstCount} requests/sec`);
      await this.blockIdentifier(identifier, this.ddosConfig.blockDuration * 1000);
      throw new HttpException(
        'Suspicious activity detected. Access blocked.',
        HttpStatus.FORBIDDEN
      );
    }
    
    // Check sustained load (requests in last minute)
    const oneMinuteAgo = now - 60000;
    const sustainedCount = await this.redis.zcount(key, oneMinuteAgo, now);
    
    if (sustainedCount > this.ddosConfig.sustainedThreshold) {
      console.warn(`DDoS sustained attack from ${identifier}: ${sustainedCount} requests/min`);
      await this.blockIdentifier(identifier, this.ddosConfig.blockDuration * 1000);
      throw new HttpException(
        'Excessive requests detected. Access blocked.',
        HttpStatus.FORBIDDEN
      );
    }
  }

  // Track request patterns for anomaly detection
  private trackRequestPattern(identifier: string): void {
    const patterns = this.requestPatterns.get(identifier) || [];
    patterns.push(Date.now());
    
    // Keep only last 100 timestamps
    if (patterns.length > 100) {
      patterns.shift();
    }
    
    this.requestPatterns.set(identifier, patterns);
    
    // Detect anomalies
    if (patterns.length >= 10) {
      this.detectAnomalies(identifier, patterns);
    }
  }

  // Detect anomalous request patterns
  private detectAnomalies(identifier: string, timestamps: number[]): void {
    // Calculate intervals between requests
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    
    // Check for bot-like behavior (too regular)
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - avgInterval, 2);
    }, 0) / intervals.length;
    
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avgInterval;
    
    // If requests are too regular (low variation), might be a bot
    if (coefficientOfVariation < 0.1 && intervals.length > 20) {
      console.warn(`Bot-like behavior detected from ${identifier}`);
      // Increase rate limiting for this identifier
      this.applyStricterLimits(identifier);
    }
  }

  // Apply stricter limits for suspicious behavior
  private async applyStricterLimits(identifier: string): Promise<void> {
    const key = `rate_limit:strict:${identifier}`;
    await this.redis.set(key, '1', 'EX', 3600); // Apply for 1 hour
  }

  // Block an identifier
  async blockIdentifier(identifier: string, duration: number): Promise<void> {
    const key = `blocked:${identifier}`;
    await this.redis.set(key, Date.now() + duration, 'PX', duration);
    this.blockedIPs.add(identifier);
    
    // Log the block
    console.warn(`Blocked ${identifier} for ${duration}ms`);
  }

  // Check if identifier is blocked
  async isBlocked(identifier: string): Promise<boolean> {
    // Quick check in memory
    if (this.blockedIPs.has(identifier)) {
      // Verify in Redis
      const key = `blocked:${identifier}`;
      const expiry = await this.redis.get(key);
      
      if (expiry && parseInt(expiry) > Date.now()) {
        return true;
      } else {
        this.blockedIPs.delete(identifier);
        return false;
      }
    }
    
    return false;
  }

  // Get block expiry time
  async getBlockExpiry(identifier: string): Promise<Date | null> {
    const key = `blocked:${identifier}`;
    const expiry = await this.redis.get(key);
    
    if (expiry) {
      return new Date(parseInt(expiry));
    }
    
    return null;
  }

  // Clean up expired blocks
  private async cleanupExpiredBlocks(): Promise<void> {
    const now = Date.now();
    
    for (const ip of this.blockedIPs) {
      const key = `blocked:${ip}`;
      const expiry = await this.redis.get(key);
      
      if (!expiry || parseInt(expiry) <= now) {
        this.blockedIPs.delete(ip);
        await this.redis.del(key);
      }
    }
  }

  // Get current limits for identifier
  async getCurrentLimits(identifier: string): Promise<{
    remaining: number;
    reset: Date;
    limit: number;
  }> {
    const config = this.configs.get('normal')!;
    const key = `rate_limit:token:${identifier}`;
    
    const bucket = await this.redis.hmget(key, 'tokens', 'last_refill');
    const tokens = parseInt(bucket[0] || String(config.maxRequests));
    
    return {
      remaining: Math.max(0, tokens),
      reset: new Date(Date.now() + config.windowMs),
      limit: config.maxRequests,
    };
  }

  // Reset limits for identifier (admin function)
  async resetLimits(identifier: string): Promise<void> {
    const keys = [
      `rate_limit:token:${identifier}`,
      `rate_limit:sliding:${identifier}`,
      `ddos:pattern:${identifier}`,
      `blocked:${identifier}`,
      `rate_limit:strict:${identifier}`,
    ];
    
    await this.redis.del(...keys);
    this.blockedIPs.delete(identifier);
    this.requestPatterns.delete(identifier);
  }

  // Get statistics
  async getStatistics(): Promise<{
    blockedIPs: number;
    activePatterns: number;
    topOffenders: string[];
  }> {
    // Get top offenders
    const topOffenders: string[] = [];
    for (const [identifier, patterns] of this.requestPatterns.entries()) {
      if (patterns.length > 50) {
        topOffenders.push(identifier);
      }
    }
    
    return {
      blockedIPs: this.blockedIPs.size,
      activePatterns: this.requestPatterns.size,
      topOffenders: topOffenders.slice(0, 10),
    };
  }
}