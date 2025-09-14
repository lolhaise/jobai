# Testing Guide for Job Application Platform

## Overview

This document provides comprehensive guidance on testing the Job Application Platform. We implement multiple layers of testing to ensure reliability, performance, and security.

## Test Types

### 1. Unit Tests
Tests individual functions and services in isolation.

**Location**: `apps/api/src/**/*.spec.ts`, `apps/web/src/**/*.test.tsx`

**Run**: 
```bash
# Run all unit tests
pnpm test:unit

# Run tests in watch mode
pnpm test -- --watch

# Run with coverage
pnpm test -- --coverage
```

### 2. Integration Tests (E2E)
Tests API endpoints with real database connections.

**Location**: `apps/api/test/*.e2e-spec.ts`

**Run**:
```bash
# Run API integration tests
cd apps/api && pnpm test:e2e

# Run with specific test file
cd apps/api && pnpm test:e2e auth.e2e-spec.ts
```

### 3. End-to-End Tests (Playwright)
Tests full user workflows through the browser.

**Location**: `e2e/*.spec.ts`

**Run**:
```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI mode (interactive)
pnpm test:e2e:ui

# Run specific browser
pnpm playwright test --project=chromium

# Run in headed mode (see browser)
pnpm playwright test --headed
```

### 4. Load Testing
Tests system performance under load.

**Location**: `apps/api/test/load/load.test.js`

**Prerequisites**:
```bash
# Install k6
brew install k6  # macOS
# or
choco install k6  # Windows
```

**Run**:
```bash
# Run load test
pnpm test:load

# Run with custom parameters
k6 run --vus 100 --duration 5m apps/api/test/load/load.test.js

# Run with environment variables
BASE_URL=https://staging.jobai.com k6 run apps/api/test/load/load.test.js
```

### 5. Security Testing
Tests for common vulnerabilities and security best practices.

**Location**: `apps/api/test/security/security.test.js`

**Run**:
```bash
# Run security tests
pnpm test:security

# Run against different environment
BASE_URL=https://staging.jobai.com node apps/api/test/security/security.test.js
```

## Writing Tests

### Unit Test Example
```typescript
// auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should create a user', async () => {
    const user = await service.signup({
      email: 'test@example.com',
      password: 'Test123!',
      name: 'Test User',
    });

    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });
});
```

### E2E Test Example
```typescript
// auth.spec.ts
test('should signup a new user', async ({ page }) => {
  await page.goto('/auth/signup');
  
  await page.getByLabel('Name').fill('Test User');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('Test123!');
  
  await page.getByRole('button', { name: 'Sign Up' }).click();
  
  await expect(page).toHaveURL('/dashboard');
});
```

## Test Coverage Requirements

- **Unit Tests**: Minimum 80% coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user journeys
- **Security Tests**: OWASP Top 10 vulnerabilities

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment

### GitHub Actions Configuration
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: pnpm install
      - name: Run unit tests
        run: pnpm test:unit
      - name: Run E2E tests
        run: pnpm test:e2e
      - name: Run security tests
        run: pnpm test:security
```

## Test Data Management

### Creating Test Data
Use the test helper utilities:

```typescript
import { TestHelper } from './test/utils/test-helpers';

const helper = new TestHelper(app);
const user = await helper.createTestUser();
const resume = await helper.createTestResume(user.id);
```

### Cleaning Test Data
Always clean up after tests:

```typescript
afterAll(async () => {
  await helper.cleanupTestUsers();
  await app.close();
});
```

## Performance Benchmarks

### API Response Times
- Authentication endpoints: < 200ms
- Search endpoints: < 500ms
- File upload: < 2000ms
- Dashboard load: < 1000ms

### Load Test Targets
- Support 100 concurrent users
- Handle 1000 requests/minute
- 95th percentile response time < 500ms
- Error rate < 1%

## Security Test Checklist

- [x] SQL Injection prevention
- [x] XSS protection
- [x] CSRF protection
- [x] Authentication/Authorization
- [x] Input validation
- [x] Rate limiting
- [x] Security headers
- [x] Password security
- [x] File upload validation
- [x] Information disclosure prevention

## Debugging Tests

### Running Tests in Debug Mode
```bash
# Debug unit tests
node --inspect-brk ./node_modules/.bin/jest --runInBand

# Debug E2E tests
PWDEBUG=1 pnpm test:e2e

# Debug with VS Code
# Add breakpoints and use "Debug: JavaScript Debug Terminal"
```

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env

2. **Port Already in Use**
   - Kill existing processes: `lsof -i :3000` (macOS/Linux)
   - Change port in configuration

3. **Playwright Browser Issues**
   - Install browsers: `pnpm playwright install`
   - Update browsers: `pnpm playwright install --with-deps`

## Test Reports

### Generating Reports

```bash
# Jest coverage report
pnpm test -- --coverage --coverageReporters=html

# Playwright HTML report
pnpm test:e2e --reporter=html

# Load test report
k6 run --out json=report.json apps/api/test/load/load.test.js
```

### Viewing Reports
- Jest Coverage: Open `coverage/index.html`
- Playwright: Run `pnpm playwright show-report`
- Load Test: Use k6 cloud or Grafana

## Best Practices

1. **Write tests first** (TDD approach)
2. **Keep tests independent** - No shared state
3. **Use descriptive names** - Test name should explain what it tests
4. **Mock external services** - Don't call real APIs in unit tests
5. **Test edge cases** - Empty data, nulls, large inputs
6. **Clean up after tests** - Remove test data
7. **Use factories** - Consistent test data generation
8. **Parallelize when possible** - Speed up test runs
9. **Monitor flaky tests** - Fix or remove unreliable tests
10. **Document complex tests** - Add comments for complex logic

## Quick Commands Reference

```bash
# Run all tests
pnpm test:all

# Unit tests only
pnpm test:unit

# E2E tests only
pnpm test:e2e

# Load tests
pnpm test:load

# Security tests
pnpm test:security

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test -- --coverage

# Update snapshots
pnpm test -- -u

# Run specific test file
pnpm test auth.spec.ts

# Debug mode
PWDEBUG=1 pnpm test:e2e
```

## Continuous Improvement

- Review test coverage weekly
- Update tests when features change
- Add tests for bug fixes
- Performance test before major releases
- Security test quarterly
- Load test before scaling events