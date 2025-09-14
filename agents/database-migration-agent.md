# Database Migration Agent

## Purpose
Specialized agent for managing Prisma migrations, schema changes, and database operations ensuring data integrity and zero-downtime deployments.

## Capabilities
- Manages Prisma schema evolution
- Handles safe migration rollbacks
- Generates and maintains seed data
- Validates schema changes before applying
- Manages database backups before migrations
- Handles multi-environment migrations
- Resolves migration conflicts
- Optimizes database performance post-migration

## Core Functions

### 1. Migration Management
```typescript
interface MigrationTask {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  schema: string;
  rollbackPlan: string;
  validations: ValidationCheck[];
  environments: Environment[];
}
```

### 2. Schema Validation
- Check for breaking changes
- Validate data types and constraints
- Ensure indexes are properly defined
- Verify foreign key relationships
- Test migration on staging first

### 3. Safe Migration Process
```typescript
class SafeMigration {
  async execute() {
    // 1. Backup current database
    await this.backupDatabase();
    
    // 2. Validate new schema
    await this.validateSchema();
    
    // 3. Run migration in transaction
    await this.runMigration();
    
    // 4. Verify data integrity
    await this.verifyIntegrity();
    
    // 5. Update documentation
    await this.updateDocs();
  }
}
```

### 4. Seed Data Management
- Generate realistic test data
- Maintain seed data versions
- Environment-specific seeds
- Anonymize production data for dev

## Implementation Tasks

### Setup Phase
1. Configure Prisma with TypeScript
2. Set up migration tracking system
3. Create backup automation
4. Implement rollback mechanism
5. Build validation pipeline
6. Create migration testing framework

### Database Schema
```prisma
// Core models for job automation platform
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  resumes       Resume[]
  applications  Application[]
  preferences   UserPreference?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Resume {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  version       Int       @default(1)
  content       Json
  parsedData    Json?
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Job {
  id            String    @id @default(cuid())
  externalId    String
  source        String
  title         String
  company       String
  location      String?
  remote        Boolean   @default(false)
  salary        Json?
  description   String    @db.Text
  requirements  String[]
  applicationUrl String
  postedAt      DateTime
  expiresAt     DateTime?
  applications  Application[]
  
  @@unique([externalId, source])
  @@index([title, company])
  @@index([postedAt])
}

model Application {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  jobId         String
  job           Job       @relation(fields: [jobId], references: [id])
  resumeVersion String
  status        ApplicationStatus @default(PENDING)
  tailoredResume Json?
  coverLetter   String?   @db.Text
  appliedAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([userId, status])
}

enum ApplicationStatus {
  PENDING
  APPLIED
  REVIEWING
  INTERVIEWED
  REJECTED
  OFFERED
  ACCEPTED
}
```

### Migration Scripts
1. **Initial setup migration**
2. **Add user preferences table**
3. **Add job matching scores**
4. **Add API usage tracking**
5. **Add notification system**
6. **Add analytics tables**

### Rollback Procedures
- Automated rollback on failure
- Manual rollback commands
- Data recovery procedures
- Version pinning capability

## Error Prevention
- Test migrations on copy of production
- Use database transactions
- Implement health checks post-migration
- Maintain migration logs
- Alert on migration failures

## Testing Strategy
- Test migrations on all environments
- Verify data integrity checks
- Test rollback procedures
- Performance impact testing
- Load test after migrations

## Configuration
```yaml
database:
  migration:
    autoMigrate: false  # Require manual approval
    backup:
      enabled: true
      retention: 30  # days
    validation:
      enabled: true
      strict: true
    environments:
      - development
      - staging
      - production
```

## Usage Example
```typescript
// Agent handles all migration complexity
await databaseMigrationAgent.migrate({
  schema: './prisma/schema.prisma',
  environment: 'staging',
  backup: true,
  dryRun: true  // Test first
});

// Seed data management
await databaseMigrationAgent.seed({
  users: 100,
  jobs: 1000,
  applications: 500
});
```

## Monitoring & Alerts
- Migration duration tracking
- Schema drift detection
- Table size monitoring
- Index usage analysis
- Query performance tracking

## Success Metrics
- Zero-downtime migrations
- Migration success rate > 99%
- Rollback time < 5 minutes
- Data integrity maintained 100%
- Migration time < 30 seconds