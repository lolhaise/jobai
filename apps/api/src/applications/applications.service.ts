// Import necessary NestJS decorators and utilities
import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';

// Import Prisma client and types
import { PrismaService } from '@jobai/database';
import { Prisma, ApplicationStatus, ApplicationStage } from '@prisma/client';

// Import DTOs
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { FilterApplicationsDto } from './dto/filter-applications.dto';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  // Create a new job application
  async create(userId: string, createApplicationDto: CreateApplicationDto) {
    try {
      // Check if user already has an application for this job
      const existingApplication = await this.prisma.application.findUnique({
        where: {
          userId_jobId: {
            userId,
            jobId: createApplicationDto.jobId,
          },
        },
      });

      // Throw error if application already exists
      if (existingApplication) {
        throw new ConflictException('Application for this job already exists');
      }

      // Verify that the job exists
      const job = await this.prisma.job.findUnique({
        where: { id: createApplicationDto.jobId },
        select: { id: true, title: true, company: true },
      });

      if (!job) {
        throw new NotFoundException('Job not found');
      }

      // Verify that the resume exists and belongs to the user
      const resume = await this.prisma.resume.findFirst({
        where: {
          id: createApplicationDto.resumeId,
          userId: userId,
        },
        select: { id: true, title: true },
      });

      if (!resume) {
        throw new NotFoundException('Resume not found or does not belong to user');
      }

      // Create the application with all provided data
      const application = await this.prisma.application.create({
        data: {
          userId,
          ...createApplicationDto,
        },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              company: true,
              location: true,
              remoteType: true,
              sourceUrl: true,
            },
          },
          resume: {
            select: {
              id: true,
              title: true,
            },
          },
          tags: true,
          applicationNotes: {
            orderBy: { createdAt: 'desc' },
            take: 5, // Only include latest 5 notes
          },
          documents: {
            select: {
              id: true,
              fileName: true,
              documentType: true,
              uploadedAt: true,
            },
          },
        },
      });

      // Log activity for application creation
      await this.logActivity(
        application.id,
        userId,
        'APPLICATION_CREATED',
        `Created application for ${job.title} at ${job.company}`,
      );

      return application;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to create application');
    }
  }

  // Get paginated list of applications with filters
  async findAll(userId: string, filterDto: FilterApplicationsDto) {
    // Build where clause based on filters
    const where: Prisma.ApplicationWhereInput = {
      userId,
      isArchived: filterDto.isArchived ?? false,
    };

    // Add search filter across multiple fields
    if (filterDto.search) {
      where.OR = [
        {
          job: {
            title: { contains: filterDto.search, mode: 'insensitive' },
          },
        },
        {
          job: {
            company: { contains: filterDto.search, mode: 'insensitive' },
          },
        },
        {
          notes: { contains: filterDto.search, mode: 'insensitive' },
        },
        {
          contactPerson: { contains: filterDto.search, mode: 'insensitive' },
        },
      ];
    }

    // Add individual filters
    if (filterDto.status) where.status = filterDto.status;
    if (filterDto.stage) where.stage = filterDto.stage;
    if (filterDto.priority) where.priority = filterDto.priority;
    if (filterDto.isFavorite !== undefined) where.isFavorite = filterDto.isFavorite;
    if (filterDto.company) where.job = { company: { contains: filterDto.company, mode: 'insensitive' } };
    if (filterDto.location) where.job = { ...where.job, location: { contains: filterDto.location, mode: 'insensitive' } };

    // Add date range filters
    if (filterDto.appliedAfter || filterDto.appliedBefore) {
      where.appliedAt = {};
      if (filterDto.appliedAfter) where.appliedAt.gte = new Date(filterDto.appliedAfter);
      if (filterDto.appliedBefore) where.appliedAt.lte = new Date(filterDto.appliedBefore);
    }

    // Add tag filter
    if (filterDto.tags && filterDto.tags.length > 0) {
      where.tags = {
        some: {
          name: { in: filterDto.tags },
        },
      };
    }

    // Calculate pagination
    const skip = (filterDto.page - 1) * filterDto.limit;

    // Build order by clause
    const orderBy: Prisma.ApplicationOrderByWithRelationInput = {};
    if (filterDto.sortBy === 'company') {
      orderBy.job = { company: filterDto.sortOrder };
    } else if (filterDto.sortBy === 'jobTitle') {
      orderBy.job = { title: filterDto.sortOrder };
    } else {
      orderBy[filterDto.sortBy as keyof Prisma.ApplicationOrderByWithRelationInput] = filterDto.sortOrder;
    }

    // Execute query with pagination
    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              company: true,
              location: true,
              remoteType: true,
              sourceUrl: true,
              companyLogo: true,
            },
          },
          resume: {
            select: {
              id: true,
              title: true,
            },
          },
          tags: true,
          applicationNotes: {
            where: { isPinned: true },
            take: 3,
            orderBy: { createdAt: 'desc' },
          },
          documents: {
            select: {
              id: true,
              fileName: true,
              documentType: true,
            },
          },
          _count: {
            select: {
              applicationNotes: true,
              documents: true,
            },
          },
        },
        orderBy,
        skip,
        take: filterDto.limit,
      }),
      this.prisma.application.count({ where }),
    ]);

    // Return paginated results
    return {
      data: applications,
      meta: {
        total,
        page: filterDto.page,
        limit: filterDto.limit,
        totalPages: Math.ceil(total / filterDto.limit),
      },
    };
  }

  // Get single application by ID
  async findOne(id: string, userId: string) {
    const application = await this.prisma.application.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        job: true,
        resume: {
          select: {
            id: true,
            title: true,
          },
        },
        tailoredResume: true,
        interviews: {
          orderBy: { scheduledAt: 'asc' },
        },
        applicationNotes: {
          orderBy: { createdAt: 'desc' },
        },
        tags: true,
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        activityLogs: {
          include: {
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
          orderBy: { occurredAt: 'desc' },
          take: 20, // Latest 20 activities
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  // Update application
  async update(id: string, userId: string, updateApplicationDto: UpdateApplicationDto) {
    // Verify application exists and belongs to user
    const existingApplication = await this.prisma.application.findFirst({
      where: { id, userId },
      include: { job: { select: { title: true, company: true } } },
    });

    if (!existingApplication) {
      throw new NotFoundException('Application not found');
    }

    // Track status changes for activity log
    const statusChanged = updateApplicationDto.status && updateApplicationDto.status !== existingApplication.status;
    const stageChanged = updateApplicationDto.stage && updateApplicationDto.stage !== existingApplication.stage;

    // Update the application
    const updatedApplication = await this.prisma.application.update({
      where: { id },
      data: updateApplicationDto,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            remoteType: true,
          },
        },
        resume: {
          select: {
            id: true,
            title: true,
          },
        },
        tags: true,
      },
    });

    // Log status change activity
    if (statusChanged) {
      await this.logActivity(
        id,
        userId,
        'STATUS_CHANGED',
        `Changed status from ${existingApplication.status} to ${updateApplicationDto.status}`,
        { oldStatus: existingApplication.status, newStatus: updateApplicationDto.status },
      );
    }

    // Log stage change activity
    if (stageChanged) {
      await this.logActivity(
        id,
        userId,
        'STATUS_CHANGED',
        `Changed stage from ${existingApplication.stage} to ${updateApplicationDto.stage}`,
        { oldStage: existingApplication.stage, newStage: updateApplicationDto.stage },
      );
    }

    return updatedApplication;
  }

  // Delete application
  async remove(id: string, userId: string) {
    // Verify application exists and belongs to user
    const application = await this.prisma.application.findFirst({
      where: { id, userId },
      include: { job: { select: { title: true, company: true } } },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Delete the application (cascading will handle related records)
    await this.prisma.application.delete({
      where: { id },
    });

    return { message: 'Application deleted successfully' };
  }

  // Add note to application
  async addNote(applicationId: string, userId: string, createNoteDto: CreateNoteDto) {
    // Verify application exists and belongs to user
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Create the note
    const note = await this.prisma.applicationNote.create({
      data: {
        applicationId,
        userId,
        ...createNoteDto,
      },
    });

    // Log activity
    await this.logActivity(
      applicationId,
      userId,
      'NOTE_ADDED',
      `Added note: ${createNoteDto.title || 'Untitled'}`,
    );

    return note;
  }

  // Get notes for application
  async getNotes(applicationId: string, userId: string) {
    // Verify application belongs to user
    await this.verifyApplicationAccess(applicationId, userId);

    return this.prisma.applicationNote.findMany({
      where: { applicationId },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    });
  }

  // Add tag to application
  async addTag(applicationId: string, userId: string, createTagDto: CreateTagDto) {
    // Verify application belongs to user
    await this.verifyApplicationAccess(applicationId, userId);

    // Check if tag already exists for this application
    const existingTag = await this.prisma.applicationTag.findUnique({
      where: {
        applicationId_name: {
          applicationId,
          name: createTagDto.name,
        },
      },
    });

    if (existingTag) {
      throw new ConflictException('Tag already exists for this application');
    }

    // Create the tag
    const tag = await this.prisma.applicationTag.create({
      data: {
        applicationId,
        ...createTagDto,
      },
    });

    // Log activity
    await this.logActivity(
      applicationId,
      userId,
      'TAG_ADDED',
      `Added tag: ${createTagDto.name}`,
    );

    return tag;
  }

  // Remove tag from application
  async removeTag(applicationId: string, tagId: string, userId: string) {
    // Verify application belongs to user
    await this.verifyApplicationAccess(applicationId, userId);

    // Verify tag exists and belongs to this application
    const tag = await this.prisma.applicationTag.findFirst({
      where: {
        id: tagId,
        applicationId,
      },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Delete the tag
    await this.prisma.applicationTag.delete({
      where: { id: tagId },
    });

    return { message: 'Tag removed successfully' };
  }

  // Get application statistics for dashboard
  async getStatistics(userId: string) {
    // Get counts by status
    const statusCounts = await this.prisma.application.groupBy({
      by: ['status'],
      where: {
        userId,
        isArchived: false,
      },
      _count: {
        id: true,
      },
    });

    // Get counts by stage
    const stageCounts = await this.prisma.application.groupBy({
      by: ['stage'],
      where: {
        userId,
        isArchived: false,
      },
      _count: {
        id: true,
      },
    });

    // Get total applications count
    const totalApplications = await this.prisma.application.count({
      where: {
        userId,
        isArchived: false,
      },
    });

    // Get response rate (applications with response vs total applied)
    const appliedCount = await this.prisma.application.count({
      where: {
        userId,
        status: { not: 'DRAFT' },
        isArchived: false,
      },
    });

    const respondedCount = await this.prisma.application.count({
      where: {
        userId,
        stage: { in: ['SCREENING', 'PHONE_SCREEN', 'TECHNICAL', 'ONSITE', 'FINAL', 'OFFER'] },
        isArchived: false,
      },
    });

    // Calculate weekly activity
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyActivity = await this.prisma.application.count({
      where: {
        userId,
        createdAt: { gte: oneWeekAgo },
        isArchived: false,
      },
    });

    return {
      total: totalApplications,
      byStatus: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byStage: stageCounts.reduce((acc, item) => {
        acc[item.stage] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      responseRate: appliedCount > 0 ? Math.round((respondedCount / appliedCount) * 100) : 0,
      weeklyActivity,
    };
  }

  // Get Kanban board data grouped by status
  async getKanbanData(userId: string) {
    const applications = await this.prisma.application.findMany({
      where: {
        userId,
        isArchived: false,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            companyLogo: true,
          },
        },
        tags: true,
        _count: {
          select: {
            applicationNotes: true,
            documents: true,
          },
        },
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Group applications by status
    const grouped = applications.reduce((acc, app) => {
      if (!acc[app.status]) {
        acc[app.status] = [];
      }
      acc[app.status].push(app);
      return acc;
    }, {} as Record<ApplicationStatus, typeof applications>);

    return grouped;
  }

  // Update Kanban positions after drag and drop
  async updateKanbanPositions(
    userId: string, 
    updates: Array<{ id: string; status: ApplicationStatus; position: number }>
  ) {
    // Verify all applications belong to user
    const applicationIds = updates.map(u => u.id);
    const applications = await this.prisma.application.findMany({
      where: {
        id: { in: applicationIds },
        userId,
      },
      select: { id: true },
    });

    if (applications.length !== applicationIds.length) {
      throw new ForbiddenException('Some applications do not belong to user');
    }

    // Update positions in transaction
    await this.prisma.$transaction(
      updates.map(update =>
        this.prisma.application.update({
          where: { id: update.id },
          data: {
            status: update.status,
            position: update.position,
          },
        })
      )
    );

    return { message: 'Positions updated successfully' };
  }

  // Private helper to verify application access
  private async verifyApplicationAccess(applicationId: string, userId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  // Private helper to log activities
  private async logActivity(
    applicationId: string,
    userId: string,
    action: string,
    description: string,
    metadata?: any,
  ) {
    await this.prisma.applicationActivity.create({
      data: {
        applicationId,
        userId,
        action,
        description,
        metadata,
      },
    });
  }
}