# Deployment Agent

## Purpose
Specialized agent for managing deployments, environment variables, build processes, and ensuring zero-downtime releases across all environments.

## Capabilities
- Orchestrates multi-environment deployments
- Manages environment variables securely
- Handles build optimization and caching
- Implements blue-green deployments
- Manages rollback procedures
- Monitors deployment health
- Coordinates database migrations with code deployments
- Handles CDN cache invalidation

## Core Functions

### 1. Deployment Pipeline
```typescript
interface DeploymentPipeline {
  stages: {
    validate: ValidateStage;
    build: BuildStage;
    test: TestStage;
    deploy: DeployStage;
    verify: VerifyStage;
    rollback?: RollbackStage;
  };
  
  environments: ['development', 'staging', 'production'];
  
  strategies: {
    blueGreen: boolean;
    canary: boolean;
    rolling: boolean;
  };
}
```

### 2. Environment Management
```typescript
class EnvironmentManager {
  private configs = {
    development: {
      apiUrl: 'http://localhost:4000',
      database: 'postgresql://localhost/jobai_dev',
      redis: 'redis://localhost:6379',
      debug: true
    },
    staging: {
      apiUrl: 'https://staging-api.jobai.com',
      database: process.env.STAGING_DATABASE_URL,
      redis: process.env.STAGING_REDIS_URL,
      debug: false
    },
    production: {
      apiUrl: 'https://api.jobai.com',
      database: process.env.DATABASE_URL,
      redis: process.env.REDIS_URL,
      debug: false
    }
  };
  
  async validateSecrets() {
    const required = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    if (missing.length) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
  }
}
```

### 3. Build Process
```typescript
class BuildManager {
  async build(environment: Environment) {
    const steps = [
      this.cleanBuildDirectory(),
      this.installDependencies(),
      this.runLinter(),
      this.runTypeCheck(),
      this.runTests(),
      this.buildApplication(),
      this.optimizeAssets(),
      this.generateSourceMaps(),
      this.createDockerImage(),
      this.pushToRegistry()
    ];
    
    for (const step of steps) {
      await step.execute();
      if (step.failed) {
        await this.notifyFailure(step);
        throw new Error(`Build failed at: ${step.name}`);
      }
    }
  }
}
```

### 4. Deployment Strategies

#### Blue-Green Deployment
```typescript
class BlueGreenDeployment {
  async deploy() {
    // 1. Deploy to green environment
    await this.deployToGreen();
    
    // 2. Run health checks
    const healthy = await this.healthCheck('green');
    
    // 3. Switch traffic
    if (healthy) {
      await this.switchTraffic('green');
      
      // 4. Monitor for issues
      await this.monitor(5 * 60 * 1000); // 5 minutes
      
      // 5. Cleanup old blue
      await this.cleanupBlue();
    } else {
      await this.rollback();
    }
  }
}
```

#### Canary Deployment
```typescript
class CanaryDeployment {
  async deploy() {
    const stages = [
      { traffic: 5, duration: 10 * 60 * 1000 },   // 5% for 10 min
      { traffic: 25, duration: 30 * 60 * 1000 },  // 25% for 30 min
      { traffic: 50, duration: 60 * 60 * 1000 },  // 50% for 1 hour
      { traffic: 100, duration: 0 }               // Full rollout
    ];
    
    for (const stage of stages) {
      await this.setTrafficWeight(stage.traffic);
      
      if (stage.duration > 0) {
        const metrics = await this.monitorMetrics(stage.duration);
        
        if (metrics.errorRate > 0.01) {
          await this.rollback();
          throw new Error('Canary deployment failed');
        }
      }
    }
  }
}
```

## Implementation Tasks

### Setup Phase
1. Configure CI/CD pipeline (GitHub Actions)
2. Set up Docker registry
3. Configure Kubernetes/ECS
4. Set up monitoring (Datadog/New Relic)
5. Implement secret management (AWS Secrets Manager)
6. Create deployment scripts

### GitHub Actions Workflow
```yaml
name: Deploy Pipeline
on:
  push:
    branches: [main, staging]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - uses: docker/build-push-action@v4
        with:
          push: true
          tags: jobai:${{ github.sha }}

  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to Staging
        run: |
          kubectl set image deployment/api api=jobai:${{ github.sha }}
          kubectl rollout status deployment/api

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Blue-Green Deploy
        run: |
          ./scripts/deploy-blue-green.sh ${{ github.sha }}
```

### Infrastructure as Code
```typescript
// Terraform configuration for infrastructure
const infrastructure = {
  providers: ['aws', 'cloudflare'],
  
  resources: {
    // Application servers
    ecs_cluster: {
      name: 'jobai-cluster',
      capacity_providers: ['FARGATE_SPOT', 'FARGATE']
    },
    
    // Database
    rds_instance: {
      engine: 'postgres',
      engine_version: '15.3',
      instance_class: 'db.t3.medium',
      allocated_storage: 100,
      multi_az: true
    },
    
    // Redis cache
    elasticache_cluster: {
      engine: 'redis',
      node_type: 'cache.t3.micro',
      num_nodes: 2
    },
    
    // Load balancer
    alb: {
      name: 'jobai-alb',
      health_check_path: '/health',
      blue_green_enabled: true
    },
    
    // CDN
    cloudfront: {
      origins: ['api.jobai.com', 'app.jobai.com'],
      cache_behaviors: {
        '/api/*': { cache: false },
        '/static/*': { cache: true, ttl: 86400 }
      }
    }
  }
};
```

### Rollback Procedures
```typescript
class RollbackManager {
  async rollback(deployment: Deployment) {
    // 1. Capture current state
    const currentState = await this.captureState();
    
    // 2. Identify previous stable version
    const previousVersion = await this.getPreviousStableVersion();
    
    // 3. Switch traffic back
    await this.switchTraffic(previousVersion);
    
    // 4. Verify rollback success
    const success = await this.verifyRollback();
    
    // 5. Notify team
    await this.notifyTeam({
      status: success ? 'rolled_back' : 'rollback_failed',
      from: deployment.version,
      to: previousVersion
    });
    
    // 6. Create incident report
    await this.createIncidentReport(deployment);
  }
}
```

## Health Checks
```typescript
class HealthChecker {
  checks = [
    { name: 'api', url: '/health', expectedStatus: 200 },
    { name: 'database', query: 'SELECT 1', expectedRows: 1 },
    { name: 'redis', command: 'PING', expectedResponse: 'PONG' },
    { name: 'jobs', url: '/api/jobs/search?q=test', minResults: 1 }
  ];
  
  async runChecks() {
    const results = await Promise.all(
      this.checks.map(check => this.runCheck(check))
    );
    
    return {
      healthy: results.every(r => r.passed),
      checks: results
    };
  }
}
```

## Monitoring & Alerts
```yaml
monitoring:
  metrics:
    - deployment_duration
    - deployment_success_rate
    - rollback_frequency
    - build_time
    - test_coverage
  
  alerts:
    deployment_failed:
      channels: ['slack', 'pagerduty']
      severity: critical
    
    high_error_rate:
      threshold: 1%
      window: 5m
      channels: ['slack']
      severity: warning
    
    slow_deployment:
      threshold: 15m
      channels: ['slack']
      severity: info
```

## Configuration
```yaml
deployment:
  strategy: blue_green
  
  environments:
    staging:
      auto_deploy: true
      approval_required: false
      rollback_on_failure: true
    
    production:
      auto_deploy: false
      approval_required: true
      canary_enabled: true
      rollback_on_failure: true
  
  health_checks:
    timeout: 30s
    interval: 5s
    retries: 5
  
  notifications:
    slack_webhook: ${SLACK_WEBHOOK_URL}
    email_list: ['team@jobai.com']
```

## Usage Example
```typescript
// Agent handles all deployment complexity
await deploymentAgent.deploy({
  environment: 'production',
  version: 'v1.2.3',
  strategy: 'blue-green',
  options: {
    runMigrations: true,
    warmupTime: 60000,
    healthCheckInterval: 5000,
    autoRollback: true
  }
});

// Check deployment status
const status = await deploymentAgent.getStatus('production');
```

## Success Metrics
- Deployment success rate > 99%
- Average deployment time < 10 minutes
- Rollback time < 2 minutes
- Zero-downtime achieved 100%
- Failed deployment detection < 30 seconds