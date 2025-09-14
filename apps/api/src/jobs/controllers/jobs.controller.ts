// Jobs Controller - Public API endpoints for job operations
// Handles job retrieval, search, and user interactions

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '@jobai/database';
import { JobScoringService } from '../services/job-scoring.service';

// DTO for job search query
export class SearchJobsDto {
  // Search query string
  query?: string;
  // Filter by location
  location?: string;
  // Filter by remote option
  remote?: boolean;
  // Minimum salary
  salaryMin?: number;
  // Maximum salary
  salaryMax?: number;
  // Job type filter
  jobType?: string;
  // Experience level filter
  experienceLevel?: string;
  // Sort by field
  sortBy?: 'relevance' | 'date' | 'salary';
  // Page number
  page?: number;
  // Items per page
  limit?: number;
}

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: JobScoringService,
  ) {}

  /**
   * Get all active jobs with pagination
   */
  @Get()
  async getJobs(@Query() query: SearchJobsDto) {
    // Set defaults for pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {
      isActive: true,
    };

    // Add search filters
    if (query.query) {
      where.OR = [
        { title: { contains: query.query, mode: 'insensitive' } },
        { description: { contains: query.query, mode: 'insensitive' } },
        { companyName: { contains: query.query, mode: 'insensitive' } },
      ];
    }

    if (query.location) {
      where.OR = [
        { locationCity: { contains: query.location, mode: 'insensitive' } },
        { locationState: { contains: query.location, mode: 'insensitive' } },
      ];
    }

    if (query.remote !== undefined) {
      where.remoteOption = query.remote ? 'REMOTE' : { not: 'REMOTE' };
    }

    if (query.salaryMin) {
      where.salaryMax = { gte: query.salaryMin };
    }

    if (query.salaryMax) {
      where.salaryMin = { lte: query.salaryMax };
    }

    if (query.jobType) {
      where.jobType = query.jobType;
    }

    if (query.experienceLevel) {
      where.experienceLevel = query.experienceLevel;
    }

    // Build order by clause
    let orderBy: any = { postedAt: 'desc' }; // Default to newest first

    if (query.sortBy === 'salary') {
      orderBy = { salaryMax: 'desc' };
    } else if (query.sortBy === 'relevance') {
      orderBy = { relevanceScore: 'desc' };
    }

    // Execute query with pagination
    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: {
            select: { applications: true },
          },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single job by ID
   */
  @Get(':id')
  async getJob(@Param('id') id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        _count: {
          select: { applications: true },
        },
        similarJobs: {
          take: 5,
          where: { isActive: true },
        },
      },
    });

    if (!job) {
      throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    }

    // Increment view count
    await this.prisma.job.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return job;
  }

  /**
   * Get personalized job recommendations for authenticated user
   */
  @Get('recommendations/me')
  @UseGuards(JwtAuthGuard)
  async getRecommendations(@Request() req: any) {
    const userId = req.user.id;

    // Get user profile and preferences
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user?.profile) {
      throw new HttpException('User profile not found', HttpStatus.NOT_FOUND);
    }

    // Get user's job scores
    const scores = await this.prisma.jobScore.findMany({
      where: { userId },
      orderBy: { score: 'desc' },
      take: 50,
      include: {
        job: {
          include: {
            _count: {
              select: { applications: true },
            },
          },
        },
      },
    });

    // Filter for active jobs with high scores
    const recommendations = scores
      .filter(s => s.job.isActive && s.score >= 70)
      .map(s => ({
        ...s.job,
        score: s.score,
        scoreDetails: s.scoreDetails,
      }));

    return recommendations;
  }

  /**
   * Save a job for later
   */
  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  async saveJob(@Param('id') jobId: string, @Request() req: any) {
    const userId = req.user.id;

    // Check if job exists
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    }

    // Create saved job entry
    const savedJob = await this.prisma.savedJob.upsert({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
      create: {
        userId,
        jobId,
      },
      update: {
        savedAt: new Date(), // Update timestamp if re-saving
      },
    });

    return {
      message: 'Job saved successfully',
      savedJob,
    };
  }

  /**
   * Remove a saved job
   */
  @Delete(':id/save')
  @UseGuards(JwtAuthGuard)
  async unsaveJob(@Param('id') jobId: string, @Request() req: any) {
    const userId = req.user.id;

    await this.prisma.savedJob.delete({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
    });

    return {
      message: 'Job removed from saved list',
    };
  }

  /**
   * Get user's saved jobs
   */
  @Get('saved/me')
  @UseGuards(JwtAuthGuard)
  async getSavedJobs(@Request() req: any, @Query() query: { page?: number; limit?: number }) {
    const userId = req.user.id;
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [savedJobs, total] = await Promise.all([
      this.prisma.savedJob.findMany({
        where: { userId },
        orderBy: { savedAt: 'desc' },
        skip,
        take: limit,
        include: {
          job: {
            include: {
              _count: {
                select: { applications: true },
              },
            },
          },
        },
      }),
      this.prisma.savedJob.count({ where: { userId } }),
    ]);

    return {
      savedJobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Report a job listing
   */
  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  async reportJob(
    @Param('id') jobId: string,
    @Body() body: { reason: string; details?: string },
    @Request() req: any
  ) {
    const userId = req.user.id;

    // Check if job exists
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    }

    // Create report
    const report = await this.prisma.jobReport.create({
      data: {
        jobId,
        userId,
        reason: body.reason,
        details: body.details,
      },
    });

    return {
      message: 'Job reported successfully',
      report,
    };
  }

  /**
   * Track job application click
   */
  @Post(':id/apply-click')
  async trackApplicationClick(@Param('id') jobId: string) {
    // Update application click count
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        applicationClicks: { increment: 1 },
      },
    });

    // Log event for analytics
    await this.prisma.jobEvent.create({
      data: {
        jobId,
        type: 'APPLICATION_CLICK',
        data: {
          timestamp: new Date(),
        },
      },
    });

    return {
      message: 'Application click tracked',
    };
  }

  /**
   * Get job statistics
   */
  @Get(':id/stats')
  async getJobStats(@Param('id') jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: {
        viewCount: true,
        applicationClicks: true,
        _count: {
          select: {
            applications: true,
            savedByUsers: true,
          },
        },
      },
    });

    if (!job) {
      throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    }

    return {
      views: job.viewCount,
      clicks: job.applicationClicks,
      applications: job._count.applications,
      saves: job._count.savedByUsers,
      conversionRate: job.viewCount > 0 
        ? ((job.applicationClicks / job.viewCount) * 100).toFixed(2) 
        : 0,
    };
  }

  /**
   * Get trending jobs
   */
  @Get('trending/now')
  async getTrendingJobs() {
    // Get jobs with most views in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trending = await this.prisma.job.findMany({
      where: {
        isActive: true,
        updatedAt: { gte: oneDayAgo },
      },
      orderBy: [
        { viewCount: 'desc' },
        { applicationClicks: 'desc' },
      ],
      take: 10,
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    return trending;
  }
}