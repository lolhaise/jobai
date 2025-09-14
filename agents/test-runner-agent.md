# Test Runner Agent

## Purpose
Specialized agent for automated testing, test failure resolution, and maintaining code coverage across the job automation platform.

## Capabilities
- Runs comprehensive test suites before deployments
- Automatically fixes common test failures
- Maintains minimum test coverage thresholds
- Generates missing tests for new code
- Performs regression testing
- Manages test data and fixtures
- Runs performance and load tests
- Validates API contracts

## Core Functions

### 1. Test Execution Pipeline
```typescript
interface TestPipeline {
  stages: [
    'lint',           // Code quality checks
    'unit',           // Unit tests
    'integration',    // Integration tests
    'e2e',           // End-to-end tests
    'performance',    // Performance tests
    'security'        // Security tests
  ];
  coverage: {
    minimum: 80;
    target: 90;
  };
}
```

### 2. Automatic Test Fixing
```typescript
class TestFixer {
  async fix(failure: TestFailure) {
    switch (failure.type) {
      case 'TIMEOUT':
        return this.increaseTimeout();
      case 'MISSING_MOCK':
        return this.generateMock();
      case 'ASYNC_ERROR':
        return this.fixAsyncHandling();
      case 'IMPORT_ERROR':
        return this.resolveImports();
      case 'SNAPSHOT_MISMATCH':
        return this.updateSnapshot();
    }
  }
}
```

### 3. Test Generation
- Analyze code changes
- Generate unit tests for new functions
- Create integration tests for API endpoints
- Build E2E tests for user flows
- Generate test data factories

## Test Suites

### Unit Tests (Jest)
```typescript
// Example test for resume parser
describe('ResumeParser', () => {
  it('should extract skills from resume', async () => {
    const resume = loadFixture('software-engineer.pdf');
    const parsed = await parser.parse(resume);
    
    expect(parsed.skills).toContain('JavaScript');
    expect(parsed.skills).toContain('React');
    expect(parsed.experience).toHaveLength(3);
  });
  
  it('should handle corrupted files gracefully', async () => {
    const corrupt = loadFixture('corrupted.pdf');
    
    await expect(parser.parse(corrupt))
      .rejects.toThrow('Invalid file format');
  });
});
```

### Integration Tests
```typescript
// API endpoint testing
describe('POST /api/jobs/search', () => {
  it('should return filtered jobs', async () => {
    const response = await request(app)
      .post('/api/jobs/search')
      .send({ 
        query: 'developer',
        location: 'remote' 
      })
      .expect(200);
    
    expect(response.body.jobs).toBeDefined();
    expect(response.body.total).toBeGreaterThan(0);
  });
});
```

### E2E Tests (Playwright)
```typescript
test('user can apply to job', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('[type=submit]');
  
  // Search for job
  await page.goto('/jobs');
  await page.fill('[name=search]', 'software engineer');
  await page.click('button:has-text("Search")');
  
  // Apply to first job
  await page.click('.job-card:first-child button:has-text("Apply")');
  await expect(page).toHaveURL(/\/apply\//);
});
```

## Implementation Tasks

### Setup Phase
1. Configure Jest with TypeScript
2. Set up Playwright for E2E tests
3. Configure test coverage reporting
4. Create test data factories
5. Set up test databases
6. Implement CI/CD test pipeline

### Test Categories
1. **Authentication Tests**
   - Login/logout flows
   - Password reset
   - OAuth providers
   - Session management

2. **Resume Tests**
   - Upload and parsing
   - Version control
   - Tailoring engine
   - Export formats

3. **Job Search Tests**
   - API integrations
   - Search filters
   - Deduplication
   - Pagination

4. **Application Tests**
   - Application creation
   - Status updates
   - Document generation
   - Tracking

5. **Performance Tests**
   - API response times
   - Database query performance
   - Concurrent user handling
   - Memory usage

## Error Prevention
- Pre-commit hooks for tests
- Parallel test execution
- Test isolation
- Mock external services
- Deterministic test data

## Test Fixing Strategies
1. **Flaky Test Detection**
   - Run tests multiple times
   - Identify intermittent failures
   - Fix timing issues
   - Improve test stability

2. **Common Fixes**
   - Update outdated mocks
   - Fix async race conditions
   - Resolve import paths
   - Update snapshots
   - Fix test data issues

## Configuration
```yaml
testing:
  unit:
    runner: jest
    coverage:
      threshold: 80
      reports: ['lcov', 'text']
  
  integration:
    database: test_db
    redis: test_redis
    mockExternalAPIs: true
  
  e2e:
    runner: playwright
    browsers: ['chromium', 'firefox']
    baseUrl: http://localhost:3000
  
  performance:
    tool: k6
    thresholds:
      http_req_duration: ['p(95)<500']
      http_req_failed: ['rate<0.1']
```

## Usage Example
```typescript
// Agent runs all tests automatically
const results = await testRunnerAgent.runTests({
  suites: ['unit', 'integration'],
  fix: true,  // Auto-fix failures
  coverage: true,
  parallel: true
});

// Generate tests for new code
await testRunnerAgent.generateTests({
  file: 'src/services/resumeTailor.ts',
  coverage: 90
});
```

## Continuous Integration
```yaml
# GitHub Actions workflow
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Test Agent
        run: npm run test:agent
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
```

## Success Metrics
- Test coverage > 85%
- Test execution time < 5 minutes
- Flaky test rate < 1%
- Auto-fix success rate > 70%
- Zero production bugs from tested code