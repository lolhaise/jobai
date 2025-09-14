// Jobs Module - Main module that integrates all job-related functionality
// Brings together data pipeline, deduplication, scoring, scheduling, and expiration

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@jobai/database';

// Queue configuration
import { JOB_PIPELINE_QUEUE } from './processors/job-pipeline.processor';

// Services
import { JobDeduplicationService } from './services/job-deduplication.service';
import { JobScoringService } from './services/job-scoring.service';
import { JobSchedulerService } from './services/job-scheduler.service';
import { JobExpirationService } from './services/job-expiration.service';

// Processors
import { JobPipelineProcessor } from './processors/job-pipeline.processor';

// Controllers
import { JobsController } from './controllers/jobs.controller';
import { JobSearchController } from './controllers/job-search.controller';
import { JobAdminController } from './controllers/job-admin.controller';

@Module({
  imports: [
    // Import Prisma for database access
    PrismaModule,
    
    // Import Schedule module for cron jobs
    ScheduleModule.forRoot(),
    
    // Register Bull queue for background processing
    BullModule.registerQueue({
      name: JOB_PIPELINE_QUEUE,
      defaultJobOptions: {
        // Remove completed jobs after 1 hour
        removeOnComplete: {
          age: 3600,
          count: 100,
        },
        // Keep failed jobs for debugging
        removeOnFail: false,
        // Number of retry attempts
        attempts: 3,
        // Exponential backoff for retries
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
  ],
  
  controllers: [
    JobsController,        // Public job endpoints
    JobSearchController,   // Search functionality
    JobAdminController,    // Admin management endpoints
  ],
  
  providers: [
    // Core services
    JobDeduplicationService,
    JobScoringService,
    JobSchedulerService,
    JobExpirationService,
    
    // Background processors
    JobPipelineProcessor,
  ],
  
  exports: [
    // Export services for use in other modules
    JobDeduplicationService,
    JobScoringService,
    JobExpirationService,
  ],
})
export class JobsModule {
  constructor(private readonly schedulerService: JobSchedulerService) {
    // Log module initialization
    console.log('Jobs Module initialized with:');
    console.log('- Unified job schema');
    console.log('- Deduplication algorithm');
    console.log('- Job scoring system');
    console.log('- Background job processor');
    console.log('- Scheduled cron jobs');
    console.log('- Expiration management');
  }
}