# Performance Monitor Agent

## Purpose
Specialized agent for monitoring application performance, identifying bottlenecks, optimizing database queries, and managing caching strategies to ensure optimal user experience.

## Capabilities
- Monitors real-time application performance
- Identifies and resolves bottlenecks
- Optimizes database queries and indexes
- Manages multi-layer caching strategies
- Tracks API response times
- Monitors resource utilization
- Performs load testing
- Generates performance reports

## Core Functions

### 1. Performance Metrics
```typescript
interface PerformanceMetrics {
  // Response Times
  api: {
    p50: number;  // 50th percentile
    p95: number;  // 95th percentile
    p99: number;  // 99th percentile
    avg: number;
    max: number;
  };
  
  // Database Performance
  database: {
    queryTime: number;
    connectionPool: {
      active: number;
      idle: number;
      waiting: number;
    };
    slowQueries: Query[];
    cacheHitRate: number;
  };
  
  // System Resources
  resources: {
    cpu: number;
    memory: number;
    disk: number;
    network: {
      in: number;
      out: number;
    };
  };
  
  // Application Metrics
  application: {
    requestsPerSecond: number;
    errorRate: number;
    activeUsers: number;
    queueLength: number;
  };
}
```

### 2. Database Optimization

#### Query Analyzer
```typescript
class QueryAnalyzer {
  async analyzeSlowQueries() {
    // Get slow query log
    const slowQueries = await this.getSlowQueries({
      threshold: 100, // ms
      limit: 50
    });
    
    for (const query of slowQueries) {
      const analysis = await this.analyze(query);
      
      if (analysis.canOptimize) {
        await this.optimize(query, analysis.suggestions);
      }
    }
  }
  
  optimizations = {
    // Add missing indexes
    addIndex: async (table: string, columns: string[]) => {
      const indexName = `idx_${table}_${columns.join('_')}`;
      await db.query(`CREATE INDEX ${indexName} ON ${table}(${columns.join(',')})`);
    },
    
    // Rewrite inefficient queries
    rewriteQuery: (query: string) => {
      // Convert subqueries to joins
      // Use EXISTS instead of IN
      // Limit result sets early
      // Remove unnecessary columns
      return this.optimizeQueryStructure(query);
    },
    
    // Partition large tables
    partitionTable: async (table: string) => {
      await db.query(`ALTER TABLE ${table} PARTITION BY RANGE (created_at)`);
    },
    
    // Update statistics
    updateStatistics: async (table: string) => {
      await db.query(`ANALYZE TABLE ${table}`);
    }
  };
}
```

#### Index Management
```typescript
class IndexManager {
  async optimizeIndexes() {
    // Find unused indexes
    const unusedIndexes = await this.findUnusedIndexes();
    for (const idx of unusedIndexes) {
      await this.dropIndex(idx);
    }
    
    // Find missing indexes
    const missingIndexes = await this.findMissingIndexes();
    for (const idx of missingIndexes) {
      await this.createIndex(idx);
    }
    
    // Find duplicate indexes
    const duplicateIndexes = await this.findDuplicateIndexes();
    for (const idx of duplicateIndexes) {
      await this.consolidateIndex(idx);
    }
  }
  
  suggestedIndexes = {
    // User queries
    users: [
      ['email'],
      ['created_at'],
      ['email', 'deleted_at']
    ],
    
    // Job searches
    jobs: [
      ['title', 'company'],
      ['posted_at', 'source'],
      ['location', 'remote'],
      ['created_at', 'status']
    ],
    
    // Applications
    applications: [
      ['user_id', 'status'],
      ['job_id', 'created_at'],
      ['user_id', 'job_id']
    ]
  };
}
```

### 3. Caching Strategy

#### Multi-Layer Cache
```typescript
class CacheManager {
  layers = {
    // L1: In-memory cache (Node.js process)
    memory: {
      ttl: 60,  // seconds
      maxSize: 100,  // MB
      strategy: 'LRU'
    },
    
    // L2: Redis cache
    redis: {
      ttl: 3600,  // 1 hour
      maxMemory: '1gb',
      evictionPolicy: 'allkeys-lru'
    },
    
    // L3: CDN cache
    cdn: {
      ttl: 86400,  // 24 hours
      paths: ['/static/*', '/api/jobs/*'],
      invalidateOn: ['deploy', 'content-update']
    }
  };
  
  async get(key: string) {
    // Check L1
    let value = await this.memory.get(key);
    if (value) return { value, source: 'memory' };
    
    // Check L2
    value = await this.redis.get(key);
    if (value) {
      await this.memory.set(key, value);  // Promote to L1
      return { value, source: 'redis' };
    }
    
    // Generate and cache
    value = await this.generate(key);
    await this.setAll(key, value);
    return { value, source: 'generated' };
  }
  
  cacheKeys = {
    userProfile: (userId: string) => `user:${userId}`,
    jobSearch: (params: any) => `jobs:${hash(params)}`,
    resume: (resumeId: string) => `resume:${resumeId}`,
    application: (appId: string) => `app:${appId}`
  };
}
```

### 4. Load Testing

#### Performance Testing Suite
```typescript
class LoadTester {
  scenarios = {
    // Normal load
    normal: {
      users: 100,
      duration: '5m',
      rampUp: '30s'
    },
    
    // Peak load
    peak: {
      users: 1000,
      duration: '15m',
      rampUp: '2m'
    },
    
    // Stress test
    stress: {
      users: 5000,
      duration: '30m',
      rampUp: '5m'
    },
    
    // Spike test
    spike: {
      users: 10000,
      duration: '1m',
      rampUp: '10s'
    }
  };
  
  async runTest(scenario: string) {
    const config = this.scenarios[scenario];
    
    const results = await k6.run({
      vus: config.users,
      duration: config.duration,
      stages: [
        { duration: config.rampUp, target: config.users },
        { duration: config.duration, target: config.users },
        { duration: '30s', target: 0 }
      ],
      thresholds: {
        'http_req_duration': ['p(95)<500'],
        'http_req_failed': ['rate<0.1']
      }
    });
    
    return this.analyzeResults(results);
  }
}
```

### 5. Real-Time Monitoring

#### Application Performance Monitoring (APM)
```typescript
class APMMonitor {
  async track() {
    // Track HTTP requests
    app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        
        this.metrics.record({
          path: req.path,
          method: req.method,
          status: res.statusCode,
          duration,
          timestamp: new Date()
        });
        
        // Alert on slow requests
        if (duration > 1000) {
          this.alert('slow_request', { path: req.path, duration });
        }
      });
      
      next();
    });
    
    // Track database queries
    db.on('query', (query) => {
      this.metrics.recordQuery({
        sql: query.sql,
        duration: query.duration,
        rows: query.rowCount
      });
    });
    
    // Track cache performance
    cache.on('hit', () => this.metrics.incrementCacheHit());
    cache.on('miss', () => this.metrics.incrementCacheMiss());
  }
}
```

## Implementation Tasks

### Setup Phase
1. Install monitoring tools
   - New Relic / Datadog APM
   - Prometheus + Grafana
   - Elasticsearch for logs
2. Configure performance tracking
3. Set up alerting rules
4. Create dashboards
5. Implement custom metrics
6. Set up load testing

### Optimization Strategies

#### Frontend Optimization
```typescript
const frontendOptimizations = {
  // Code splitting
  codeSplitting: {
    routes: true,
    vendors: true,
    common: true
  },
  
  // Asset optimization
  assets: {
    images: 'webp',
    compression: 'brotli',
    lazy: true
  },
  
  // Bundle optimization
  bundle: {
    treeshaking: true,
    minification: true,
    sourceMaps: 'production'
  },
  
  // Runtime optimization
  runtime: {
    virtualScrolling: true,
    debouncing: true,
    memoization: true
  }
};
```

#### Backend Optimization
```typescript
const backendOptimizations = {
  // Connection pooling
  database: {
    poolSize: 20,
    idleTimeout: 30000,
    connectionTimeout: 5000
  },
  
  // Request optimization
  requests: {
    compression: true,
    pagination: true,
    fieldSelection: true
  },
  
  // Background jobs
  queues: {
    concurrency: 10,
    priority: true,
    batching: true
  }
};
```

## Performance Budgets
```yaml
performance:
  budgets:
    # Page load times
    pageLoad:
      firstContentfulPaint: 1000ms
      timeToInteractive: 3000ms
      fullyLoaded: 5000ms
    
    # API response times
    api:
      search: 200ms
      detail: 100ms
      mutation: 500ms
    
    # Resource sizes
    bundle:
      javascript: 500kb
      css: 100kb
      images: 2mb
    
    # Metrics thresholds
    metrics:
      errorRate: 0.1%
      availability: 99.9%
      apdex: 0.9
```

## Alerting Rules
```typescript
const alertingRules = {
  // Response time alerts
  responseTime: {
    warning: 500,  // ms
    critical: 1000,  // ms
    window: '5m'
  },
  
  // Error rate alerts
  errorRate: {
    warning: 1,  // %
    critical: 5,  // %
    window: '5m'
  },
  
  // Resource alerts
  resources: {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    disk: { warning: 85, critical: 95 }
  },
  
  // Database alerts
  database: {
    connections: { warning: 80, critical: 95 },
    lockWaits: { warning: 10, critical: 50 },
    replication: { warning: 60, critical: 300 }  // seconds
  }
};
```

## Configuration
```yaml
monitoring:
  apm:
    provider: datadog
    sampleRate: 0.1
    tracing: true
  
  metrics:
    interval: 10s
    retention: 30d
    aggregation: [avg, min, max, p50, p95, p99]
  
  logging:
    level: info
    format: json
    destination: elasticsearch
  
  alerts:
    channels: ['slack', 'pagerduty', 'email']
    escalation:
      - level: warning
        notify: ['slack']
        after: 5m
      - level: critical
        notify: ['pagerduty', 'slack']
        after: 1m
```

## Usage Example
```typescript
// Monitor performance automatically
await performanceMonitorAgent.startMonitoring({
  services: ['api', 'database', 'cache'],
  metrics: ['response_time', 'error_rate', 'throughput'],
  alerts: true
});

// Run optimization analysis
const analysis = await performanceMonitorAgent.analyze({
  period: '7d',
  focus: ['slow_queries', 'cache_misses', 'bottlenecks']
});

// Execute load test
const loadTestResults = await performanceMonitorAgent.loadTest({
  scenario: 'peak',
  endpoints: ['/api/jobs/search', '/api/resume/tailor'],
  report: true
});
```

## Success Metrics
- API response time p95 < 500ms
- Database query time p95 < 100ms
- Cache hit rate > 85%
- Error rate < 0.1%
- Uptime > 99.9%