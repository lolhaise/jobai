# JobAI Platform Deployment Guide

## Table of Contents
1. [Infrastructure Overview](#infrastructure-overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Options](#deployment-options)
4. [Production Setup](#production-setup)
5. [Environment Configuration](#environment-configuration)
6. [Security Checklist](#security-checklist)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

## Infrastructure Overview

The JobAI platform consists of the following components:

- **Frontend (Next.js)**: Deployed on Vercel
- **Backend API (NestJS)**: Deployed on Railway/Render/AWS ECS
- **Database (PostgreSQL)**: Hosted on Supabase/Neon
- **Cache (Redis)**: Hosted on Upstash
- **File Storage**: AWS S3/Cloudinary
- **CDN**: Cloudflare/CloudFront
- **Email**: SendGrid/AWS SES
- **Monitoring**: Sentry, New Relic, PostHog

## Prerequisites

### Required Tools
- Node.js 20+ and pnpm 8+
- Docker and Docker Compose
- Git
- SSL certificates (Let's Encrypt recommended)
- Domain name with DNS control

### Required Accounts
- Vercel account (for frontend)
- Railway/Render account (for backend)
- Supabase/Neon account (for database)
- Upstash account (for Redis)
- OpenAI API key
- Email service provider account
- Monitoring service accounts

## Deployment Options

### Option 1: Managed Cloud Services (Recommended)

**Pros**: Minimal maintenance, auto-scaling, built-in monitoring
**Cons**: Higher cost at scale

```bash
# Frontend deployment to Vercel
vercel --prod

# Backend deployment to Railway
railway up
```

### Option 2: Self-Hosted with Docker

**Pros**: Full control, lower cost at scale
**Cons**: Requires DevOps expertise

```bash
# Deploy with Docker Compose
docker-compose -f infrastructure/docker-compose.prod.yml up -d
```

### Option 3: Kubernetes Deployment

**Pros**: Maximum scalability, cloud-agnostic
**Cons**: Complex setup and management

```bash
# Deploy to Kubernetes
kubectl apply -f infrastructure/k8s/
```

## Production Setup

### Step 1: Clone and Configure Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/jobai.git
cd jobai

# Install dependencies
pnpm install

# Copy environment template
cp .env.production.example .env.production
```

### Step 2: Configure Environment Variables

Edit `.env.production` with your values:

```bash
# Essential configurations
DATABASE_URL=your_database_url
REDIS_URL=your_redis_url
NEXTAUTH_SECRET=generate_with_openssl
JWT_SECRET=generate_with_openssl
OPENAI_API_KEY=your_openai_key
```

### Step 3: Set Up Database

```bash
# Run database migrations
pnpm prisma:migrate:deploy

# Seed initial data (optional)
pnpm prisma:seed
```

### Step 4: Build Applications

```bash
# Build all packages
pnpm build

# Or build specific apps
pnpm build --filter=@jobai/web
pnpm build --filter=@jobai/api
```

### Step 5: Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
cd apps/web
vercel --prod

# Set environment variables in Vercel dashboard
# Or use CLI:
vercel env add NEXTAUTH_SECRET production
vercel env add DATABASE_URL production
# ... add all required env vars
```

### Step 6: Deploy Backend to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project
cd apps/api
railway init

# Deploy
railway up

# Set environment variables
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=$DATABASE_URL
# ... set all required variables
```

### Step 7: Configure DNS

Add the following DNS records:

```
A     @              -> Vercel IP
CNAME www           -> cname.vercel-dns.com
A     api           -> Railway/Backend IP
CNAME cdn          -> CDN endpoint
```

### Step 8: Set Up SSL Certificates

For managed services (Vercel, Railway), SSL is automatic.

For self-hosted:
```bash
# Install Certbot
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d jobai.app -d www.jobai.app -d api.jobai.app

# Auto-renewal
sudo certbot renew --dry-run
```

## Environment Configuration

### Database Configuration

```bash
# Supabase connection string
DATABASE_URL=postgres://[user]:[password]@[host]:5432/postgres?pgbouncer=true

# Connection pool settings
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### Redis Configuration

```bash
# Upstash Redis
REDIS_URL=redis://default:[password]@[endpoint]:6379
REDIS_TLS=true
```

### Email Configuration

```bash
# SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
```

### CDN Configuration

```bash
# Cloudflare CDN
CDN_URL=https://cdn.jobai.app
CDN_ZONE_ID=your_zone_id
CDN_API_TOKEN=your_api_token
```

## Security Checklist

### Pre-Deployment
- [ ] Generate strong secrets for all auth tokens
- [ ] Enable 2FA on all service accounts
- [ ] Review and update security headers
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable SQL injection protection
- [ ] Configure CSP headers
- [ ] Set up DDoS protection (Cloudflare)

### Post-Deployment
- [ ] Run security audit: `pnpm audit`
- [ ] Test SSL configuration: https://www.ssllabs.com/ssltest/
- [ ] Verify security headers: https://securityheaders.com/
- [ ] Check for exposed secrets: `git secrets --scan`
- [ ] Enable monitoring and alerts
- [ ] Set up automated backups
- [ ] Configure log aggregation
- [ ] Test disaster recovery plan

## Monitoring & Maintenance

### Health Checks

```bash
# Check web app health
curl https://jobai.app/api/health

# Check API health
curl https://api.jobai.app/health

# Check database connection
pnpm prisma:studio
```

### Monitoring Setup

1. **Application Monitoring (Sentry)**
```javascript
// Configure in apps/web/src/lib/sentry.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 0.1,
});
```

2. **Performance Monitoring (New Relic)**
```javascript
// Configure in apps/api/src/main.ts
require('newrelic');
```

3. **Analytics (PostHog)**
```javascript
// Configure in apps/web/src/lib/posthog.ts
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: 'https://app.posthog.com',
});
```

### Backup Strategy

```bash
# Automated daily backups
0 2 * * * /scripts/backup.sh

# Manual backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh backup_20240101_020000.sql.gz
```

### Update Process

```bash
# 1. Test updates in staging
git checkout staging
git pull origin main
pnpm test

# 2. Deploy to staging
./scripts/deploy.sh staging

# 3. Run tests
pnpm test:e2e

# 4. Deploy to production
./scripts/deploy.sh production main

# 5. Monitor for issues
tail -f logs/app.log
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check connection
pnpm prisma:studio

# Reset connection pool
pnpm prisma:generate
```

#### Redis Connection Issues
```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping

# Clear cache
redis-cli -u $REDIS_URL FLUSHALL
```

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next node_modules
pnpm install
pnpm build
```

#### Memory Issues
```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm build
```

### Rollback Procedure

```bash
# 1. Identify last working version
git log --oneline

# 2. Checkout previous version
git checkout <commit-hash>

# 3. Deploy previous version
./scripts/deploy.sh production <commit-hash>

# 4. Restore database if needed
./scripts/restore.sh last_working_backup.sql.gz
```

### Emergency Contacts

- **DevOps Lead**: devops@jobai.app
- **Security Team**: security@jobai.app
- **Database Admin**: dba@jobai.app
- **On-Call Engineer**: oncall@jobai.app

## Performance Optimization

### Frontend Optimization
- Enable image optimization
- Implement code splitting
- Use CDN for static assets
- Enable gzip/brotli compression
- Implement service worker caching

### Backend Optimization
- Use connection pooling
- Implement query caching
- Enable response compression
- Use database indexes
- Implement rate limiting

### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_applications_user_status ON applications(user_id, status);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM jobs WHERE location = 'Remote';
```

## Scaling Guidelines

### Horizontal Scaling
```yaml
# docker-compose.prod.yml
services:
  api:
    scale: 3  # Run 3 API instances
  web:
    scale: 2  # Run 2 web instances
```

### Vertical Scaling
```yaml
# Increase resources
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

### Auto-scaling (Kubernetes)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Support

For deployment support:
- Documentation: https://docs.jobai.app
- GitHub Issues: https://github.com/yourusername/jobai/issues
- Discord: https://discord.gg/jobai
- Email: support@jobai.app