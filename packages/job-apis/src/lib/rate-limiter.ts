import { Logger } from '@jobai/shared';

export interface RateLimiterConfig {
  requests: number; // Number of requests
  per: number; // Time period in milliseconds
  identifier: string; // Unique identifier for this rate limiter
  burst?: number; // Maximum burst requests (defaults to requests)
}

export interface RateLimitStatus {
  remaining: number;
  resetTime: number;
  limit: number;
  isLimited: boolean;
}

/**
 * Token bucket rate limiter implementation
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond
  private readonly logger: Logger;
  private readonly identifier: string;
  private readonly waitQueue: Array<{
    resolve: () => void;
    timestamp: number;
  }> = [];

  constructor(private config: RateLimiterConfig) {
    this.identifier = config.identifier;
    this.maxTokens = config.burst || config.requests;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.refillRate = config.requests / config.per;
    this.logger = new Logger(`RateLimiter:${this.identifier}`);

    this.logger.debug(`Initialized rate limiter`, {
      requests: config.requests,
      per: config.per,
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
    });

    // Start token refill process
    this.startRefillProcess();
  }

  /**
   * Acquire a token (wait if necessary)
   */
  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.tryAcquire()) {
        resolve();
        return;
      }

      // Add to wait queue
      this.waitQueue.push({
        resolve,
        timestamp: Date.now(),
      });

      this.logger.debug(`Request queued, queue length: ${this.waitQueue.length}`);
    });
  }

  /**
   * Try to acquire a token immediately
   */
  private tryAcquire(): boolean {
    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      this.logger.debug(`Token acquired, remaining: ${this.tokens}`);
      return true;
    }

    return false;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;

    if (tokensToAdd >= 1) {
      this.tokens = Math.min(this.maxTokens, this.tokens + Math.floor(tokensToAdd));
      this.lastRefill = now;

      this.logger.debug(`Tokens refilled: ${Math.floor(tokensToAdd)}, current: ${this.tokens}`);
    }
  }

  /**
   * Start the token refill process and queue processing
   */
  private startRefillProcess(): void {
    setInterval(() => {
      this.refillTokens();
      this.processWaitQueue();
    }, 100); // Check every 100ms
  }

  /**
   * Process waiting requests
   */
  private processWaitQueue(): void {
    const now = Date.now();
    const timeout = 60000; // 1 minute timeout for queued requests

    // Remove expired requests
    let expiredCount = 0;
    while (this.waitQueue.length > 0) {
      const request = this.waitQueue[0];
      if (now - request.timestamp > timeout) {
        this.waitQueue.shift();
        expiredCount++;
        // Resolve with timeout (request should handle this)
        request.resolve();
      } else {
        break;
      }
    }

    if (expiredCount > 0) {
      this.logger.warn(`${expiredCount} requests expired from queue`);
    }

    // Process requests that can be fulfilled
    while (this.waitQueue.length > 0 && this.tokens >= 1) {
      const request = this.waitQueue.shift()!;
      this.tokens -= 1;
      request.resolve();
      
      this.logger.debug(`Request processed from queue, remaining tokens: ${this.tokens}, queue: ${this.waitQueue.length}`);
    }
  }

  /**
   * Get current rate limit status
   */
  getStatus(): RateLimitStatus {
    this.refillTokens();

    const resetTime = this.lastRefill + (this.maxTokens - this.tokens) / this.refillRate;

    return {
      remaining: Math.floor(this.tokens),
      resetTime: Math.ceil(resetTime),
      limit: this.maxTokens,
      isLimited: this.tokens < 1 || this.waitQueue.length > 0,
    };
  }

  /**
   * Check if a request can be made immediately
   */
  canMakeRequest(): boolean {
    this.refillTokens();
    return this.tokens >= 1;
  }

  /**
   * Get time until next token is available (in ms)
   */
  getTimeUntilReset(): number {
    if (this.tokens >= 1) return 0;

    const timeForOneToken = 1 / this.refillRate;
    return Math.ceil(timeForOneToken);
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.waitQueue.length;
  }

  /**
   * Reset rate limiter (for testing)
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    
    // Clear queue
    while (this.waitQueue.length > 0) {
      const request = this.waitQueue.shift()!;
      request.resolve();
    }

    this.logger.debug('Rate limiter reset');
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(newConfig: Partial<RateLimiterConfig>): void {
    if (newConfig.requests !== undefined && newConfig.per !== undefined) {
      this.config.requests = newConfig.requests;
      this.config.per = newConfig.per;
      this.refillRate = newConfig.requests / newConfig.per;
    }

    if (newConfig.burst !== undefined) {
      const oldMaxTokens = this.maxTokens;
      (this as any).maxTokens = newConfig.burst;
      
      // Adjust current tokens proportionally
      if (oldMaxTokens > 0) {
        this.tokens = (this.tokens / oldMaxTokens) * this.maxTokens;
      }
    }

    this.logger.debug('Rate limiter configuration updated', {
      requests: this.config.requests,
      per: this.config.per,
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
    });
  }
}

/**
 * Global rate limiter registry for sharing limiters across instances
 */
export class RateLimiterRegistry {
  private static instance: RateLimiterRegistry;
  private limiters = new Map<string, RateLimiter>();
  private logger = new Logger('RateLimiterRegistry');

  static getInstance(): RateLimiterRegistry {
    if (!RateLimiterRegistry.instance) {
      RateLimiterRegistry.instance = new RateLimiterRegistry();
    }
    return RateLimiterRegistry.instance;
  }

  /**
   * Get or create a rate limiter
   */
  getLimiter(key: string, config: RateLimiterConfig): RateLimiter {
    if (this.limiters.has(key)) {
      const limiter = this.limiters.get(key)!;
      
      // Update config if different
      limiter.updateConfig(config);
      return limiter;
    }

    const limiter = new RateLimiter({ ...config, identifier: key });
    this.limiters.set(key, limiter);
    
    this.logger.debug(`Created new rate limiter: ${key}`);
    return limiter;
  }

  /**
   * Remove a rate limiter
   */
  removeLimiter(key: string): void {
    if (this.limiters.has(key)) {
      this.limiters.delete(key);
      this.logger.debug(`Removed rate limiter: ${key}`);
    }
  }

  /**
   * Get all rate limiter statuses
   */
  getAllStatuses(): Record<string, RateLimitStatus> {
    const statuses: Record<string, RateLimitStatus> = {};
    
    for (const [key, limiter] of this.limiters) {
      statuses[key] = limiter.getStatus();
    }

    return statuses;
  }

  /**
   * Clear all rate limiters
   */
  clear(): void {
    this.limiters.clear();
    this.logger.debug('Cleared all rate limiters');
  }
}