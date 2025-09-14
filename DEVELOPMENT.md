# Development Guide

## Quick Start

```bash
# Install dependencies
pnpm install

# Start Docker services
docker-compose up -d

# Setup database
cd packages/database
pnpm prisma migrate dev
cd ../..

# Start development servers
pnpm dev
```

## Development Workflow

### 1. Database Changes

When modifying the database schema:

```bash
cd packages/database
# Edit prisma/schema.prisma
pnpm prisma migrate dev --name describe-your-change
pnpm prisma generate
```

### 2. API Development

The backend API is built with NestJS:

```bash
# Run only the API
pnpm --filter @jobai/api dev

# Generate a new module
cd apps/api
npx nest g module modules/feature-name
npx nest g controller modules/feature-name
npx nest g service modules/feature-name
```

### 3. Frontend Development

```bash
# Run only the frontend
pnpm --filter @jobai/web dev

# Create a new page
# Add file to apps/web/src/app/your-page/page.tsx
```

### 4. Shared Packages

When modifying shared packages, rebuild them:

```bash
# Build specific package
pnpm --filter @jobai/shared build

# Build all packages
pnpm build --filter "./packages/*"
```

## Testing

### Unit Tests

```bash
# Test all packages
pnpm test

# Test specific package
pnpm --filter @jobai/api test

# Test with coverage
pnpm --filter @jobai/api test:cov
```

### E2E Tests

```bash
cd apps/api
pnpm test:e2e
```

## Code Quality

### Linting

```bash
# Lint all code
pnpm lint

# Lint and fix
pnpm lint --fix
```

### Type Checking

```bash
# Check all TypeScript
pnpm type-check

# Check specific package
pnpm --filter @jobai/web type-check
```

### Formatting

```bash
# Format all code
pnpm prettier --write .

# Check formatting
pnpm prettier --check .
```

## Debugging

### Backend Debugging

1. Add debugger statement or breakpoint
2. Run with inspect:
```bash
cd apps/api
node --inspect-brk -r ts-node/register src/main.ts
```
3. Attach VS Code debugger

### Frontend Debugging

1. Use Chrome DevTools
2. Add `debugger` statements
3. Use React Developer Tools

### Database Debugging

```bash
# Open Prisma Studio
cd packages/database
pnpm prisma studio

# View PostgreSQL logs
docker logs jobai-postgres-1
```

## Common Issues

### Port Already in Use

```bash
# Find process using port
lsof -i :4000  # Mac/Linux
netstat -ano | findstr :4000  # Windows

# Kill process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows
```

### Database Connection Issues

```bash
# Restart Docker services
docker-compose restart

# Reset database
cd packages/database
pnpm prisma migrate reset
```

### Dependency Issues

```bash
# Clear all node_modules
pnpm clean
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

# Reinstall
pnpm install
```

## Performance Optimization

### Bundle Analysis

```bash
# Analyze Next.js bundle
cd apps/web
pnpm build
pnpm analyze
```

### Database Queries

Use Prisma's query logging:

```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

## Deployment Preparation

### Build for Production

```bash
# Build everything
pnpm build

# Test production build locally
pnpm start
```

### Environment Variables

Ensure all required environment variables are set:

```bash
# Check required variables
node scripts/check-env.js
```

## Git Workflow

### Commit Convention

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Tests
- `chore:` Maintenance

### Branch Strategy

- `main` - Production ready code
- `develop` - Development branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Turborepo Documentation](https://turbo.build/repo/docs)