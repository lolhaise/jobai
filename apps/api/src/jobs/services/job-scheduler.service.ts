// Job Scheduler Service - Manages cron jobs for automated job updates
// Handles scheduled tasks for fetching, updating, and cleaning job data

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '@jobai/database';
import { 
  JOB_PIPELINE_QUEUE, 
  JobProcessType, 
  JobProcessData 
} from '../processors/job-pipeline.processor';
import { JobSource } from '../schemas/unified-job.schema';

// Configuration for job fetching intervals
interface FetchSchedule {
  // Source API to fetch from
  source: JobSource;
  // Cron expression for scheduling
  cronExpression: string;
  // Whether this schedule is enabled
  enabled: boolean;
  // Maximum jobs to fetch per run
  maxJobs: number;
  // Priority in the queue
  priority: number;
}

// Interface for scheduler statistics
export interface SchedulerStats {
  // Total scheduled runs
  totalRuns: number;
  // Successful runs
  successfulRuns: number;
  // Failed runs
  failedRuns: number;
  // Last run timestamp
  lastRun?: Date;
  // Next scheduled run
  nextRun?: Date;
  // Average processing time
  avgProcessingTime: number;
}

@Injectable()
export class JobSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(JobSchedulerService.name);
  
  // Statistics tracking
  private stats: Map<string, SchedulerStats> = new Map();
  
  // Active job fetching schedules
  private readonly fetchSchedules: FetchSchedule[] = [
    {
      source: JobSource.USAJOBS,
      cronExpression: '0 */2 * * *', // Every 2 hours
      enabled: true,
      maxJobs: 100,
      priority: 1,
    },
    {
      source: JobSource.REMOTEOK,
      cronExpression: '0 */3 * * *', // Every 3 hours
      enabled: true,
      maxJobs: 50,
      priority: 2,
    },
    {
      source: JobSource.REMOTIVE,
      cronExpression: '0 */4 * * *', // Every 4 hours
      enabled: true,
      maxJobs: 50,
      priority: 2,
    },
    {
      source: JobSource.THE_MUSE,
      cronExpression: '0 */6 * * *', // Every 6 hours
      enabled: true,
      maxJobs: 30,
      priority: 3,
    },
  ];

  constructor(
    @InjectQueue(JOB_PIPELINE_QUEUE)
    private readonly jobPipelineQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  /**
   * Initialize the scheduler on module startup
   */
  async onModuleInit() {
    this.logger.log('Initializing job scheduler service');
    
    // Register dynamic cron jobs for each source
    this.registerDynamicSchedules();
    
    // Initialize statistics
    this.initializeStats();
    
    // Load last run information from database
    await this.loadSchedulerState();
  }

  /**
   * Main cron job - Fetch new jobs every 30 minutes
   * This is the primary job that coordinates all API calls
   */
  @Cron(CronExpression.EVERY_30_MINUTES, {
    name: 'fetch-new-jobs',
    timeZone: 'America/New_York',
  })
  async fetchNewJobs() {
    const startTime = Date.now();
    this.logger.log('Starting scheduled job fetch');
    
    try {
      // Update statistics
      this.updateStats('fetch-new-jobs', 'start');
      
      // Check rate limits before fetching
      const canFetch = await this.checkRateLimits();
      if (!canFetch) {
        this.logger.warn('Rate limits exceeded, skipping fetch');
        return;
      }
      
      // Fetch jobs from all enabled sources in parallel
      const fetchPromises = this.fetchSchedules
        .filter(schedule => schedule.enabled)
        .map(schedule => this.fetchFromSource(schedule));
      
      const results = await Promise.allSettled(fetchPromises);
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      this.logger.log(
        `Job fetch completed: ${successful} successful, ${failed} failed sources`
      );
      
      // Update statistics
      this.updateStats('fetch-new-jobs', 'complete', Date.now() - startTime);
    } catch (error) {
      this.logger.error('Error in scheduled job fetch:', error);
      this.updateStats('fetch-new-jobs', 'error');
    }
  }

  /**
   * Daily cleanup - Remove expired jobs
   * Runs every day at 2 AM
   */
  @Cron('0 2 * * *', {
    name: 'cleanup-expired-jobs',
    timeZone: 'America/New_York',
  })
  async cleanupExpiredJobs() {
    this.logger.log('Starting expired jobs cleanup');
    
    try {
      // Update statistics
      this.updateStats('cleanup-expired-jobs', 'start');
      
      // Queue cleanup job
      await this.jobPipelineQueue.add(
        {
          type: JobProcessType.CLEANUP_EXPIRED,
          metadata: {
            scheduledAt: new Date(),
          },
        },
        {
          priority: 10, // Low priority
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      
      this.logger.log('Expired jobs cleanup queued');
      this.updateStats('cleanup-expired-jobs', 'complete');
    } catch (error) {
      this.logger.error('Error scheduling cleanup:', error);
      this.updateStats('cleanup-expired-jobs', 'error');
    }
  }

  /**
   * Hourly job scoring update
   * Updates job scores for active users
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'update-job-scores',
    timeZone: 'America/New_York',
  })
  async updateJobScores() {
    this.logger.log('Starting job score updates');
    
    try {
      // Update statistics
      this.updateStats('update-job-scores', 'start');
      
      // Get active users (logged in within last 7 days)
      const activeUsers = await this.prisma.user.findMany({
        where: {
          lastLogin: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          profile: {
            isNot: null,
          },
        },
        select: { id: true },
      });
      
      this.logger.log(`Updating scores for ${activeUsers.length} active users`);
      
      // Queue score updates for each user
      const scoreJobs = activeUsers.map(user =>
        this.jobPipelineQueue.add(
          {
            type: JobProcessType.SCORE_USER_JOBS,
            userId: user.id,
            metadata: {
              scheduledAt: new Date(),
            },
          },
          {
            priority: 5, // Medium priority
            removeOnComplete: true,
            removeOnFail: false,
            delay: Math.random() * 60000, // Spread over 1 minute
          }
        )
      );
      
      await Promise.all(scoreJobs);
      
      this.logger.log('Job score updates queued');
      this.updateStats('update-job-scores', 'complete');
    } catch (error) {
      this.logger.error('Error updating job scores:', error);
      this.updateStats('update-job-scores', 'error');
    }
  }

  /**
   * Weekly statistics report
   * Runs every Monday at 9 AM
   */
  @Cron('0 9 * * MON', {
    name: 'weekly-stats-report',
    timeZone: 'America/New_York',
  })
  async generateWeeklyReport() {
    this.logger.log('Generating weekly statistics report');
    
    try {
      // Update statistics
      this.updateStats('weekly-stats-report', 'start');
      
      // Gather statistics from the past week
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const stats = await this.prisma.job.aggregate({
        where: {
          createdAt: { gte: weekAgo },
        },
        _count: true,
        _avg: {
          relevanceScore: true,
          qualityScore: true,
        },
      });
      
      const activeJobs = await this.prisma.job.count({
        where: { isActive: true },
      });
      
      const applications = await this.prisma.application.count({
        where: {
          createdAt: { gte: weekAgo },
        },
      });
      
      // Log the report
      this.logger.log('=== Weekly Statistics Report ===');
      this.logger.log(`New jobs added: ${stats._count}`);
      this.logger.log(`Active jobs: ${activeJobs}`);
      this.logger.log(`Applications created: ${applications}`);
      this.logger.log(`Avg relevance score: ${stats._avg.relevanceScore?.toFixed(2) || 'N/A'}`);
      this.logger.log(`Avg quality score: ${stats._avg.qualityScore?.toFixed(2) || 'N/A'}`);
      this.logger.log('=== Scheduler Statistics ===');
      
      // Log scheduler stats
      this.stats.forEach((stat, name) => {
        this.logger.log(
          `${name}: ${stat.successfulRuns}/${stat.totalRuns} successful, ` +
          `avg time: ${stat.avgProcessingTime.toFixed(0)}ms`
        );
      });
      
      // Save report to database for dashboard
      await this.prisma.systemLog.create({
        data: {
          type: 'WEEKLY_REPORT',
          message: 'Weekly statistics generated',
          data: {
            newJobs: stats._count,
            activeJobs,
            applications,
            avgRelevanceScore: stats._avg.relevanceScore,
            avgQualityScore: stats._avg.qualityScore,
            schedulerStats: Object.fromEntries(this.stats),
          },
          level: 'INFO',
        },
      });
      
      this.updateStats('weekly-stats-report', 'complete');
    } catch (error) {
      this.logger.error('Error generating weekly report:', error);
      this.updateStats('weekly-stats-report', 'error');
    }
  }

  /**
   * Real-time job refresh for featured/priority jobs
   * Runs every 15 minutes
   */
  @Cron('*/15 * * * *', {
    name: 'refresh-featured-jobs',
    timeZone: 'America/New_York',
  })
  async refreshFeaturedJobs() {
    this.logger.debug('Refreshing featured jobs');
    
    try {
      // Update statistics
      this.updateStats('refresh-featured-jobs', 'start');
      
      // Get featured jobs that haven't been checked recently
      const featuredJobs = await this.prisma.job.findMany({
        where: {
          isFeatured: true,
          isActive: true,
          lastCheckedAt: {
            lt: new Date(Date.now() - 60 * 60 * 1000), // Not checked in last hour
          },
        },
        select: { id: true, source: true },
        take: 10, // Limit to prevent overload
      });
      
      if (featuredJobs.length === 0) {
        return;
      }
      
      this.logger.log(`Refreshing ${featuredJobs.length} featured jobs`);
      
      // Queue refresh for each job
      const refreshJobs = featuredJobs.map(job =>
        this.jobPipelineQueue.add(
          {
            type: JobProcessType.REFRESH_JOB,
            jobId: job.id,
            source: job.source as JobSource,
            metadata: {
              scheduledAt: new Date(),
              reason: 'featured-refresh',
            },
          },
          {
            priority: 2, // High priority
            removeOnComplete: true,
          }
        )
      );
      
      await Promise.all(refreshJobs);
      
      this.updateStats('refresh-featured-jobs', 'complete');
    } catch (error) {
      this.logger.error('Error refreshing featured jobs:', error);
      this.updateStats('refresh-featured-jobs', 'error');
    }
  }

  // Helper methods

  /**
   * Register dynamic schedules for each job source
   */
  private registerDynamicSchedules() {
    this.fetchSchedules.forEach(schedule => {
      if (!schedule.enabled) {
        return;
      }
      
      // Create a unique job name
      const jobName = `fetch-${schedule.source.toLowerCase()}`;
      
      // Create cron job
      const job = new (require('cron').CronJob)(
        schedule.cronExpression,
        async () => {
          await this.fetchFromSource(schedule);
        },
        null,
        true, // Start immediately
        'America/New_York'
      );
      
      // Register with scheduler
      this.schedulerRegistry.addCronJob(jobName, job);
      
      this.logger.log(
        `Registered schedule for ${schedule.source}: ${schedule.cronExpression}`
      );
    });
  }

  /**
   * Fetch jobs from a specific source
   */
  private async fetchFromSource(schedule: FetchSchedule) {
    this.logger.log(`Fetching jobs from ${schedule.source}`);
    
    try {
      // This would integrate with the job-apis package
      // For now, we'll queue a placeholder job
      await this.jobPipelineQueue.add(
        {
          type: JobProcessType.BATCH_IMPORT,
          source: schedule.source,
          metadata: {
            maxJobs: schedule.maxJobs,
            scheduledAt: new Date(),
          },
        },
        {
          priority: schedule.priority,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      
      this.logger.log(`Queued fetch for ${schedule.source}`);
    } catch (error) {
      this.logger.error(`Error fetching from ${schedule.source}:`, error);
      throw error;
    }
  }

  /**
   * Check if we're within rate limits
   */
  private async checkRateLimits(): Promise<boolean> {
    // Check API rate limits from database or cache
    // This would integrate with the rate limiter from job-apis
    
    // For now, always return true
    return true;
  }

  /**
   * Initialize statistics tracking
   */
  private initializeStats() {
    const statNames = [
      'fetch-new-jobs',
      'cleanup-expired-jobs',
      'update-job-scores',
      'weekly-stats-report',
      'refresh-featured-jobs',
    ];
    
    statNames.forEach(name => {
      this.stats.set(name, {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        avgProcessingTime: 0,
      });
    });
  }

  /**
   * Load scheduler state from database
   */
  private async loadSchedulerState() {
    try {
      // Load last run information from system logs
      const lastRuns = await this.prisma.systemLog.findMany({
        where: {
          type: 'SCHEDULER_RUN',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });
      
      // Update statistics from logs
      lastRuns.forEach(log => {
        const data = log.data as any;
        if (data?.schedulerName && this.stats.has(data.schedulerName)) {
          const stat = this.stats.get(data.schedulerName)!;
          stat.lastRun = new Date(log.createdAt);
        }
      });
      
      this.logger.log('Loaded scheduler state from database');
    } catch (error) {
      this.logger.error('Error loading scheduler state:', error);
    }
  }

  /**
   * Update statistics for a scheduler
   */
  private updateStats(
    schedulerName: string,
    event: 'start' | 'complete' | 'error',
    processingTime?: number
  ) {
    const stat = this.stats.get(schedulerName);
    if (!stat) {
      return;
    }
    
    switch (event) {
      case 'start':
        stat.totalRuns++;
        break;
      case 'complete':
        stat.successfulRuns++;
        if (processingTime) {
          // Update average processing time
          stat.avgProcessingTime = 
            (stat.avgProcessingTime * (stat.successfulRuns - 1) + processingTime) / 
            stat.successfulRuns;
        }
        stat.lastRun = new Date();
        break;
      case 'error':
        stat.failedRuns++;
        break;
    }
    
    // Save to database for persistence
    this.saveSchedulerRun(schedulerName, event, processingTime).catch(error =>
      this.logger.error('Error saving scheduler run:', error)
    );
  }

  /**
   * Save scheduler run to database
   */
  private async saveSchedulerRun(
    schedulerName: string,
    event: string,
    processingTime?: number
  ) {
    await this.prisma.systemLog.create({
      data: {
        type: 'SCHEDULER_RUN',
        message: `Scheduler ${schedulerName} ${event}`,
        data: {
          schedulerName,
          event,
          processingTime,
          timestamp: new Date(),
        },
        level: event === 'error' ? 'ERROR' : 'INFO',
      },
    });
  }

  /**
   * Get scheduler statistics
   */
  getStats(): Map<string, SchedulerStats> {
    return this.stats;
  }

  /**
   * Enable or disable a schedule
   */
  toggleSchedule(source: JobSource, enabled: boolean) {
    const schedule = this.fetchSchedules.find(s => s.source === source);
    if (schedule) {
      schedule.enabled = enabled;
      
      const jobName = `fetch-${source.toLowerCase()}`;
      const job = this.schedulerRegistry.getCronJob(jobName);
      
      if (job) {
        if (enabled) {
          job.start();
        } else {
          job.stop();
        }
      }
      
      this.logger.log(`${source} schedule ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Manually trigger a job fetch
   */
  async manualFetch(source: JobSource) {
    const schedule = this.fetchSchedules.find(s => s.source === source);
    if (schedule) {
      await this.fetchFromSource(schedule);
      this.logger.log(`Manual fetch triggered for ${source}`);
    }
  }
}