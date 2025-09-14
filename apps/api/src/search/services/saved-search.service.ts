// Saved Search Service
// Manages saved searches and job alerts for users

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@jobai/database';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CreateSavedSearchDto,
  UpdateSavedSearchDto,
  SearchJobsDto,
} from '../dto/search-jobs.dto';
import { JobSearchService } from './job-search.service';
import { EmailService } from '../../notifications/email.service';

@Injectable()
export class SavedSearchService {
  private readonly logger = new Logger(SavedSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobSearchService: JobSearchService,
    private readonly emailService: EmailService
  ) {}

  /**
   * Create a new saved search for a user
   */
  async createSavedSearch(
    userId: string,
    dto: CreateSavedSearchDto
  ): Promise<any> {
    // Check if user has reached saved search limit (e.g., 10 for free users)
    const savedSearchCount = await this.prisma.savedSearch.count({
      where: { userId },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const limit = user?.role === 'PREMIUM' ? 50 : 10;
    if (savedSearchCount >= limit) {
      throw new Error(
        `You have reached the maximum number of saved searches (${limit}). Please delete some searches or upgrade to premium.`
      );
    }

    // Create the saved search
    const savedSearch = await this.prisma.savedSearch.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        searchParams: dto.searchParams as any,
        emailAlerts: dto.emailAlerts || false,
        alertFrequency: dto.alertFrequency || 'DAILY',
        lastAlertSent: new Date(),
      },
    });

    // If email alerts are enabled, send confirmation
    if (dto.emailAlerts) {
      await this.sendAlertConfirmation(userId, savedSearch);
    }

    this.logger.log(`Created saved search "${dto.name}" for user ${userId}`);
    return savedSearch;
  }

  /**
   * Get all saved searches for a user
   */
  async getSavedSearches(userId: string): Promise<any[]> {
    const searches = await this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            alerts: true, // Count of alerts sent
          },
        },
      },
    });

    // Add metadata about last results
    const enhancedSearches = await Promise.all(
      searches.map(async (search) => {
        const results = await this.jobSearchService.searchJobs(
          search.searchParams as SearchJobsDto,
          userId
        );

        return {
          ...search,
          currentMatches: results.pagination.total,
          newMatchesSinceAlert: await this.getNewMatchesCount(
            search.id,
            search.lastAlertSent
          ),
        };
      })
    );

    return enhancedSearches;
  }

  /**
   * Get a specific saved search
   */
  async getSavedSearch(userId: string, searchId: string): Promise<any> {
    const search = await this.prisma.savedSearch.findFirst({
      where: {
        id: searchId,
        userId,
      },
    });

    if (!search) {
      throw new NotFoundException('Saved search not found');
    }

    return search;
  }

  /**
   * Update a saved search
   */
  async updateSavedSearch(
    userId: string,
    searchId: string,
    dto: UpdateSavedSearchDto
  ): Promise<any> {
    // Verify ownership
    const existing = await this.getSavedSearch(userId, searchId);

    const updated = await this.prisma.savedSearch.update({
      where: { id: searchId },
      data: {
        name: dto.name,
        description: dto.description,
        searchParams: dto.searchParams as any,
        emailAlerts: dto.emailAlerts,
        alertFrequency: dto.alertFrequency,
      },
    });

    this.logger.log(`Updated saved search "${updated.name}" for user ${userId}`);
    return updated;
  }

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(
    userId: string,
    searchId: string
  ): Promise<void> {
    // Verify ownership
    await this.getSavedSearch(userId, searchId);

    await this.prisma.savedSearch.delete({
      where: { id: searchId },
    });

    this.logger.log(`Deleted saved search ${searchId} for user ${userId}`);
  }

  /**
   * Run a saved search and return results
   */
  async runSavedSearch(
    userId: string,
    searchId: string
  ): Promise<any> {
    const search = await this.getSavedSearch(userId, searchId);
    
    // Update last run timestamp
    await this.prisma.savedSearch.update({
      where: { id: searchId },
      data: { lastRun: new Date() },
    });

    // Run the search
    const results = await this.jobSearchService.searchJobs(
      search.searchParams as SearchJobsDto,
      userId
    );

    // Track this in search history
    await this.trackSearchHistory(userId, search.searchParams, results);

    return results;
  }

  /**
   * Track search history for analytics
   */
  private async trackSearchHistory(
    userId: string,
    searchParams: any,
    results: any
  ): Promise<void> {
    await this.prisma.searchHistory.create({
      data: {
        userId,
        query: searchParams.query || '',
        filters: searchParams,
        resultsCount: results.pagination.total,
      },
    });
  }

  /**
   * Get new matches since last alert
   */
  private async getNewMatchesCount(
    searchId: string,
    since: Date
  ): Promise<number> {
    const search = await this.prisma.savedSearch.findUnique({
      where: { id: searchId },
    });

    if (!search) return 0;

    // Find jobs posted after last alert
    const searchParams = {
      ...(search.searchParams as SearchJobsDto),
      postedAfter: since,
    };

    const results = await this.jobSearchService.searchJobs(searchParams);
    return results.pagination.total;
  }

  /**
   * Send alert confirmation email
   */
  private async sendAlertConfirmation(
    userId: string,
    savedSearch: any
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user?.email) return;

    await this.emailService.sendEmail({
      to: user.email,
      subject: 'Job Alert Activated',
      template: 'alert-confirmation',
      data: {
        userName: user.name || 'there',
        searchName: savedSearch.name,
        frequency: savedSearch.alertFrequency.toLowerCase(),
      },
    });
  }

  /**
   * Process daily job alerts
   * Runs every day at 9 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async processDailyAlerts(): Promise<void> {
    this.logger.log('Processing daily job alerts...');

    const searches = await this.prisma.savedSearch.findMany({
      where: {
        emailAlerts: true,
        alertFrequency: 'DAILY',
        lastAlertSent: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // More than 24 hours ago
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    for (const search of searches) {
      try {
        await this.sendJobAlert(search);
      } catch (error) {
        this.logger.error(
          `Failed to send alert for search ${search.id}:`,
          error
        );
      }
    }

    this.logger.log(`Processed ${searches.length} daily alerts`);
  }

  /**
   * Process weekly job alerts
   * Runs every Monday at 9 AM
   */
  @Cron(CronExpression.EVERY_WEEK)
  async processWeeklyAlerts(): Promise<void> {
    this.logger.log('Processing weekly job alerts...');

    const searches = await this.prisma.savedSearch.findMany({
      where: {
        emailAlerts: true,
        alertFrequency: 'WEEKLY',
        lastAlertSent: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // More than 7 days ago
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    for (const search of searches) {
      try {
        await this.sendJobAlert(search);
      } catch (error) {
        this.logger.error(
          `Failed to send alert for search ${search.id}:`,
          error
        );
      }
    }

    this.logger.log(`Processed ${searches.length} weekly alerts`);
  }

  /**
   * Send job alert email to user
   */
  private async sendJobAlert(search: any): Promise<void> {
    // Find new jobs since last alert
    const searchParams = {
      ...(search.searchParams as SearchJobsDto),
      postedAfter: search.lastAlertSent,
      limit: 10, // Send top 10 matches
    };

    const results = await this.jobSearchService.searchJobs(
      searchParams,
      search.userId
    );

    // Only send if there are new matches
    if (results.pagination.total === 0) {
      return;
    }

    // Send the email
    await this.emailService.sendEmail({
      to: search.user.email,
      subject: `New Jobs: ${search.name} - ${results.pagination.total} new matches`,
      template: 'job-alert',
      data: {
        userName: search.user.name || 'there',
        searchName: search.name,
        jobCount: results.pagination.total,
        jobs: results.jobs.slice(0, 10), // Top 10 jobs
        viewAllLink: `${process.env.FRONTEND_URL}/saved-searches/${search.id}`,
        unsubscribeLink: `${process.env.FRONTEND_URL}/saved-searches/${search.id}/unsubscribe`,
      },
    });

    // Update last alert sent timestamp
    await this.prisma.savedSearch.update({
      where: { id: search.id },
      data: { lastAlertSent: new Date() },
    });

    // Track alert in database
    await this.prisma.jobAlert.create({
      data: {
        savedSearchId: search.id,
        jobsSent: results.jobs.slice(0, 10).map((j: any) => j.id),
        sentAt: new Date(),
      },
    });

    this.logger.log(
      `Sent job alert for "${search.name}" with ${results.pagination.total} new matches`
    );
  }

  /**
   * Get user's search history
   */
  async getSearchHistory(
    userId: string,
    limit: number = 20
  ): Promise<any[]> {
    const history = await this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: {
            clicks: true, // Count of job clicks from this search
          },
        },
      },
    });

    return history;
  }

  /**
   * Get search analytics for the platform
   */
  async getSearchAnalytics(): Promise<any> {
    const [
      totalSearches,
      uniqueUsers,
      popularQueries,
      commonFilters,
      avgResults,
    ] = await Promise.all([
      // Total searches
      this.prisma.searchHistory.count(),

      // Unique users searching
      this.prisma.searchHistory.findMany({
        distinct: ['userId'],
        select: { userId: true },
      }),

      // Popular queries (top 10)
      this.prisma.searchHistory.groupBy({
        by: ['query'],
        _count: true,
        orderBy: {
          _count: {
            query: 'desc',
          },
        },
        take: 10,
        where: {
          query: {
            not: '',
          },
        },
      }),

      // Common filter combinations
      this.getCommonFilterCombinations(),

      // Average results per search
      this.prisma.searchHistory.aggregate({
        _avg: {
          resultsCount: true,
        },
      }),
    ]);

    return {
      totalSearches,
      uniqueUsers: uniqueUsers.length,
      popularQueries: popularQueries.map((q) => ({
        query: q.query,
        count: q._count,
      })),
      commonFilters,
      averageResults: avgResults._avg.resultsCount || 0,
      searchTrends: await this.getSearchTrends(),
    };
  }

  /**
   * Analyze common filter combinations
   */
  private async getCommonFilterCombinations(): Promise<any[]> {
    const searches = await this.prisma.searchHistory.findMany({
      select: { filters: true },
      take: 1000, // Sample recent searches
    });

    // Count filter usage
    const filterCounts = new Map<string, number>();

    searches.forEach((search) => {
      const filters = search.filters as any;
      if (filters.location) filterCounts.set('location', (filterCounts.get('location') || 0) + 1);
      if (filters.remoteOnly) filterCounts.set('remote', (filterCounts.get('remote') || 0) + 1);
      if (filters.minSalary || filters.maxSalary) filterCounts.set('salary', (filterCounts.get('salary') || 0) + 1);
      if (filters.experienceLevel?.length) filterCounts.set('experience', (filterCounts.get('experience') || 0) + 1);
      if (filters.employmentType?.length) filterCounts.set('employment', (filterCounts.get('employment') || 0) + 1);
      if (filters.skills?.length) filterCounts.set('skills', (filterCounts.get('skills') || 0) + 1);
    });

    return Array.from(filterCounts.entries())
      .map(([filter, count]) => ({ filter, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get search trends over time
   */
  private async getSearchTrends(): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const dailySearches = await this.prisma.searchHistory.groupBy({
      by: ['createdAt'],
      _count: true,
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Group by date (without time)
    const trendsByDate = new Map<string, number>();
    dailySearches.forEach((item) => {
      const date = new Date(item.createdAt).toISOString().split('T')[0];
      trendsByDate.set(date, (trendsByDate.get(date) || 0) + item._count);
    });

    return Array.from(trendsByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}