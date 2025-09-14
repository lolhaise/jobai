# Job APIs Package - API Integration Framework

A comprehensive, production-ready API integration framework designed specifically for job board APIs. This framework provides a solid foundation for building scalable, reliable, and maintainable integrations with various job board platforms.

## 🚀 Features

### Core Framework Components

- **Base API Client**: Generic, extensible client with common functionality
- **Rate Limiting**: Token bucket algorithm with burst support and queue management
- **Caching Layer**: Redis-backed caching with in-memory fallback and TTL management
- **Error Handling**: Exponential backoff, circuit breaker pattern, and retry logic
- **Webhook Processing**: Secure webhook handling with signature verification
- **API Key Management**: Secure storage, rotation, and validation of API credentials

### Production-Ready Features

- **TypeScript First**: Comprehensive type definitions for all components
- **Security**: HMAC signature verification, encrypted credential storage
- **Monitoring**: Built-in health checks, metrics collection, and performance tracking
- **Scalability**: Horizontal scaling support with shared state management
- **Reliability**: Circuit breakers, automatic retries, and graceful degradation

## 📦 Installation

```bash
# Install the package
pnpm install @jobai/job-apis

# Optional: Install Redis for production caching
pnpm install ioredis
```

## 🛠️ Quick Start

### 1. Create a Job Board Client

```typescript
import { BaseAPIClient, BaseClientConfig } from '@jobai/job-apis';

class MyJobBoardClient extends BaseAPIClient {
  constructor() {
    const config: BaseClientConfig = {
      baseURL: 'https://api.example-job-board.com',
      apiKey: process.env.JOB_BOARD_API_KEY,
      timeout: 30000,
      rateLimit: {
        requests: 100,
        per: 60000, // 1 minute
      },
      cache: {
        enabled: true,
        ttl: 300, // 5 minutes
      },
    };
    
    super(config);
  }

  getName(): string {
    return 'MyJobBoard';
  }

  async searchJobs(query: { keywords?: string; location?: string }) {
    return this.get('/api/v1/jobs/search', {
      params: query,
      cacheKey: `jobs:search:${JSON.stringify(query)}`,
      cacheTTL: 300,
    });
  }

  async getJob(jobId: string) {
    return this.get(`/api/v1/jobs/${jobId}`, {
      cacheKey: `job:${jobId}`,
      cacheTTL: 600,
    });
  }
}
```

### 2. Use Individual Components

```typescript
import { 
  RateLimiter, 
  CacheManager, 
  ErrorHandler,
  WebhookProcessor 
} from '@jobai/job-apis';

// Rate Limiting
const rateLimiter = new RateLimiter({
  requests: 100,
  per: 60000,
  identifier: 'my-api',
});

await rateLimiter.acquire(); // Wait for token

// Caching
const cache = new CacheManager({
  enabled: true,
  defaultTTL: 300,
  prefix: 'my-app',
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

await cache.set('key', { data: 'value' }, 600);
const data = await cache.get('key');

// Error Handling with Circuit Breaker
const errorHandler = new ErrorHandler({
  maxRetries: 3,
  baseDelay: 1000,
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 60000,
  },
});

const result = await errorHandler.execute(async () => {
  // Your API call here
  return apiCall();
});

// Webhook Processing
const webhook = new WebhookProcessor({
  secret: process.env.WEBHOOK_SECRET,
  signatureHeader: 'x-signature',
});

webhook.registerHandler({
  source: 'job-board',
  eventTypes: ['job.created', 'job.updated'],
  handler: async (event) => {
    console.log('Received job event:', event.type, event.data);
  },
});
```

## 🏗️ Architecture

### Base API Client

The `BaseAPIClient` provides a foundation for all job board integrations:

- **HTTP Methods**: GET, POST, PUT, DELETE with built-in rate limiting
- **Authentication**: Configurable auth headers and token management
- **Caching**: Automatic response caching with configurable TTL
- **Error Handling**: Built-in retry logic with exponential backoff
- **Request/Response Logging**: Comprehensive request tracking

```typescript
// Override authentication for custom providers
protected getAuthHeaders(): Record<string, string> {
  return {
    'Authorization': `Api-Key ${this.config.apiKey}`,
    'X-Custom-Header': 'value',
  };
}
```

### Rate Limiting

Token bucket algorithm with advanced features:

- **Burst Support**: Allow temporary bursts above the base rate
- **Queue Management**: Automatic queuing of requests when rate limited
- **Multiple Limiters**: Per-provider rate limiting with shared registry
- **Real-time Status**: Check remaining tokens and reset times

```typescript
const limiter = new RateLimiter({
  requests: 100,      // Base rate: 100 requests
  per: 60000,         // Per minute
  burst: 120,         // Allow bursts up to 120
  identifier: 'api-name',
});

// Check if request can be made immediately
if (limiter.canMakeRequest()) {
  await makeApiCall();
} else {
  // Wait for token
  await limiter.acquire();
  await makeApiCall();
}
```

### Caching Strategy

Multi-tier caching with Redis and in-memory fallback:

- **Redis Primary**: Distributed caching for production environments
- **Memory Fallback**: Automatic fallback when Redis is unavailable
- **TTL Management**: Per-key TTL with automatic expiration cleanup
- **Statistics**: Hit rates, miss rates, and performance metrics

```typescript
const cache = new CacheManager({
  enabled: true,
  defaultTTL: 300,
  prefix: 'jobai:api',
  maxMemorySize: 50 * 1024 * 1024, // 50MB memory limit
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
  },
});

// Advanced caching with metadata
const result = await cache.getWithMetadata('key');
if (result.cached) {
  console.log(`Cached data from ${result.timestamp}, TTL: ${result.ttl}s`);
}
```

### Error Handling & Circuit Breaker

Resilient error handling with circuit breaker pattern:

- **Exponential Backoff**: Intelligent retry delays with jitter
- **Circuit Breaker**: Prevent cascade failures with automatic recovery
- **Custom Retry Logic**: Configurable retry conditions per API
- **Monitoring**: Track failure rates and circuit breaker state

```typescript
const handler = new ErrorHandler({
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
});

// Wrap any async operation
const result = await handler.execute(
  async () => riskyApiCall(),
  {
    identifier: 'risky-api',
    customRetryable: (error) => error.status >= 500,
  }
);
```

### Webhook Processing

Secure webhook handling with signature verification:

- **Signature Verification**: HMAC-SHA256 signature validation
- **Timestamp Validation**: Prevent replay attacks
- **Event Routing**: Multi-handler event processing
- **Retry Logic**: Automatic retry for failed webhook processing

```typescript
const processor = new WebhookProcessor({
  secret: process.env.WEBHOOK_SECRET,
  signatureHeader: 'x-hub-signature-256',
  timestampHeader: 'x-timestamp',
  toleranceWindow: 300, // 5 minutes
});

// Register event handlers
processor.registerHandler({
  source: 'github',
  eventTypes: ['job.posted', 'job.updated'],
  handler: async (event) => {
    await processJobEvent(event.data);
  },
});
```

## 🔧 Configuration

### Environment Variables

Copy `.env.integration.example` to `.env` and configure:

```bash
# Required
WEBHOOK_SECRET=your-webhook-secret
REDIS_HOST=localhost
REDIS_PORT=6379

# Job Board API Keys
REMOTE_OK_API_KEY=your-key
THE_MUSE_API_KEY=your-key
USAJOBS_API_KEY=your-key

# Optional Tuning
RATE_LIMIT_REQUESTS=1000
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CACHE_DEFAULT_TTL=300
```

### NestJS Integration

The framework includes NestJS modules for easy integration:

```typescript
// app.module.ts
import { IntegrationsModule } from './integrations/integrations.module';

@Module({
  imports: [
    IntegrationsModule.forRoot(),
    // other modules
  ],
})
export class AppModule {}
```

## 📊 Monitoring & Observability

### Health Checks

```typescript
const client = new MyJobBoardClient(config);

// Check API health
const health = await client.getHealth();
console.log(`API Status: ${health.status}, Latency: ${health.latency}ms`);

// Check rate limit status
const rateStatus = client.getRateLimitStatus();
console.log(`Remaining: ${rateStatus.remaining}/${rateStatus.limit}`);
```

### Metrics Collection

```typescript
// Cache metrics
const cacheStats = cache.getStats();
console.log(`Hit Rate: ${(cacheStats.hitRate * 100).toFixed(2)}%`);

// Error handler metrics
const errorStats = errorHandler.getStats();
console.log(`Circuit Breakers: ${errorStats.openCircuitBreakers}/${errorStats.totalCircuitBreakers}`);

// Webhook metrics
const webhookStats = webhook.getStats();
console.log(`Processed: ${webhookStats.totalProcessed}, Failed: ${webhookStats.totalFailed}`);
```

## 🧪 Testing

Run the comprehensive test suite:

```typescript
import { runIntegrationTests } from '@jobai/job-apis/lib/test-integration-framework';

// Run all framework tests
await runIntegrationTests();
```

The test suite covers:
- Rate limiting under load
- Cache performance and persistence
- Error handling and circuit breaker logic
- Webhook signature verification
- API client functionality

## 🔐 Security

### API Key Management

- **Encryption**: All API keys encrypted at rest using AES-256
- **Rotation**: Built-in key rotation with zero downtime
- **Access Control**: Role-based access to API credentials
- **Audit Logging**: Complete audit trail of key usage

### Webhook Security

- **Signature Verification**: HMAC-SHA256 signature validation
- **Timestamp Validation**: Prevent replay attacks
- **Rate Limiting**: Prevent webhook flooding
- **Input Validation**: Comprehensive payload validation

## 🚀 Production Deployment

### Scaling Considerations

1. **Redis Clustering**: Use Redis Cluster for high availability
2. **Load Balancing**: Distribute webhook processing across instances
3. **Circuit Breaker Coordination**: Share circuit breaker state via Redis
4. **Monitoring**: Set up alerts for circuit breaker trips and rate limit violations

### Performance Optimization

1. **Connection Pooling**: HTTP connection pooling enabled by default
2. **Cache Warming**: Pre-populate cache with frequently accessed data
3. **Batch Operations**: Use batch APIs when available
4. **Compression**: Enable gzip compression for large responses

## 📚 API Documentation

### BaseAPIClient Methods

- `get<T>(url, config?)`: GET request with caching
- `post<T>(url, data?, config?)`: POST request with rate limiting
- `put<T>(url, data?, config?)`: PUT request with rate limiting
- `delete<T>(url, config?)`: DELETE request with rate limiting
- `getHealth()`: API health check
- `clearCache()`: Clear all cached responses

### RateLimiter Methods

- `acquire()`: Acquire a rate limit token (async)
- `canMakeRequest()`: Check if request can be made immediately
- `getStatus()`: Get current rate limit status
- `reset()`: Reset rate limiter state

### CacheManager Methods

- `get<T>(key)`: Get cached value
- `set<T>(key, value, ttl?)`: Set cached value
- `delete(key)`: Delete cached value
- `clear()`: Clear all cache entries
- `getStats()`: Get cache statistics

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`pnpm test`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation in `/docs`
- Review the test examples in `/src/lib/test-integration-framework.ts`

---

Built with ❤️ for the JobAI Platform