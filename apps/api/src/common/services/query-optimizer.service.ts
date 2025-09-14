import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// Interface for query performance metrics
interface QueryMetrics {
  query: string;
  params?: any;
  executionTime: number;
  rowCount: number;
  slowQuery: boolean;
}

// Interface for query plan analysis
interface QueryPlan {
  query: string;
  plan: any;
  suggestions: string[];
  estimatedCost: number;
}

@Injectable()
export class QueryOptimizerService {
  private readonly logger = new Logger(QueryOptimizerService.name);
  private readonly SLOW_QUERY_THRESHOLD_MS = 1000; // 1 second
  private queryMetrics: Map<string, QueryMetrics[]> = new Map();

  constructor(private prisma: PrismaService) {}

  /**
   * Optimize job search queries with proper indexing
   */
  async optimizedJobSearch(params: {
    keywords?: string;
    location?: string;
    remoteType?: string;
    salaryMin?: number;
    salaryMax?: number;
    experienceLevel?: string;
    employmentType?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }) {
    const startTime = Date.now();

    // Build optimized WHERE clause utilizing indexes
    const where: Prisma.JobWhereInput = {
      isActive: true, // Uses index
      ...(params.keywords && {
        OR: [
          { title: { contains: params.keywords, mode: 'insensitive' } },
          { description: { contains: params.keywords, mode: 'insensitive' } },
          { company: { contains: params.keywords, mode: 'insensitive' } },
        ],
      }),
      ...(params.location && { location: { contains: params.location, mode: 'insensitive' } }),
      ...(params.remoteType && { remoteType: params.remoteType }),
      ...(params.salaryMin && { salaryMax: { gte: params.salaryMin } }),
      ...(params.salaryMax && { salaryMin: { lte: params.salaryMax } }),
      ...(params.experienceLevel && { level: params.experienceLevel }),
      ...(params.employmentType && { employmentType: params.employmentType }),
      ...(params.category && { category: params.category }),
    };

    // Use cursor-based pagination for better performance
    const jobs = await this.prisma.job.findMany({
      where,
      take: params.limit || 20,
      skip: params.offset || 0,
      orderBy: { postedAt: 'desc' }, // Uses index
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        remoteType: true,
        salaryMin: true,
        salaryMax: true,
        employmentType: true,
        level: true,
        postedAt: true,
        // Avoid selecting large text fields unless necessary
      },
    });

    // Count query optimization - use separate count for better performance
    const totalCount = await this.prisma.job.count({ where });

    const executionTime = Date.now() - startTime;
    this.logQueryMetrics({
      query: 'optimizedJobSearch',
      params,
      executionTime,
      rowCount: jobs.length,
      slowQuery: executionTime > this.SLOW_QUERY_THRESHOLD_MS,
    });

    return { jobs, totalCount, executionTime };
  }

  /**
   * Optimize application dashboard queries
   */
  async optimizedApplicationDashboard(userId: string) {
    const startTime = Date.now();

    // Use parallel queries instead of joins for better performance
    const [
      applications,
      statusCounts,
      upcomingInterviews,
      pendingFollowUps,
    ] = await Promise.all([
      // Recent applications with minimal data
      this.prisma.application.findMany({
        where: { userId, isArchived: false },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          stage: true,
          priority: true,
          appliedAt: true,
          job: {
            select: {
              id: true,
              title: true,
              company: true,
              location: true,
            },
          },
        },
      }),

      // Status counts using groupBy for efficiency
      this.prisma.application.groupBy({
        by: ['status'],
        where: { userId, isArchived: false },
        _count: true,
      }),

      // Upcoming interviews
      this.prisma.application.findMany({
        where: {
          userId,
          interviewDate: { gte: new Date() },
          isArchived: false,
        },
        orderBy: { interviewDate: 'asc' },
        take: 5,
        select: {
          id: true,
          interviewDate: true,
          job: {
            select: { title: true, company: true },
          },
        },
      }),

      // Pending follow-ups
      this.prisma.application.findMany({
        where: {
          userId,
          nextFollowUp: { lte: new Date() },
          isArchived: false,
        },
        take: 5,
        select: {
          id: true,
          nextFollowUp: true,
          job: {
            select: { title: true, company: true },
          },
        },
      }),
    ]);

    const executionTime = Date.now() - startTime;
    this.logQueryMetrics({
      query: 'optimizedApplicationDashboard',
      params: { userId },
      executionTime,
      rowCount: applications.length,
      slowQuery: executionTime > this.SLOW_QUERY_THRESHOLD_MS,
    });

    return {
      applications,
      statusCounts,
      upcomingInterviews,
      pendingFollowUps,
      executionTime,
    };
  }

  /**
   * Optimize resume search queries
   */
  async optimizedResumeSearch(userId: string, tags?: string[]) {
    const startTime = Date.now();

    const where: Prisma.ResumeWhereInput = {
      userId,
      isArchived: false,
      ...(tags && tags.length > 0 && { tags: { hasSome: tags } }),
    };

    // Use select to minimize data transfer
    const resumes = await this.prisma.resume.findMany({
      where,
      orderBy: { lastUsedAt: 'desc' }, // Uses index
      select: {
        id: true,
        title: true,
        isDefault: true,
        tags: true,
        atsScore: true,
        lastUsedAt: true,
        createdAt: true,
        version: true,
      },
    });

    const executionTime = Date.now() - startTime;
    this.logQueryMetrics({
      query: 'optimizedResumeSearch',
      params: { userId, tags },
      executionTime,
      rowCount: resumes.length,
      slowQuery: executionTime > this.SLOW_QUERY_THRESHOLD_MS,
    });

    return { resumes, executionTime };
  }

  /**
   * Batch load related data to avoid N+1 queries
   */
  async batchLoadApplicationData(applicationIds: string[]) {
    const startTime = Date.now();

    // Use findMany with IN clause for batch loading
    const [applications, notes, tags, documents] = await Promise.all([
      this.prisma.application.findMany({
        where: { id: { in: applicationIds } },
        include: {
          job: true,
          resume: {
            select: { id: true, title: true },
          },
        },
      }),

      this.prisma.applicationNote.findMany({
        where: { applicationId: { in: applicationIds } },
      }),

      this.prisma.applicationTag.findMany({
        where: { applicationId: { in: applicationIds } },
      }),

      this.prisma.applicationDocument.findMany({
        where: { applicationId: { in: applicationIds } },
      }),
    ]);

    // Group related data by application ID
    const notesMap = new Map();
    const tagsMap = new Map();
    const documentsMap = new Map();

    notes.forEach(note => {
      if (!notesMap.has(note.applicationId)) {
        notesMap.set(note.applicationId, []);
      }
      notesMap.get(note.applicationId).push(note);
    });

    tags.forEach(tag => {
      if (!tagsMap.has(tag.applicationId)) {
        tagsMap.set(tag.applicationId, []);
      }
      tagsMap.get(tag.applicationId).push(tag);
    });

    documents.forEach(doc => {
      if (!documentsMap.has(doc.applicationId)) {
        documentsMap.set(doc.applicationId, []);
      }
      documentsMap.get(doc.applicationId).push(doc);
    });

    // Combine data
    const enrichedApplications = applications.map(app => ({
      ...app,
      notes: notesMap.get(app.id) || [],
      tags: tagsMap.get(app.id) || [],
      documents: documentsMap.get(app.id) || [],
    }));

    const executionTime = Date.now() - startTime;
    this.logQueryMetrics({
      query: 'batchLoadApplicationData',
      params: { applicationIds },
      executionTime,
      rowCount: applications.length,
      slowQuery: executionTime > this.SLOW_QUERY_THRESHOLD_MS,
    });

    return { applications: enrichedApplications, executionTime };
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  async analyzeQueryPerformance(query: string): Promise<QueryPlan> {
    try {
      // Execute EXPLAIN ANALYZE for PostgreSQL
      const result = await this.prisma.$queryRaw`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${Prisma.raw(query)}
      `;

      const plan = result[0]['QUERY PLAN'][0];
      const suggestions = this.generateOptimizationSuggestions(plan);

      return {
        query,
        plan,
        suggestions,
        estimatedCost: plan['Total Cost'] || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze query: ${error.message}`);
      return {
        query,
        plan: null,
        suggestions: ['Unable to analyze query'],
        estimatedCost: 0,
      };
    }
  }

  /**
   * Generate optimization suggestions based on query plan
   */
  private generateOptimizationSuggestions(plan: any): string[] {
    const suggestions: string[] = [];

    // Check for sequential scans on large tables
    if (plan['Node Type'] === 'Seq Scan' && plan['Actual Rows'] > 1000) {
      suggestions.push(
        `Consider adding an index on the filter columns for table ${plan['Relation Name']}`
      );
    }

    // Check for missing indexes on join columns
    if (plan['Node Type'] === 'Hash Join' && plan['Total Cost'] > 1000) {
      suggestions.push('Consider adding indexes on join columns to improve performance');
    }

    // Check for inefficient sorting
    if (plan['Node Type'] === 'Sort' && plan['Sort Key']) {
      suggestions.push(`Consider adding an index on ${plan['Sort Key'].join(', ')}`);
    }

    // Check for high startup cost
    if (plan['Startup Cost'] > 100) {
      suggestions.push('High startup cost detected - consider query restructuring');
    }

    return suggestions;
  }

  /**
   * Log query metrics for monitoring
   */
  private logQueryMetrics(metrics: QueryMetrics) {
    const { query, executionTime, rowCount, slowQuery } = metrics;

    // Store metrics for analysis
    if (!this.queryMetrics.has(query)) {
      this.queryMetrics.set(query, []);
    }
    this.queryMetrics.get(query).push(metrics);

    // Log slow queries
    if (slowQuery) {
      this.logger.warn(
        `Slow query detected: ${query} took ${executionTime}ms for ${rowCount} rows`
      );
    } else {
      this.logger.debug(
        `Query executed: ${query} in ${executionTime}ms (${rowCount} rows)`
      );
    }
  }

  /**
   * Get query performance statistics
   */
  getQueryStatistics() {
    const stats: any[] = [];

    this.queryMetrics.forEach((metrics, query) => {
      const times = metrics.map(m => m.executionTime);
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const slowQueries = metrics.filter(m => m.slowQuery).length;

      stats.push({
        query,
        executionCount: metrics.length,
        avgExecutionTime: Math.round(avgTime),
        maxExecutionTime: maxTime,
        minExecutionTime: minTime,
        slowQueryCount: slowQueries,
        slowQueryPercentage: ((slowQueries / metrics.length) * 100).toFixed(2),
      });
    });

    return stats.sort((a, b) => b.avgExecutionTime - a.avgExecutionTime);
  }

  /**
   * Clear query metrics cache
   */
  clearMetrics() {
    this.queryMetrics.clear();
    this.logger.log('Query metrics cleared');
  }
}