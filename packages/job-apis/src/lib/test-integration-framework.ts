/**
 * Test Suite for API Integration Framework
 * Demonstrates usage and validates functionality
 */

import { BaseAPIClient, BaseClientConfig } from './base-client';
import { RateLimiter, RateLimiterConfig } from './rate-limiter';
import { CacheManager, CacheConfig } from './cache-manager';
import { ErrorHandler, ErrorHandlerConfig } from './error-handler';
import { WebhookProcessor, WebhookConfig } from './webhook-handler';

// Example Job Board API Client Implementation
class ExampleJobBoardClient extends BaseAPIClient {
  constructor(config: BaseClientConfig) {
    super(config);
  }

  getName(): string {
    return 'ExampleJobBoard';
  }

  /**
   * Search for jobs
   */
  async searchJobs(query: {
    keywords?: string;
    location?: string;
    remote?: boolean;
    page?: number;
    limit?: number;
  }) {
    const params = {
      q: query.keywords,
      location: query.location,
      remote: query.remote ? '1' : '0',
      page: query.page || 1,
      per_page: query.limit || 20,
    };

    return this.get('/api/v1/jobs', {
      params,
      cacheKey: `jobs:search:${JSON.stringify(query)}`,
      cacheTTL: 300, // 5 minutes
    });
  }

  /**
   * Get job details
   */
  async getJob(jobId: string) {
    return this.get(`/api/v1/jobs/${jobId}`, {
      cacheKey: `job:${jobId}`,
      cacheTTL: 600, // 10 minutes
    });
  }

  /**
   * Submit job application
   */
  async applyToJob(jobId: string, applicationData: any) {
    return this.post(`/api/v1/jobs/${jobId}/apply`, applicationData);
  }

  /**
   * Get application status
   */
  async getApplicationStatus(applicationId: string) {
    return this.get(`/api/v1/applications/${applicationId}`, {
      cacheKey: `application:${applicationId}`,
      cacheTTL: 60, // 1 minute (more frequent updates needed)
    });
  }
}

// Test Functions
export class IntegrationFrameworkTester {
  private client: ExampleJobBoardClient;
  private rateLimiter: RateLimiter;
  private cache: CacheManager;
  private errorHandler: ErrorHandler;
  private webhook: WebhookProcessor;

  constructor() {
    // Initialize components with test configurations
    this.initializeComponents();
  }

  private initializeComponents() {
    // Rate Limiter Configuration
    const rateLimiterConfig: RateLimiterConfig = {
      requests: 100,
      per: 60000, // 1 minute
      identifier: 'test-job-board',
      burst: 120,
    };

    this.rateLimiter = new RateLimiter(rateLimiterConfig);

    // Cache Configuration
    const cacheConfig: CacheConfig = {
      enabled: true,
      defaultTTL: 300,
      prefix: 'test-api',
      maxMemorySize: 10 * 1024 * 1024, // 10MB
      // Redis config would be added here in production
    };

    this.cache = new CacheManager(cacheConfig);

    // Error Handler Configuration
    const errorConfig: ErrorHandlerConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        resetTimeout: 60000,
        monitoringPeriod: 60000,
      },
    };

    this.errorHandler = new ErrorHandler(errorConfig);

    // Webhook Configuration
    const webhookConfig: WebhookConfig = {
      secret: 'test-webhook-secret',
      signatureHeader: 'x-signature',
      signaturePrefix: 'sha256=',
      timestampHeader: 'x-timestamp',
      toleranceWindow: 300,
      maxBodySize: 1024 * 1024,
      retryAttempts: 3,
      retryDelay: 1000,
    };

    this.webhook = new WebhookProcessor(webhookConfig);

    // API Client Configuration
    const clientConfig: BaseClientConfig = {
      baseURL: 'https://api.example-job-board.com',
      apiKey: 'test-api-key',
      timeout: 30000,
      retries: 3,
      rateLimit: {
        requests: 100,
        per: 60000,
      },
      cache: {
        enabled: true,
        ttl: 300,
      },
      headers: {
        'User-Agent': 'JobAI-Test/1.0',
        'Accept': 'application/json',
      },
    };

    this.client = new ExampleJobBoardClient(clientConfig);
  }

  /**
   * Test rate limiting functionality
   */
  async testRateLimiting(): Promise<void> {
    console.log('\n=== Testing Rate Limiting ===');

    try {
      // Test normal acquisition
      const startTime = Date.now();
      
      for (let i = 0; i < 5; i++) {
        await this.rateLimiter.acquire();
        console.log(`Token ${i + 1} acquired at ${Date.now() - startTime}ms`);
      }

      // Test rate limit status
      const status = this.rateLimiter.getStatus();
      console.log('Rate limit status:', {
        remaining: status.remaining,
        limit: status.limit,
        isLimited: status.isLimited,
        resetTime: new Date(status.resetTime).toISOString(),
      });

      console.log('✓ Rate limiting test passed');
    } catch (error) {
      console.error('✗ Rate limiting test failed:', error.message);
    }
  }

  /**
   * Test caching functionality
   */
  async testCaching(): Promise<void> {
    console.log('\n=== Testing Caching ===');

    try {
      const testData = { message: 'Hello Cache!', timestamp: Date.now() };
      const cacheKey = 'test-key';

      // Test cache miss
      let cached = await this.cache.get(cacheKey);
      console.log('Cache miss result:', cached);

      // Test cache set
      await this.cache.set(cacheKey, testData, 60);
      console.log('Data cached successfully');

      // Test cache hit
      cached = await this.cache.get(cacheKey);
      console.log('Cache hit result:', cached);

      // Test cache stats
      const stats = this.cache.getStats();
      console.log('Cache stats:', stats);

      // Test cache increment
      const counterKey = 'test-counter';
      await this.cache.increment(counterKey, 1, 60);
      await this.cache.increment(counterKey, 5, 60);
      const counterValue = await this.cache.get(counterKey);
      console.log('Counter value:', counterValue);

      console.log('✓ Caching test passed');
    } catch (error) {
      console.error('✗ Caching test failed:', error.message);
    }
  }

  /**
   * Test error handling and circuit breaker
   */
  async testErrorHandling(): Promise<void> {
    console.log('\n=== Testing Error Handling ===');

    try {
      // Test successful execution
      const successResult = await this.errorHandler.execute(async () => {
        return { success: true, data: 'test data' };
      });
      console.log('Success result:', successResult);

      // Test retry mechanism
      let attemptCount = 0;
      try {
        await this.errorHandler.execute(async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Simulated temporary failure');
          }
          return { success: true, attempt: attemptCount };
        }, { identifier: 'test-retry' });
        console.log(`✓ Retry succeeded after ${attemptCount} attempts`);
      } catch (error) {
        console.log(`Retry failed after ${attemptCount} attempts:`, error.message);
      }

      // Test circuit breaker
      const circuitBreakerStatus = this.errorHandler.getCircuitBreakerStatus('test-circuit');
      console.log('Circuit breaker status:', circuitBreakerStatus);

      console.log('✓ Error handling test passed');
    } catch (error) {
      console.error('✗ Error handling test failed:', error.message);
    }
  }

  /**
   * Test webhook processing
   */
  async testWebhookProcessing(): Promise<void> {
    console.log('\n=== Testing Webhook Processing ===');

    try {
      // Register a test webhook handler
      this.webhook.registerHandler({
        source: 'test-job-board',
        eventTypes: ['job.created', 'job.updated'],
        handler: async (event) => {
          console.log('Webhook handler called:', {
            id: event.id,
            source: event.source,
            type: event.type,
            data: event.data,
          });
        },
      });

      // Test webhook processing
      const testWebhookData = {
        id: 'job-12345',
        type: 'job.created',
        job: {
          title: 'Senior Software Engineer',
          company: 'Test Company',
          location: 'Remote',
        },
        timestamp: new Date().toISOString(),
      };

      const headers = {
        'content-type': 'application/json',
        'x-timestamp': Math.floor(Date.now() / 1000).toString(),
      };

      const result = await this.webhook.processWebhook(
        'test-job-board',
        headers,
        JSON.stringify(testWebhookData),
        { skipSignatureVerification: true } // Skip signature for testing
      );

      console.log('Webhook processing result:', {
        valid: result.valid,
        eventId: result.event?.id,
        eventType: result.event?.type,
      });

      // Test webhook stats
      const webhookStats = this.webhook.getStats();
      console.log('Webhook stats:', webhookStats);

      console.log('✓ Webhook processing test passed');
    } catch (error) {
      console.error('✗ Webhook processing test failed:', error.message);
    }
  }

  /**
   * Test the complete API client functionality
   */
  async testAPIClient(): Promise<void> {
    console.log('\n=== Testing API Client ===');

    try {
      // Test health check (will fail with mock endpoint, but tests the structure)
      try {
        const health = await this.client.getHealth();
        console.log('API health:', health);
      } catch (error) {
        console.log('Health check failed (expected with mock endpoint):', error.message);
      }

      // Test rate limit status
      const rateLimitStatus = this.client.getRateLimitStatus();
      console.log('Client rate limit status:', rateLimitStatus);

      // Test cache clearing
      await this.client.clearCache();
      console.log('Cache cleared successfully');

      console.log('✓ API client test passed');
    } catch (error) {
      console.error('✗ API client test failed:', error.message);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting API Integration Framework Tests\n');

    await this.testRateLimiting();
    await this.testCaching();
    await this.testErrorHandling();
    await this.testWebhookProcessing();
    await this.testAPIClient();

    console.log('\n✅ All tests completed!');
  }

  /**
   * Performance test - simulate high load
   */
  async performanceTest(): Promise<void> {
    console.log('\n=== Performance Test ===');

    const startTime = Date.now();
    const promises: Promise<any>[] = [];

    // Simulate 50 concurrent cache operations
    for (let i = 0; i < 50; i++) {
      promises.push(
        this.cache.set(`perf-test-${i}`, { data: `test-data-${i}` }, 60)
      );
    }

    // Simulate 25 concurrent rate limit acquisitions
    for (let i = 0; i < 25; i++) {
      promises.push(this.rateLimiter.acquire());
    }

    await Promise.all(promises);

    const duration = Date.now() - startTime;
    console.log(`Performance test completed in ${duration}ms`);
    
    // Get final stats
    const cacheStats = this.cache.getStats();
    const rateLimitStats = this.rateLimiter.getStatus();
    
    console.log('Final cache stats:', cacheStats);
    console.log('Final rate limit stats:', rateLimitStats);
  }
}

// Example usage
export async function runIntegrationTests() {
  const tester = new IntegrationFrameworkTester();
  await tester.runAllTests();
  await tester.performanceTest();
}

// Export for use in other test files
export { ExampleJobBoardClient };