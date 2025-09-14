// Job Expiration Service - Manages job lifecycle and expiration policies
// Automatically expires stale jobs and maintains data freshness

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@jobai/database';
import { JobSource } from '../schemas/unified-job.schema';

// Expiration rules for different job sources
interface ExpirationRule {
  // Source this rule applies to
  source: JobSource;
  // Days until job is considered stale
  staleDays: number;
  // Days until job expires completely
  expireDays: number;
  // Whether to auto-refresh before expiration
  autoRefresh: boolean;
  // Days before expiration to trigger refresh
  refreshBeforeExpireDays: number;
}

// Interface for expiration statistics
export interface ExpirationStats {
  // Total jobs checked
  totalChecked: number;
  // Jobs marked as stale
  markedStale: number;
  // Jobs expired
  expired: number;
  // Jobs refreshed
  refreshed: number;
  // Jobs reactivated
  reactivated: number;
  // Processing time
  processingTime: number;
}

// Reasons for job expiration
export enum ExpirationReason {
  // Job posting deadline passed
  DEADLINE_PASSED = 'DEADLINE_PASSED',
  // Job is too old
  AGE_LIMIT = 'AGE_LIMIT',
  // Position filled (detected from update)
  POSITION_FILLED = 'POSITION_FILLED',
  // Job removed from source
  SOURCE_REMOVED = 'SOURCE_REMOVED',
  // Manual expiration by admin
  MANUAL = 'MANUAL',
  // No longer accepting applications
  APPLICATIONS_CLOSED = 'APPLICATIONS_CLOSED',
}

@Injectable()
export class JobExpirationService {
  private readonly logger = new Logger(JobExpirationService.name);

  // Default expiration rules by source
  private readonly expirationRules: ExpirationRule[] = [
    {
      source: JobSource.USAJOBS,
      staleDays: 30,      // Federal jobs stay open longer
      expireDays: 60,
      autoRefresh: true,
      refreshBeforeExpireDays: 7,
    },
    {
      source: JobSource.REMOTEOK,
      staleDays: 21,      // Tech jobs move faster
      expireDays: 30,
      autoRefresh: true,
      refreshBeforeExpireDays: 5,
    },
    {
      source: JobSource.REMOTIVE,
      staleDays: 21,
      expireDays: 30,
      autoRefresh: true,
      refreshBeforeExpireDays: 5,
    },
    {
      source: JobSource.THE_MUSE,
      staleDays: 14,      // Startup jobs fill quickly
      expireDays: 21,
      autoRefresh: true,
      refreshBeforeExpireDays: 3,
    },
  ];

  // Default rule for unknown sources
  private readonly defaultRule: ExpirationRule = {
    source: JobSource.ADZUNA,
    staleDays: 30,
    expireDays: 45,
    autoRefresh: false,
    refreshBeforeExpireDays: 5,
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process job expiration for all active jobs
   */
  async processExpiration(): Promise<ExpirationStats> {
    const startTime = Date.now();
    const stats: ExpirationStats = {
      totalChecked: 0,
      markedStale: 0,
      expired: 0,
      refreshed: 0,
      reactivated: 0,
      processingTime: 0,
    };

    try {
      this.logger.log('Starting job expiration processing');

      // Process jobs by source for efficiency
      for (const rule of this.expirationRules) {
        await this.processSourceExpiration(rule, stats);
      }

      // Process jobs with explicit expiration dates
      await this.processExplicitExpirations(stats);

      // Clean up very old inactive jobs
      await this.cleanupOldInactiveJobs(stats);

      stats.processingTime = Date.now() - startTime;

      this.logger.log(
        `Expiration processing complete: ${stats.expired} expired, ` +
        `${stats.markedStale} marked stale, ${stats.refreshed} refreshed`
      );

      // Save statistics to database
      await this.saveExpirationStats(stats);

      return stats;
    } catch (error) {
      this.logger.error('Error in expiration processing:', error);
      throw error;
    }
  }

  /**
   * Process expiration for a specific source
   */
  private async processSourceExpiration(
    rule: ExpirationRule,
    stats: ExpirationStats
  ): Promise<void> {
    // Calculate date thresholds
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - rule.staleDays * 24 * 60 * 60 * 1000);
    const expireThreshold = new Date(now.getTime() - rule.expireDays * 24 * 60 * 60 * 1000);
    const refreshThreshold = new Date(
      now.getTime() - (rule.expireDays - rule.refreshBeforeExpireDays) * 24 * 60 * 60 * 1000
    );

    // Find jobs to process
    const jobs = await this.prisma.job.findMany({
      where: {
        source: rule.source,
        isActive: true,
      },
      select: {
        id: true,
        postedAt: true,
        lastCheckedAt: true,
        expiresAt: true,
        isStale: true,
      },
    });

    stats.totalChecked += jobs.length;

    for (const job of jobs) {
      // Check if job should expire
      if (this.shouldExpire(job, expireThreshold)) {
        await this.expireJob(job.id, ExpirationReason.AGE_LIMIT);
        stats.expired++;
      }
      // Check if job should be marked stale
      else if (!job.isStale && this.shouldMarkStale(job, staleThreshold)) {
        await this.markJobStale(job.id);
        stats.markedStale++;
      }
      // Check if job needs refresh
      else if (rule.autoRefresh && this.shouldRefresh(job, refreshThreshold)) {
        await this.queueJobRefresh(job.id, rule.source);
        stats.refreshed++;
      }
    }
  }

  /**
   * Process jobs with explicit expiration dates
   */
  private async processExplicitExpirations(stats: ExpirationStats): Promise<void> {
    const now = new Date();

    // Find jobs with passed expiration dates
    const expiredJobs = await this.prisma.job.findMany({
      where: {
        expiresAt: {
          lte: now,
        },
        isActive: true,
      },
      select: { id: true },
    });

    stats.totalChecked += expiredJobs.length;

    // Expire each job
    for (const job of expiredJobs) {
      await this.expireJob(job.id, ExpirationReason.DEADLINE_PASSED);
      stats.expired++;
    }
  }

  /**
   * Clean up very old inactive jobs
   */
  private async cleanupOldInactiveJobs(stats: ExpirationStats): Promise<void> {
    // Delete inactive jobs older than 6 months
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    const deleted = await this.prisma.job.deleteMany({
      where: {
        isActive: false,
        updatedAt: {
          lt: sixMonthsAgo,
        },
      },
    });

    if (deleted.count > 0) {
      this.logger.log(`Deleted ${deleted.count} old inactive jobs`);
    }
  }

  /**
   * Check if a job should expire
   */
  private shouldExpire(
    job: { postedAt: Date; expiresAt: Date | null },
    threshold: Date
  ): boolean {
    // Check explicit expiration date first
    if (job.expiresAt && job.expiresAt <= new Date()) {
      return true;
    }

    // Check age-based expiration
    return job.postedAt <= threshold;
  }

  /**
   * Check if a job should be marked as stale
   */
  private shouldMarkStale(
    job: { postedAt: Date; lastCheckedAt: Date | null },
    threshold: Date
  ): boolean {
    // Use lastCheckedAt if available, otherwise postedAt
    const referenceDate = job.lastCheckedAt || job.postedAt;
    return referenceDate <= threshold;
  }

  /**
   * Check if a job should be refreshed
   */
  private shouldRefresh(
    job: { lastCheckedAt: Date | null; postedAt: Date },
    threshold: Date
  ): boolean {
    // Don't refresh if recently checked
    if (job.lastCheckedAt) {
      const hoursSinceCheck = (Date.now() - job.lastCheckedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCheck < 24) {
        return false; // Checked within last 24 hours
      }
    }

    // Refresh if approaching expiration threshold
    return job.postedAt <= threshold;
  }

  /**
   * Expire a job
   */
  async expireJob(
    jobId: string,
    reason: ExpirationReason,
    notes?: string
  ): Promise<void> {
    try {
      // Update job status
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          isActive: false,
          expiredAt: new Date(),
          expirationReason: reason,
          expirationNotes: notes,
        },
      });

      // Log expiration event
      await this.prisma.jobEvent.create({
        data: {
          jobId,
          type: 'EXPIRED',
          data: {
            reason,
            notes,
          },
        },
      });

      // Notify users who have this job in their applications
      await this.notifyUsersOfExpiration(jobId);

      this.logger.debug(`Job ${jobId} expired: ${reason}`);
    } catch (error) {
      this.logger.error(`Error expiring job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Mark a job as stale
   */
  private async markJobStale(jobId: string): Promise<void> {
    try {
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          isStale: true,
          staleMarkedAt: new Date(),
        },
      });

      // Log event
      await this.prisma.jobEvent.create({
        data: {
          jobId,
          type: 'MARKED_STALE',
          data: {},
        },
      });

      this.logger.debug(`Job ${jobId} marked as stale`);
    } catch (error) {
      this.logger.error(`Error marking job ${jobId} as stale:`, error);
    }
  }

  /**
   * Queue a job for refresh
   */
  private async queueJobRefresh(jobId: string, source: JobSource): Promise<void> {
    // This would integrate with the job pipeline processor
    // For now, just update the refresh request timestamp
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        refreshRequestedAt: new Date(),
      },
    });

    this.logger.debug(`Job ${jobId} queued for refresh`);
  }

  /**
   * Notify users when a job expires
   */
  private async notifyUsersOfExpiration(jobId: string): Promise<void> {
    // Find users who have applied to this job
    const applications = await this.prisma.application.findMany({
      where: {
        jobId,
        status: {
          in: ['APPLIED', 'IN_REVIEW', 'INTERVIEWING'],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            emailNotifications: true,
          },
        },
      },
    });

    // Create notifications for each user
    const notifications = applications.map(app => ({
      userId: app.user.id,
      type: 'JOB_EXPIRED',
      title: 'Job Listing Expired',
      message: 'A job you applied to has expired',
      data: {
        jobId,
        applicationId: app.id,
      },
    }));

    if (notifications.length > 0) {
      await this.prisma.notification.createMany({
        data: notifications,
      });

      this.logger.debug(
        `Created ${notifications.length} notifications for expired job ${jobId}`
      );
    }
  }

  /**
   * Reactivate an expired job
   */
  async reactivateJob(jobId: string, extendDays: number = 30): Promise<void> {
    try {
      const newExpiration = new Date(Date.now() + extendDays * 24 * 60 * 60 * 1000);

      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          isActive: true,
          isStale: false,
          expiresAt: newExpiration,
          expiredAt: null,
          expirationReason: null,
          expirationNotes: null,
          reactivatedAt: new Date(),
        },
      });

      // Log reactivation event
      await this.prisma.jobEvent.create({
        data: {
          jobId,
          type: 'REACTIVATED',
          data: {
            extendDays,
            newExpiration,
          },
        },
      });

      this.logger.log(`Job ${jobId} reactivated for ${extendDays} days`);
    } catch (error) {
      this.logger.error(`Error reactivating job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Batch expire jobs
   */
  async batchExpireJobs(
    jobIds: string[],
    reason: ExpirationReason,
    notes?: string
  ): Promise<void> {
    try {
      // Update all jobs in a transaction
      await this.prisma.$transaction([
        // Update jobs
        this.prisma.job.updateMany({
          where: { id: { in: jobIds } },
          data: {
            isActive: false,
            expiredAt: new Date(),
            expirationReason: reason,
            expirationNotes: notes,
          },
        }),
        // Create events
        this.prisma.jobEvent.createMany({
          data: jobIds.map(jobId => ({
            jobId,
            type: 'EXPIRED',
            data: { reason, notes },
          })),
        }),
      ]);

      this.logger.log(`Batch expired ${jobIds.length} jobs: ${reason}`);
    } catch (error) {
      this.logger.error('Error in batch expiration:', error);
      throw error;
    }
  }

  /**
   * Get expiration statistics for a time period
   */
  async getExpirationStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    byReason: Record<string, number>;
    bySource: Record<string, number>;
    totalExpired: number;
    totalReactivated: number;
  }> {
    // Get expired jobs in time period
    const expiredJobs = await this.prisma.job.findMany({
      where: {
        expiredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        expirationReason: true,
        source: true,
      },
    });

    // Get reactivated jobs
    const reactivatedCount = await this.prisma.job.count({
      where: {
        reactivatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Aggregate by reason
    const byReason: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    expiredJobs.forEach(job => {
      // Count by reason
      const reason = job.expirationReason || 'UNKNOWN';
      byReason[reason] = (byReason[reason] || 0) + 1;

      // Count by source
      bySource[job.source] = (bySource[job.source] || 0) + 1;
    });

    return {
      byReason,
      bySource,
      totalExpired: expiredJobs.length,
      totalReactivated: reactivatedCount,
    };
  }

  /**
   * Save expiration statistics
   */
  private async saveExpirationStats(stats: ExpirationStats): Promise<void> {
    await this.prisma.systemLog.create({
      data: {
        type: 'EXPIRATION_RUN',
        message: 'Job expiration processing completed',
        data: stats as any,
        level: 'INFO',
      },
    });
  }

  /**
   * Get expiration rule for a source
   */
  getExpirationRule(source: JobSource): ExpirationRule {
    return (
      this.expirationRules.find(rule => rule.source === source) ||
      this.defaultRule
    );
  }

  /**
   * Update expiration rule
   */
  updateExpirationRule(source: JobSource, updates: Partial<ExpirationRule>): void {
    const rule = this.expirationRules.find(r => r.source === source);
    if (rule) {
      Object.assign(rule, updates);
      this.logger.log(`Updated expiration rule for ${source}`);
    }
  }
}