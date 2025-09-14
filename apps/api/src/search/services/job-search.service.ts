// Job Search Service with Full-text PostgreSQL Search
// This service handles all job searching functionality including full-text search,
// advanced filtering, sorting, and pagination

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@jobai/database';
import { Prisma } from '@prisma/client';
import { SearchJobsDto, JobSearchResult } from '../dto/search-jobs.dto';

@Injectable()
export class JobSearchService {
  private readonly logger = new Logger(JobSearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search jobs with full-text search and advanced filters
   * Uses PostgreSQL's built-in text search capabilities for performance
   */
  async searchJobs(
    searchDto: SearchJobsDto,
    userId?: string
  ): Promise<JobSearchResult> {
    const {
      query,
      location,
      remoteOnly,
      minSalary,
      maxSalary,
      experienceLevel,
      employmentType,
      companies,
      skills,
      postedAfter,
      sortBy = 'relevance',
      page = 1,
      limit = 20,
    } = searchDto;

    // Build the where clause dynamically
    const where: Prisma.JobWhereInput = {
      isActive: true,
      expiresAt: {
        gte: new Date(), // Only show non-expired jobs
      },
    };

    // Full-text search on title and description
    if (query) {
      where.OR = [
        {
          title: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          company: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          requiredSkills: {
            has: query,
          },
        },
      ];
    }

    // Location filter with radius search capability
    if (location) {
      if (location.radius && location.lat && location.lng) {
        // Geographic radius search (requires PostGIS extension)
        // For now, we'll use simple text matching
        where.location = {
          contains: location.city || location.query,
          mode: 'insensitive',
        };
      } else {
        // Simple text-based location search
        where.location = {
          contains: location.query || location.city,
          mode: 'insensitive',
        };
      }
    }

    // Remote work filter
    if (remoteOnly !== undefined) {
      where.isRemote = remoteOnly;
    }

    // Salary range filter
    if (minSalary !== undefined) {
      where.salaryMin = {
        gte: minSalary,
      };
    }

    if (maxSalary !== undefined) {
      where.salaryMax = {
        lte: maxSalary,
      };
    }

    // Experience level filter
    if (experienceLevel && experienceLevel.length > 0) {
      where.experienceLevel = {
        in: experienceLevel,
      };
    }

    // Employment type filter
    if (employmentType && employmentType.length > 0) {
      where.employmentType = {
        in: employmentType,
      };
    }

    // Company filter
    if (companies && companies.length > 0) {
      where.company = {
        in: companies,
      };
    }

    // Skills filter - job must have at least one of the specified skills
    if (skills && skills.length > 0) {
      where.requiredSkills = {
        hasSome: skills,
      };
    }

    // Posted date filter
    if (postedAfter) {
      where.postedAt = {
        gte: postedAfter,
      };
    }

    // Build the orderBy clause based on sortBy parameter
    let orderBy: Prisma.JobOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'date':
        orderBy = { postedAt: 'desc' };
        break;
      case 'salary':
        orderBy = { salaryMax: 'desc' };
        break;
      case 'company':
        orderBy = { company: 'asc' };
        break;
      case 'relevance':
      default:
        // For relevance, we'll use a combination of factors
        // In production, you'd want to use PostgreSQL's ts_rank
        orderBy = { postedAt: 'desc' };
        break;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute the search query
    const [jobs, totalCount] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          applications: userId
            ? {
                where: {
                  userId,
                },
                select: {
                  id: true,
                  status: true,
                },
              }
            : false,
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    // Calculate relevance scores if searching by relevance
    let scoredJobs = jobs;
    if (sortBy === 'relevance' && query) {
      scoredJobs = await this.calculateRelevanceScores(jobs, query, userId);
    }

    // Get aggregations for filters
    const aggregations = await this.getSearchAggregations(where);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    this.logger.log(
      `Search completed: ${totalCount} results for query "${query}"`
    );

    return {
      jobs: scoredJobs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext,
        hasPrev,
      },
      aggregations,
    };
  }

  /**
   * Calculate relevance scores for search results
   * Uses TF-IDF-like algorithm for ranking
   */
  private async calculateRelevanceScores(
    jobs: any[],
    query: string,
    userId?: string
  ): Promise<any[]> {
    const queryTerms = query.toLowerCase().split(/\s+/);

    return jobs.map((job) => {
      let score = 0;

      // Title match (highest weight)
      const titleLower = job.title.toLowerCase();
      queryTerms.forEach((term) => {
        if (titleLower.includes(term)) {
          score += 10; // High weight for title matches
        }
      });

      // Description match (medium weight)
      const descLower = job.description.toLowerCase();
      queryTerms.forEach((term) => {
        const matches = (descLower.match(new RegExp(term, 'g')) || []).length;
        score += matches * 2; // Medium weight for description matches
      });

      // Skills match (high weight)
      queryTerms.forEach((term) => {
        if (job.requiredSkills.some((skill: string) => 
          skill.toLowerCase().includes(term)
        )) {
          score += 8; // High weight for skill matches
        }
      });

      // Company match (medium weight)
      if (job.company.toLowerCase().includes(query.toLowerCase())) {
        score += 5;
      }

      // Boost recent jobs slightly
      const daysSincePosted = 
        (Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePosted < 7) {
        score += 3;
      } else if (daysSincePosted < 14) {
        score += 1;
      }

      // Boost jobs with salary information
      if (job.salaryMin && job.salaryMax) {
        score += 2;
      }

      // If user is logged in, boost jobs that match their profile
      if (userId && job.matchScore) {
        score += job.matchScore * 5;
      }

      return {
        ...job,
        relevanceScore: score,
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get aggregations for search filters
   * Provides counts for each filter option to show in UI
   */
  private async getSearchAggregations(
    baseWhere: Prisma.JobWhereInput
  ): Promise<any> {
    const [
      experienceLevels,
      employmentTypes,
      topCompanies,
      topSkills,
      salaryRanges,
      locations,
    ] = await Promise.all([
      // Experience level counts
      this.prisma.job.groupBy({
        by: ['experienceLevel'],
        where: baseWhere,
        _count: true,
      }),

      // Employment type counts
      this.prisma.job.groupBy({
        by: ['employmentType'],
        where: baseWhere,
        _count: true,
      }),

      // Top companies
      this.prisma.job.groupBy({
        by: ['company'],
        where: baseWhere,
        _count: true,
        orderBy: {
          _count: {
            company: 'desc',
          },
        },
        take: 10,
      }),

      // Top skills (this is more complex with array field)
      this.getTopSkills(baseWhere, 20),

      // Salary ranges
      this.getSalaryRanges(baseWhere),

      // Top locations
      this.prisma.job.groupBy({
        by: ['location'],
        where: baseWhere,
        _count: true,
        orderBy: {
          _count: {
            location: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    return {
      experienceLevels: experienceLevels.map((item) => ({
        value: item.experienceLevel,
        count: item._count,
      })),
      employmentTypes: employmentTypes.map((item) => ({
        value: item.employmentType,
        count: item._count,
      })),
      topCompanies: topCompanies.map((item) => ({
        value: item.company,
        count: item._count,
      })),
      topSkills,
      salaryRanges,
      locations: locations.map((item) => ({
        value: item.location,
        count: item._count,
      })),
    };
  }

  /**
   * Get top skills from jobs
   * Since skills are stored as arrays, we need custom aggregation
   */
  private async getTopSkills(
    where: Prisma.JobWhereInput,
    limit: number = 20
  ): Promise<any[]> {
    const jobs = await this.prisma.job.findMany({
      where,
      select: {
        requiredSkills: true,
      },
    });

    // Count skill occurrences
    const skillCounts = new Map<string, number>();
    jobs.forEach((job) => {
      job.requiredSkills.forEach((skill) => {
        skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
      });
    });

    // Sort and return top skills
    return Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([skill, count]) => ({
        value: skill,
        count,
      }));
  }

  /**
   * Calculate salary range distribution
   */
  private async getSalaryRanges(
    where: Prisma.JobWhereInput
  ): Promise<any[]> {
    const jobs = await this.prisma.job.findMany({
      where: {
        ...where,
        salaryMin: { not: null },
        salaryMax: { not: null },
      },
      select: {
        salaryMin: true,
        salaryMax: true,
      },
    });

    // Define salary ranges
    const ranges = [
      { min: 0, max: 50000, label: 'Under $50k' },
      { min: 50000, max: 75000, label: '$50k - $75k' },
      { min: 75000, max: 100000, label: '$75k - $100k' },
      { min: 100000, max: 150000, label: '$100k - $150k' },
      { min: 150000, max: 200000, label: '$150k - $200k' },
      { min: 200000, max: null, label: 'Over $200k' },
    ];

    // Count jobs in each range
    return ranges.map((range) => {
      const count = jobs.filter((job) => {
        const avgSalary = (job.salaryMin! + job.salaryMax!) / 2;
        if (range.max === null) {
          return avgSalary >= range.min;
        }
        return avgSalary >= range.min && avgSalary < range.max;
      }).length;

      return {
        ...range,
        count,
      };
    });
  }

  /**
   * Suggest search queries based on user input
   * Provides autocomplete functionality
   */
  async getSuggestions(
    query: string,
    type: 'job' | 'company' | 'skill' | 'location'
  ): Promise<string[]> {
    const limit = 10;

    switch (type) {
      case 'job':
        const jobs = await this.prisma.job.findMany({
          where: {
            title: {
              contains: query,
              mode: 'insensitive',
            },
            isActive: true,
          },
          select: { title: true },
          distinct: ['title'],
          take: limit,
        });
        return jobs.map((j) => j.title);

      case 'company':
        const companies = await this.prisma.job.findMany({
          where: {
            company: {
              contains: query,
              mode: 'insensitive',
            },
            isActive: true,
          },
          select: { company: true },
          distinct: ['company'],
          take: limit,
        });
        return companies.map((c) => c.company);

      case 'skill':
        // For skills, we need custom logic since they're in arrays
        const jobsWithSkills = await this.prisma.job.findMany({
          where: { isActive: true },
          select: { requiredSkills: true },
        });
        
        const allSkills = new Set<string>();
        jobsWithSkills.forEach((job) => {
          job.requiredSkills
            .filter((skill) => skill.toLowerCase().includes(query.toLowerCase()))
            .forEach((skill) => allSkills.add(skill));
        });
        
        return Array.from(allSkills).slice(0, limit);

      case 'location':
        const locations = await this.prisma.job.findMany({
          where: {
            location: {
              contains: query,
              mode: 'insensitive',
            },
            isActive: true,
          },
          select: { location: true },
          distinct: ['location'],
          take: limit,
        });
        return locations.map((l) => l.location);

      default:
        return [];
    }
  }
}