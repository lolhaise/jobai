import { Logger } from '@jobai/shared';

export interface ErrorHandlerConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffFactor: number;
  retryableStatuses?: number[];
  circuitBreaker?: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeout: number; // milliseconds
    monitoringPeriod: number; // milliseconds
  };
}

export interface RetryableError extends Error {
  status?: number;
  retryAfter?: number;
  isRetryable?: boolean;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastFailure?: number;
  nextRetry?: number;
  requests: number;
  successes: number;
}

export interface ExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
  circuitBreakerTriggered?: boolean;
}

/**
 * Error handler with exponential backoff and circuit breaker pattern
 */
export class ErrorHandler {
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private readonly logger: Logger;
  private readonly config: ErrorHandlerConfig;
  private readonly defaultRetryableStatuses = [429, 502, 503, 504, 408, 409, 425];

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      retryableStatuses: this.defaultRetryableStatuses,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        resetTimeout: 60000,
        monitoringPeriod: 60000,
      },
      ...config,
    };

    this.logger = new Logger('ErrorHandler');

    this.logger.debug('Error handler initialized', this.config);
  }

  /**
   * Execute a function with retry logic and circuit breaker
   */
  async execute<T>(
    fn: () => Promise<T>,
    options: {
      identifier?: string;
      maxRetries?: number;
      customRetryable?: (error: any) => boolean;
    } = {}
  ): Promise<T> {
    const identifier = options.identifier || 'default';
    const maxRetries = options.maxRetries ?? this.config.maxRetries;
    
    // Check circuit breaker
    if (this.config.circuitBreaker?.enabled) {
      const cbState = this.getCircuitBreakerState(identifier);
      
      if (cbState.state === 'OPEN') {
        const now = Date.now();
        if (!cbState.nextRetry || now < cbState.nextRetry) {
          const error = new Error(`Circuit breaker is OPEN for ${identifier}`);
          this.logger.warn(`Circuit breaker blocked request`, { identifier });
          throw error;
        } else {
          // Transition to HALF_OPEN
          this.setCircuitBreakerState(identifier, {
            ...cbState,
            state: 'HALF_OPEN',
          });
          this.logger.info(`Circuit breaker transitioned to HALF_OPEN`, { identifier });
        }
      }
    }

    let lastError: any;
    let totalDelay = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add delay before retry (not on first attempt)
        if (attempt > 0) {
          const delay = this.calculateDelay(attempt - 1, lastError);
          totalDelay += delay;
          
          this.logger.debug(`Retrying in ${delay}ms`, {
            attempt,
            maxRetries,
            identifier,
            error: lastError.message,
          });

          await this.sleep(delay);
        }

        // Record request attempt
        this.recordRequest(identifier);

        // Execute the function
        const startTime = Date.now();
        const result = await fn();
        const duration = Date.now() - startTime;

        // Record success
        this.recordSuccess(identifier, duration);

        this.logger.debug(`Request succeeded`, {
          attempt: attempt + 1,
          duration,
          identifier,
        });

        return result;

      } catch (error) {
        lastError = error;
        const isRetryable = this.isRetryableError(error, options.customRetryable);

        this.logger.warn(`Request failed`, {
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          identifier,
          error: error.message,
          status: error.status || error.response?.status,
          isRetryable,
        });

        // Record failure
        this.recordFailure(identifier, error);

        // Don't retry if not retryable or max retries reached
        if (!isRetryable || attempt >= maxRetries) {
          break;
        }
      }
    }

    // All retries exhausted
    this.logger.error(`All retries exhausted for ${identifier}`, {
      attempts: maxRetries + 1,
      totalDelay,
      error: lastError.message,
    });

    throw lastError;
  }

  /**
   * Calculate delay for exponential backoff
   */
  private calculateDelay(attempt: number, error?: any): number {
    // Check for Retry-After header
    if (error?.response?.headers?.['retry-after']) {
      const retryAfter = parseInt(error.response.headers['retry-after']);
      if (!isNaN(retryAfter)) {
        return Math.min(retryAfter * 1000, this.config.maxDelay);
      }
    }

    // Exponential backoff with jitter
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffFactor, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    const delay = exponentialDelay + jitter;

    return Math.min(delay, this.config.maxDelay);
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any, customRetryable?: (error: any) => boolean): boolean {
    // Custom retry logic
    if (customRetryable) {
      return customRetryable(error);
    }

    // Explicit retryable flag
    if (error.isRetryable !== undefined) {
      return error.isRetryable;
    }

    // Network errors
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED') {
      return true;
    }

    // HTTP status codes
    const status = error.status || error.response?.status;
    if (status && this.config.retryableStatuses?.includes(status)) {
      return true;
    }

    // Specific error messages
    if (error.message?.includes('timeout') ||
        error.message?.includes('network') ||
        error.message?.includes('connection')) {
      return true;
    }

    return false;
  }

  /**
   * Get circuit breaker state
   */
  private getCircuitBreakerState(identifier: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(identifier)) {
      this.circuitBreakers.set(identifier, {
        state: 'CLOSED',
        failures: 0,
        requests: 0,
        successes: 0,
      });
    }

    return this.circuitBreakers.get(identifier)!;
  }

  /**
   * Set circuit breaker state
   */
  private setCircuitBreakerState(identifier: string, state: CircuitBreakerState): void {
    this.circuitBreakers.set(identifier, state);
  }

  /**
   * Record a request attempt
   */
  private recordRequest(identifier: string): void {
    if (!this.config.circuitBreaker?.enabled) return;

    const state = this.getCircuitBreakerState(identifier);
    state.requests++;

    // Reset counters if monitoring period has passed
    if (state.lastFailure && 
        Date.now() - state.lastFailure > this.config.circuitBreaker!.monitoringPeriod) {
      state.failures = 0;
      state.requests = 0;
      state.successes = 0;
    }

    this.setCircuitBreakerState(identifier, state);
  }

  /**
   * Record a successful request
   */
  private recordSuccess(identifier: string, duration: number): void {
    if (!this.config.circuitBreaker?.enabled) return;

    const state = this.getCircuitBreakerState(identifier);
    state.successes++;

    // If in HALF_OPEN state and success, transition to CLOSED
    if (state.state === 'HALF_OPEN') {
      this.setCircuitBreakerState(identifier, {
        ...state,
        state: 'CLOSED',
        failures: 0,
        nextRetry: undefined,
      });

      this.logger.info(`Circuit breaker transitioned to CLOSED`, { identifier });
    }
  }

  /**
   * Record a failed request
   */
  private recordFailure(identifier: string, error: any): void {
    if (!this.config.circuitBreaker?.enabled) return;

    const state = this.getCircuitBreakerState(identifier);
    const now = Date.now();
    
    state.failures++;
    state.lastFailure = now;

    // Check if should transition to OPEN
    if (state.state !== 'OPEN' && 
        state.failures >= this.config.circuitBreaker!.failureThreshold) {
      
      const nextRetry = now + this.config.circuitBreaker!.resetTimeout;
      
      this.setCircuitBreakerState(identifier, {
        ...state,
        state: 'OPEN',
        nextRetry,
      });

      this.logger.warn(`Circuit breaker transitioned to OPEN`, {
        identifier,
        failures: state.failures,
        threshold: this.config.circuitBreaker!.failureThreshold,
        nextRetry: new Date(nextRetry).toISOString(),
      });
    }
  }

  /**
   * Get circuit breaker status for an identifier
   */
  getCircuitBreakerStatus(identifier: string = 'default'): CircuitBreakerState {
    return { ...this.getCircuitBreakerState(identifier) };
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllCircuitBreakerStatuses(): Record<string, CircuitBreakerState> {
    const statuses: Record<string, CircuitBreakerState> = {};
    
    for (const [identifier, state] of this.circuitBreakers) {
      statuses[identifier] = { ...state };
    }

    return statuses;
  }

  /**
   * Reset circuit breaker for an identifier
   */
  resetCircuitBreaker(identifier: string): void {
    this.setCircuitBreakerState(identifier, {
      state: 'CLOSED',
      failures: 0,
      requests: 0,
      successes: 0,
    });

    this.logger.info(`Circuit breaker reset`, { identifier });
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    for (const identifier of this.circuitBreakers.keys()) {
      this.resetCircuitBreaker(identifier);
    }

    this.logger.info('All circuit breakers reset');
  }

  /**
   * Create a specific error handler instance
   */
  createInstance(identifier: string, config?: Partial<ErrorHandlerConfig>): ErrorHandler {
    const mergedConfig = { ...this.config, ...config };
    const instance = new ErrorHandler(mergedConfig);
    
    // Copy circuit breaker state
    if (this.circuitBreakers.has(identifier)) {
      instance.circuitBreakers.set(identifier, { ...this.circuitBreakers.get(identifier)! });
    }

    return instance;
  }

  /**
   * Wrap a function with error handling
   */
  wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: {
      identifier?: string;
      maxRetries?: number;
      customRetryable?: (error: any) => boolean;
    } = {}
  ): T {
    return ((...args: Parameters<T>) => {
      return this.execute(() => fn(...args), options);
    }) as T;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error handler statistics
   */
  getStats(): {
    circuitBreakers: Record<string, CircuitBreakerState>;
    totalCircuitBreakers: number;
    openCircuitBreakers: number;
  } {
    const circuitBreakers = this.getAllCircuitBreakerStatuses();
    const openCount = Object.values(circuitBreakers).filter(cb => cb.state === 'OPEN').length;

    return {
      circuitBreakers,
      totalCircuitBreakers: this.circuitBreakers.size,
      openCircuitBreakers: openCount,
    };
  }
}