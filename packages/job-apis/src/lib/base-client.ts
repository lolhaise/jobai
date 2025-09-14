import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Logger } from '@jobai/shared';
import { RateLimiter } from './rate-limiter';
import { CacheManager } from './cache-manager';
import { ErrorHandler } from './error-handler';

export interface BaseClientConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  rateLimit?: {
    requests: number;
    per: number; // milliseconds
  };
  cache?: {
    enabled: boolean;
    ttl: number; // seconds
  };
  headers?: Record<string, string>;
}

export interface APIResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  cached?: boolean;
  rateLimited?: boolean;
}

export abstract class BaseAPIClient {
  protected client: AxiosInstance;
  protected rateLimiter: RateLimiter;
  protected cache: CacheManager;
  protected errorHandler: ErrorHandler;
  protected logger: Logger;
  protected config: BaseClientConfig;

  constructor(config: BaseClientConfig) {
    this.config = config;
    this.logger = new Logger(`API:${this.constructor.name}`);

    // Initialize HTTP client
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'User-Agent': 'JobAI-Platform/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter({
      requests: config.rateLimit?.requests || 100,
      per: config.rateLimit?.per || 60000, // 1 minute
      identifier: this.constructor.name,
    });

    // Initialize cache
    this.cache = new CacheManager({
      enabled: config.cache?.enabled !== false,
      defaultTTL: config.cache?.ttl || 300, // 5 minutes
      prefix: `api:${this.constructor.name.toLowerCase()}`,
    });

    // Initialize error handler
    this.errorHandler = new ErrorHandler({
      maxRetries: config.retries || 3,
      baseDelay: 1000,
      maxDelay: 30000,
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => this.handleRequest(config),
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => this.handleResponse(response),
      (error) => this.handleError(error)
    );
  }

  /**
   * Make a GET request with caching and rate limiting
   */
  protected async get<T>(
    url: string,
    config?: AxiosRequestConfig & { cacheKey?: string; cacheTTL?: number }
  ): Promise<APIResponse<T>> {
    const cacheKey = config?.cacheKey || this.generateCacheKey('GET', url, config?.params);
    
    // Check cache first
    if (this.cache.isEnabled()) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${url}`);
        return {
          data: cached,
          status: 200,
          headers: {},
          cached: true,
        };
      }
    }

    // Apply rate limiting
    await this.rateLimiter.acquire();

    // Make request with error handling
    const response = await this.errorHandler.execute(async () => {
      return this.client.get<T>(url, config);
    });

    // Cache successful response
    if (this.cache.isEnabled() && response.status >= 200 && response.status < 300) {
      await this.cache.set(cacheKey, response.data, config?.cacheTTL);
    }

    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * Make a POST request with rate limiting
   */
  protected async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    await this.rateLimiter.acquire();

    const response = await this.errorHandler.execute(async () => {
      return this.client.post<T>(url, data, config);
    });

    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * Make a PUT request with rate limiting
   */
  protected async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    await this.rateLimiter.acquire();

    const response = await this.errorHandler.execute(async () => {
      return this.client.put<T>(url, data, config);
    });

    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * Make a DELETE request with rate limiting
   */
  protected async delete<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<APIResponse<T>> {
    await this.rateLimiter.acquire();

    const response = await this.errorHandler.execute(async () => {
      return this.client.delete<T>(url, config);
    });

    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * Handle outgoing requests (authentication, logging, etc.)
   */
  private async handleRequest(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    // Add API key if available
    if (this.config.apiKey) {
      config.headers = {
        ...config.headers,
        ...this.getAuthHeaders(),
      };
    }

    // Log request
    this.logger.debug(`${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data ? '[DATA]' : undefined,
    });

    return config;
  }

  /**
   * Handle successful responses
   */
  private handleResponse(response: AxiosResponse): AxiosResponse {
    this.logger.debug(`Response ${response.status} from ${response.config.url}`, {
      status: response.status,
      headers: response.headers,
    });

    return response;
  }

  /**
   * Handle request errors
   */
  private async handleError(error: any): Promise<never> {
    if (error.response) {
      // Server responded with error status
      this.logger.error(`API Error ${error.response.status}`, {
        url: error.config?.url,
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      // Request was made but no response
      this.logger.error('Network Error', {
        url: error.config?.url,
        message: error.message,
      });
    } else {
      // Something else happened
      this.logger.error('Request Error', {
        message: error.message,
      });
    }

    throw error;
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(method: string, url: string, params?: any): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${method}:${url}:${Buffer.from(paramsStr).toString('base64')}`;
  }

  /**
   * Get authentication headers - override in subclasses
   */
  protected getAuthHeaders(): Record<string, string> {
    if (!this.config.apiKey) return {};
    
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  /**
   * Data sanitization utilities
   */
  protected sanitizeString(str: string | undefined | null): string {
    if (!str) return '';
    return str.replace(/\s+/g, ' ').trim();
  }

  protected extractUrls(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  }

  protected extractEmails(text: string): string[] {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
    return text.match(emailRegex) || [];
  }

  /**
   * Parse date strings with fallback
   */
  protected parseDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;
    
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Get health status of the API
   */
  async getHealth(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const startTime = Date.now();
    
    try {
      await this.client.get('/health', { timeout: 5000 });
      const latency = Date.now() - startTime;
      
      return { status: 'healthy', latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      return { status: 'unhealthy', latency };
    }
  }

  /**
   * Clear cache for this client
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }

  /**
   * Abstract method that subclasses must implement
   */
  abstract getName(): string;
}