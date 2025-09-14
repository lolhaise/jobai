// Background Job Processor - Handles asynchronous job processing tasks
// Uses Bull queue for reliable background processing

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '@jobai/database';
import { JobDeduplicationService } from '../services/job-deduplication.service';
import { JobScoringService, UserPreferences } from '../services/job-scoring.service';
import { UnifiedJob, JobSource } from '../schemas/unified-job.schema';

// Queue name for job processing
export const JOB_PIPELINE_QUEUE = 'job-pipeline';

// Job types that can be processed
export enum JobProcessType {
  // Process new jobs from API
  PROCESS_NEW_JOBS = 'PROCESS_NEW_JOBS',
  // Update existing job
  UPDATE_JOB = 'UPDATE_JOB',
  // Score jobs for a user
  SCORE_USER_JOBS = 'SCORE_USER_JOBS',
  // Clean up expired jobs
  CLEANUP_EXPIRED = 'CLEANUP_EXPIRED',
  // Refresh job data from source
  REFRESH_JOB = 'REFRESH_JOB',
  // Batch import jobs
  BATCH_IMPORT = 'BATCH_IMPORT',
}

// Interface for job processing data
export interface JobProcessData {
  // Type of processing to perform
  type: JobProcessType;
  // Jobs to process (for new jobs)
  jobs?: UnifiedJob[];
  // Job ID (for updates)
  jobId?: string;
  // User ID (for scoring)
  userId?: string;
  // Source API (for refresh)
  source?: JobSource;
  // Additional metadata
  metadata?: Record<string, any>;
}

// Interface for processing results
interface ProcessingResult {
  // Number of jobs processed
  processed: number;
  // Number of new jobs added
  added: number;
  // Number of duplicates found
  duplicates: number;
  // Number of jobs updated
  updated: number;
  // Number of errors
  errors: number;
  // Processing time in ms
  duration: number;
  // Error details if any
  errorDetails?: Array<{
    job: string;
    error: string;
  }>;
}

@Processor(JOB_PIPELINE_QUEUE)
export class JobPipelineProcessor {
  private readonly logger = new Logger(JobPipelineProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deduplicationService: JobDeduplicationService,
    private readonly scoringService: JobScoringService,
  ) {}

  /**
   * Main job processor - handles all job types
   */
  @Process()
  async processJob(job: Job<JobProcessData>): Promise<ProcessingResult> {
    const startTime = Date.now();
    this.logger.log(`Processing job ${job.id} of type ${job.data.type}`);

    try {
      // Route to appropriate processor based on job type
      switch (job.data.type) {
        case JobProcessType.PROCESS_NEW_JOBS:
          return await this.processNewJobs(job.data);
        case JobProcessType.UPDATE_JOB:
          return await this.updateJob(job.data);
        case JobProcessType.SCORE_USER_JOBS:
          return await this.scoreUserJobs(job.data);
        case JobProcessType.CLEANUP_EXPIRED:
          return await this.cleanupExpiredJobs();
        case JobProcessType.REFRESH_JOB:
          return await this.refreshJob(job.data);
        case JobProcessType.BATCH_IMPORT:
          return await this.batchImportJobs(job.data);
        default:
          throw new Error(`Unknown job type: ${job.data.type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing job ${job.id}:`, error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logger.log(`Job ${job.id} completed in ${duration}ms`);
    }
  }

  /**
   * Process new jobs from API sources
   */
  private async processNewJobs(data: JobProcessData): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processed: 0,
      added: 0,
      duplicates: 0,
      updated: 0,
      errors: 0,
      duration: 0,
      errorDetails: [],
    };

    if (!data.jobs || data.jobs.length === 0) {
      return result;
    }

    const startTime = Date.now();

    // Process jobs in batches for better performance
    const batchSize = 10;
    const batches = this.createBatches(data.jobs, batchSize);

    for (const batch of batches) {
      await this.processBatch(batch, result);
    }

    result.duration = Date.now() - startTime;
    
    this.logger.log(
      `Processed ${result.processed} jobs: ` +
      `${result.added} added, ${result.duplicates} duplicates, ` +
      `${result.updated} updated, ${result.errors} errors`
    );

    return result;
  }

  /**
   * Process a batch of jobs
   */
  private async processBatch(
    jobs: UnifiedJob[],
    result: ProcessingResult
  ): Promise<void> {
    // Get existing jobs for deduplication check
    const existingJobs = await this.getExistingJobsForDeduplication(jobs);

    for (const job of jobs) {
      try {
        result.processed++;

        // Generate deduplication hash
        job.deduplicationHash = this.deduplicationService.generateDeduplicationHash(job);

        // Check for duplicates
        const dedupeResult = await this.deduplicationService.checkForDuplicates(
          job,
          existingJobs
        );

        if (dedupeResult.isDuplicate) {
          result.duplicates++;
          
          // Update duplicate metadata
          await this.updateDuplicateJob(job, dedupeResult.parentJobId!);
          
          this.logger.debug(
            `Duplicate found: ${job.title} at ${job.company.name} ` +
            `(confidence: ${dedupeResult.confidence}%)`
          );
        } else {
          // Add new job to database
          await this.addNewJob(job);
          result.added++;
          
          // Add to existing jobs for subsequent checks
          existingJobs.push(job);
        }
      } catch (error) {
        result.errors++;
        result.errorDetails?.push({
          job: `${job.title} at ${job.company.name}`,
          error: error instanceof Error ? error.message : String(error),
        });
        this.logger.error(`Error processing job ${job.id}:`, error);
      }
    }
  }

  /**
   * Update an existing job
   */
  private async updateJob(data: JobProcessData): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processed: 1,
      added: 0,
      duplicates: 0,
      updated: 0,
      errors: 0,
      duration: 0,
    };

    const startTime = Date.now();

    try {
      if (!data.jobId) {
        throw new Error('Job ID is required for update');
      }

      // Fetch current job data
      const currentJob = await this.prisma.job.findUnique({
        where: { id: data.jobId },
      });

      if (!currentJob) {
        throw new Error(`Job ${data.jobId} not found`);
      }

      // Update job with new data
      await this.prisma.job.update({
        where: { id: data.jobId },
        data: {
          updatedAt: new Date(),
          // Update other fields as needed from data.metadata
          ...data.metadata,
        },
      });

      result.updated = 1;
    } catch (error) {
      result.errors = 1;
      this.logger.error(`Error updating job ${data.jobId}:`, error);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Score jobs for a specific user
   */
  private async scoreUserJobs(data: JobProcessData): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processed: 0,
      added: 0,
      duplicates: 0,
      updated: 0,
      errors: 0,
      duration: 0,
    };

    const startTime = Date.now();

    try {
      if (!data.userId) {
        throw new Error('User ID is required for scoring');
      }

      // Fetch user preferences
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
        include: { profile: true },
      });

      if (!user || !user.profile) {
        throw new Error(`User profile not found for ${data.userId}`);
      }

      // Convert profile to UserPreferences
      const preferences: UserPreferences = {
        desiredTitles: user.profile.desiredTitles || [],
        skills: user.profile.skills || [],
        experienceYears: user.profile.experienceYears || 0,
        salaryMin: user.profile.salaryMin || undefined,
        salaryMax: user.profile.salaryMax || undefined,
        preferredLocations: user.profile.preferredLocations || [],
        remotePreference: user.profile.remotePreference as any,
      };

      // Fetch active jobs to score
      const jobs = await this.prisma.job.findMany({
        where: {
          isActive: true,
          expiresAt: {
            gt: new Date(), // Not expired
          },
        },
        take: 100, // Limit to prevent overwhelming
      });

      // Score each job
      for (const job of jobs) {
        try {
          // Convert to UnifiedJob format
          const unifiedJob = this.convertToUnifiedJob(job);
          
          // Calculate score
          const score = await this.scoringService.scoreJob(unifiedJob, preferences);
          
          // Save score to database
          await this.prisma.jobScore.upsert({
            where: {
              userId_jobId: {
                userId: data.userId,
                jobId: job.id,
              },
            },
            create: {
              userId: data.userId,
              jobId: job.id,
              score: score.overall,
              scoreDetails: score as any,
            },
            update: {
              score: score.overall,
              scoreDetails: score as any,
              updatedAt: new Date(),
            },
          });

          result.processed++;
        } catch (error) {
          result.errors++;
          this.logger.error(`Error scoring job ${job.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error(`Error in scoreUserJobs:`, error);
      throw error;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Clean up expired jobs
   */
  private async cleanupExpiredJobs(): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processed: 0,
      added: 0,
      duplicates: 0,
      updated: 0,
      errors: 0,
      duration: 0,
    };

    const startTime = Date.now();

    try {
      // Find expired jobs
      const expiredJobs = await this.prisma.job.findMany({
        where: {
          OR: [
            // Jobs with expiration date passed
            {
              expiresAt: {
                lt: new Date(),
              },
            },
            // Jobs older than 60 days without expiration
            {
              expiresAt: null,
              postedAt: {
                lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
              },
            },
          ],
          isActive: true, // Only deactivate active jobs
        },
        select: { id: true, title: true, companyName: true },
      });

      // Deactivate expired jobs in batches
      const batchSize = 100;
      const batches = this.createBatches(expiredJobs, batchSize);

      for (const batch of batches) {
        const ids = batch.map(j => j.id);
        
        await this.prisma.job.updateMany({
          where: { id: { in: ids } },
          data: { 
            isActive: false,
            updatedAt: new Date(),
          },
        });

        result.processed += batch.length;
        result.updated += batch.length;
      }

      this.logger.log(`Deactivated ${result.updated} expired jobs`);
    } catch (error) {
      result.errors++;
      this.logger.error('Error cleaning up expired jobs:', error);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Refresh job data from source API
   */
  private async refreshJob(data: JobProcessData): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processed: 1,
      added: 0,
      duplicates: 0,
      updated: 0,
      errors: 0,
      duration: 0,
    };

    const startTime = Date.now();

    try {
      if (!data.jobId) {
        throw new Error('Job ID is required for refresh');
      }

      // Fetch current job
      const job = await this.prisma.job.findUnique({
        where: { id: data.jobId },
      });

      if (!job) {
        throw new Error(`Job ${data.jobId} not found`);
      }

      // TODO: Call appropriate API to refresh job data
      // This would integrate with the job-apis package
      
      // For now, just update the lastCheckedAt timestamp
      await this.prisma.job.update({
        where: { id: data.jobId },
        data: {
          lastCheckedAt: new Date(),
        },
      });

      result.updated = 1;
      this.logger.log(`Refreshed job ${data.jobId}`);
    } catch (error) {
      result.errors = 1;
      this.logger.error(`Error refreshing job ${data.jobId}:`, error);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Batch import jobs from external source
   */
  private async batchImportJobs(data: JobProcessData): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processed: 0,
      added: 0,
      duplicates: 0,
      updated: 0,
      errors: 0,
      duration: 0,
    };

    const startTime = Date.now();

    try {
      if (!data.jobs || data.jobs.length === 0) {
        return result;
      }

      // Process in larger batches for import
      const batchSize = 50;
      const batches = this.createBatches(data.jobs, batchSize);

      for (const batch of batches) {
        // Use transaction for batch import
        await this.prisma.$transaction(async (tx) => {
          await this.processBatchWithTransaction(batch, result, tx);
        });
      }

      this.logger.log(
        `Batch imported ${result.added} jobs, ` +
        `found ${result.duplicates} duplicates`
      );
    } catch (error) {
      this.logger.error('Error in batch import:', error);
      throw error;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  // Helper methods

  /**
   * Create batches from array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get existing jobs for deduplication
   */
  private async getExistingJobsForDeduplication(
    newJobs: UnifiedJob[]
  ): Promise<UnifiedJob[]> {
    // Extract companies and date range for efficient querying
    const companies = [...new Set(newJobs.map(j => j.company.name))];
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Fetch potentially matching jobs
    const existingJobs = await this.prisma.job.findMany({
      where: {
        companyName: { in: companies },
        postedAt: { gte: oneMonthAgo },
        isActive: true,
      },
    });

    // Convert to UnifiedJob format
    return existingJobs.map(job => this.convertToUnifiedJob(job));
  }

  /**
   * Add new job to database
   */
  private async addNewJob(job: UnifiedJob): Promise<void> {
    await this.prisma.job.create({
      data: {
        externalId: job.externalId,
        source: job.source,
        title: job.title,
        normalizedTitle: job.normalizedTitle,
        description: job.description,
        summary: job.summary,
        companyName: job.company.name,
        companyWebsite: job.company.website,
        companyLogo: job.company.logo,
        locationCity: job.location.city,
        locationState: job.location.state,
        locationCountry: job.location.country,
        remoteOption: job.remoteOption,
        jobType: job.jobType,
        experienceLevel: job.experienceLevel,
        salaryMin: job.salary?.min,
        salaryMax: job.salary?.max,
        salaryCurrency: job.salary?.currency,
        applicationUrl: job.application.url,
        applicationDeadline: job.application.deadline,
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        categories: job.categories,
        postedAt: job.postedAt,
        updatedAt: job.updatedAt,
        expiresAt: job.expiresAt,
        isActive: job.isActive,
        isFeatured: job.isFeatured,
        deduplicationHash: job.deduplicationHash,
        rawData: job.rawData as any,
      },
    });
  }

  /**
   * Update duplicate job metadata
   */
  private async updateDuplicateJob(
    job: UnifiedJob,
    parentJobId: string
  ): Promise<void> {
    // Record the duplicate relationship
    await this.prisma.jobDuplicate.create({
      data: {
        duplicateJobId: job.id,
        parentJobId: parentJobId,
        source: job.source,
        confidence: 0, // Will be updated with actual confidence
        detectedAt: new Date(),
      },
    });
  }

  /**
   * Convert database job to UnifiedJob format
   */
  private convertToUnifiedJob(dbJob: any): UnifiedJob {
    return {
      id: dbJob.id,
      externalId: dbJob.externalId,
      source: dbJob.source,
      title: dbJob.title,
      normalizedTitle: dbJob.normalizedTitle,
      description: dbJob.description,
      summary: dbJob.summary,
      company: {
        name: dbJob.companyName,
        website: dbJob.companyWebsite,
        logo: dbJob.companyLogo,
        size: dbJob.companySize,
        industry: dbJob.companyIndustry,
        description: dbJob.companyDescription,
        rating: dbJob.companyRating,
      },
      location: {
        city: dbJob.locationCity,
        state: dbJob.locationState,
        country: dbJob.locationCountry,
        postalCode: dbJob.locationPostalCode,
        address: dbJob.locationAddress,
        latitude: dbJob.locationLatitude,
        longitude: dbJob.locationLongitude,
        required: dbJob.locationRequired ?? true,
      },
      remoteOption: dbJob.remoteOption,
      jobType: dbJob.jobType,
      experienceLevel: dbJob.experienceLevel,
      salary: dbJob.salaryMin || dbJob.salaryMax ? {
        min: dbJob.salaryMin,
        max: dbJob.salaryMax,
        currency: dbJob.salaryCurrency || 'USD',
        period: dbJob.salaryPeriod || 'YEARLY',
        negotiable: dbJob.salaryNegotiable ?? false,
      } : undefined,
      application: {
        url: dbJob.applicationUrl,
        email: dbJob.applicationEmail,
        deadline: dbJob.applicationDeadline,
        instructions: dbJob.applicationInstructions,
        easyApply: dbJob.easyApply ?? false,
        requiredDocuments: dbJob.requiredDocuments || [],
      },
      benefits: dbJob.benefits,
      requiredSkills: dbJob.requiredSkills || [],
      preferredSkills: dbJob.preferredSkills || [],
      categories: dbJob.categories || [],
      postedAt: dbJob.postedAt,
      updatedAt: dbJob.updatedAt,
      expiresAt: dbJob.expiresAt,
      isActive: dbJob.isActive,
      isFeatured: dbJob.isFeatured,
      applicantCount: dbJob.applicantCount,
      relevanceScore: dbJob.relevanceScore ?? 0,
      qualityScore: dbJob.qualityScore ?? 0,
      deduplicationHash: dbJob.deduplicationHash,
      rawData: dbJob.rawData,
      metadata: {
        firstSeenAt: dbJob.firstSeenAt || dbJob.createdAt,
        lastCheckedAt: dbJob.lastCheckedAt || dbJob.updatedAt,
        checkCount: dbJob.checkCount ?? 1,
        isDuplicate: false,
        parentJobId: undefined,
      },
    } as UnifiedJob;
  }

  /**
   * Process batch with transaction
   */
  private async processBatchWithTransaction(
    jobs: UnifiedJob[],
    result: ProcessingResult,
    tx: any
  ): Promise<void> {
    for (const job of jobs) {
      try {
        // Check if job already exists
        const existing = await tx.job.findFirst({
          where: {
            externalId: job.externalId,
            source: job.source,
          },
        });

        if (existing) {
          result.duplicates++;
          continue;
        }

        // Add new job
        await tx.job.create({
          data: {
            externalId: job.externalId,
            source: job.source,
            title: job.title,
            normalizedTitle: job.normalizedTitle,
            description: job.description,
            summary: job.summary,
            companyName: job.company.name,
            locationCountry: job.location.country,
            remoteOption: job.remoteOption,
            jobType: job.jobType,
            experienceLevel: job.experienceLevel,
            applicationUrl: job.application.url,
            postedAt: job.postedAt,
            isActive: true,
            deduplicationHash: job.deduplicationHash,
          },
        });

        result.added++;
      } catch (error) {
        result.errors++;
        this.logger.error(`Error importing job:`, error);
      }
      
      result.processed++;
    }
  }
}