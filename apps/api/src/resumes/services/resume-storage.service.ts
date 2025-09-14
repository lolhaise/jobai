import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResumeDiffTracker } from '@jobai/shared';
import { randomBytes } from 'crypto';
import {
  CreateResumeVersionDto,
  UpdateResumeTagsDto,
  ShareResumeDto,
  SearchResumesDto,
  CompareVersionsDto,
  MergeVersionsDto,
  CreateTemplateDto,
  ApplyTemplateDto
} from '../dto/resume-storage.dto';

@Injectable()
export class ResumeStorageService {
  private diffTracker = new ResumeDiffTracker();

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new resume version
   */
  async createVersion(userId: string, dto: CreateResumeVersionDto) {
    let parentResume = null;
    let newVersion = 1;

    if (dto.parentId) {
      parentResume = await this.prisma.resume.findFirst({
        where: { id: dto.parentId, userId }
      });

      if (!parentResume) {
        throw new NotFoundException('Parent resume not found');
      }

      // Get the latest version number for this resume lineage
      const latestVersion = await this.prisma.resume.findFirst({
        where: {
          OR: [
            { id: parentResume.id },
            { parentId: parentResume.parentId || parentResume.id }
          ]
        },
        orderBy: { version: 'desc' }
      });

      newVersion = (latestVersion?.version || 0) + 1;
    }

    // Calculate diff if this is a new version
    let diff = null;
    if (parentResume) {
      const versionDiff = this.diffTracker.compareVersions(parentResume, dto);
      diff = versionDiff;
    }

    // Create the new resume version
    const resume = await this.prisma.resume.create({
      data: {
        userId,
        title: dto.title,
        version: newVersion,
        parentId: dto.parentId,
        versionNotes: dto.versionNotes,
        builderData: dto.builderData,
        summary: dto.summary,
        experience: dto.experience || [],
        education: dto.education || [],
        skills: dto.skills || [],
        projects: dto.projects || [],
        tags: dto.tags || [],
        diff,
        isDefault: !dto.parentId // Make it default if it's the first version
      },
      include: {
        parent: true,
        children: true
      }
    });

    return resume;
  }

  /**
   * Get resume version history
   */
  async getVersionHistory(userId: string, resumeId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId }
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    // Find the root resume
    let rootId = resume.parentId || resume.id;
    let currentResume = resume;
    
    while (currentResume.parentId) {
      const parent = await this.prisma.resume.findUnique({
        where: { id: currentResume.parentId }
      });
      if (!parent) break;
      rootId = parent.parentId || parent.id;
      currentResume = parent;
    }

    // Get all versions in the lineage
    const versions = await this.prisma.resume.findMany({
      where: {
        userId,
        OR: [
          { id: rootId },
          { parentId: rootId },
          { parentId: { in: await this.getDescendantIds(rootId) } }
        ]
      },
      orderBy: { version: 'asc' },
      include: {
        parent: true,
        _count: {
          select: {
            applications: true,
            tailoredResumes: true
          }
        }
      }
    });

    // Generate changelog
    const changelog = this.diffTracker.generateChangelog(versions);

    return {
      versions,
      changelog,
      currentVersion: resume.version,
      totalVersions: versions.length
    };
  }

  /**
   * Compare two resume versions
   */
  async compareVersions(userId: string, dto: CompareVersionsDto) {
    const [version1, version2] = await Promise.all([
      this.prisma.resume.findFirst({
        where: { id: dto.version1Id, userId }
      }),
      this.prisma.resume.findFirst({
        where: { id: dto.version2Id, userId }
      })
    ]);

    if (!version1 || !version2) {
      throw new NotFoundException('One or both resume versions not found');
    }

    const diff = this.diffTracker.compareVersions(version1, version2);
    const similarity = this.diffTracker.calculateSimilarity(version1, version2);

    return {
      diff,
      similarity,
      version1: {
        id: version1.id,
        title: version1.title,
        version: version1.version,
        createdAt: version1.createdAt
      },
      version2: {
        id: version2.id,
        title: version2.title,
        version: version2.version,
        createdAt: version2.createdAt
      }
    };
  }

  /**
   * Merge multiple resume versions
   */
  async mergeVersions(userId: string, dto: MergeVersionsDto) {
    const baseVersion = await this.prisma.resume.findFirst({
      where: { id: dto.baseVersionId, userId }
    });

    if (!baseVersion) {
      throw new NotFoundException('Base resume version not found');
    }

    const versions = await this.prisma.resume.findMany({
      where: {
        id: { in: dto.versionIds },
        userId
      }
    });

    if (versions.length !== dto.versionIds.length) {
      throw new NotFoundException('Some resume versions not found');
    }

    // Merge the versions
    const merged = this.diffTracker.mergeVersions(baseVersion, ...versions);

    // Create new merged version
    const mergedResume = await this.createVersion(userId, {
      parentId: baseVersion.id,
      title: `${baseVersion.title} (Merged)`,
      versionNotes: dto.mergeNotes || `Merged versions: ${dto.versionIds.join(', ')}`,
      ...merged
    });

    return mergedResume;
  }

  /**
   * Update resume tags
   */
  async updateTags(userId: string, resumeId: string, dto: UpdateResumeTagsDto) {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId }
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    const updated = await this.prisma.resume.update({
      where: { id: resumeId },
      data: { tags: dto.tags }
    });

    return updated;
  }

  /**
   * Search resumes
   */
  async searchResumes(userId: string, dto: SearchResumesDto) {
    const where: any = { userId };

    if (!dto.includeArchived) {
      where.isArchived = false;
    }

    if (dto.tags && dto.tags.length > 0) {
      where.tags = { hasSome: dto.tags };
    }

    if (dto.query) {
      where.OR = [
        { title: { contains: dto.query, mode: 'insensitive' } },
        { summary: { contains: dto.query, mode: 'insensitive' } },
        { tags: { has: dto.query } }
      ];
    }

    const [resumes, total] = await Promise.all([
      this.prisma.resume.findMany({
        where,
        skip: dto.offset || 0,
        take: dto.limit || 20,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: {
              applications: true,
              tailoredResumes: true,
              shares: true
            }
          }
        }
      }),
      this.prisma.resume.count({ where })
    ]);

    return {
      resumes,
      total,
      limit: dto.limit || 20,
      offset: dto.offset || 0
    };
  }

  /**
   * Archive/unarchive resume
   */
  async archiveResume(userId: string, resumeId: string, archive: boolean) {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId }
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    const updated = await this.prisma.resume.update({
      where: { id: resumeId },
      data: { isArchived: archive }
    });

    return updated;
  }

  /**
   * Share a resume
   */
  async shareResume(userId: string, resumeId: string, dto: ShareResumeDto) {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId }
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    // Generate unique share token if not already present
    let shareToken = resume.shareToken;
    if (!shareToken) {
      shareToken = randomBytes(16).toString('hex');
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: { shareToken }
      });
    }

    // Create share record
    const share = await this.prisma.resumeShare.create({
      data: {
        resumeId,
        shareType: dto.shareType as any,
        expiresAt: dto.expiresAt,
        password: dto.password,
        allowDownload: dto.allowDownload || false,
        allowCopy: dto.allowCopy || false,
        requireEmail: dto.requireEmail || false
      }
    });

    // Generate share URL based on type
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    let shareUrl = '';

    switch (dto.shareType) {
      case 'LINK':
        shareUrl = `${baseUrl}/shared/resume/${shareToken}`;
        break;
      case 'EMAIL':
        shareUrl = `${baseUrl}/shared/resume/${shareToken}?share=${share.id}`;
        break;
      case 'EMBED':
        shareUrl = `<iframe src="${baseUrl}/embed/resume/${shareToken}" width="100%" height="800"></iframe>`;
        break;
    }

    return {
      share,
      shareUrl,
      shareToken
    };
  }

  /**
   * Get shared resume (public access)
   */
  async getSharedResume(shareToken: string, shareId?: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { shareToken },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!resume) {
      throw new NotFoundException('Shared resume not found');
    }

    // Check if specific share exists and is valid
    if (shareId) {
      const share = await this.prisma.resumeShare.findUnique({
        where: { id: shareId }
      });

      if (!share || share.resumeId !== resume.id) {
        throw new NotFoundException('Share link not found');
      }

      if (share.expiresAt && share.expiresAt < new Date()) {
        throw new ForbiddenException('Share link has expired');
      }

      // Update view count
      await this.prisma.resumeShare.update({
        where: { id: shareId },
        data: {
          viewCount: { increment: 1 },
          lastViewedAt: new Date()
        }
      });
    }

    // Update resume view count
    await this.prisma.resume.update({
      where: { id: resume.id },
      data: { viewCount: { increment: 1 } }
    });

    return resume;
  }

  /**
   * Create resume template
   */
  async createTemplate(dto: CreateTemplateDto) {
    const template = await this.prisma.resumeTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        layout: dto.layout || {},
        styles: dto.styles || {},
        sections: dto.sections,
        isPublic: dto.isPublic ?? true,
        isPremium: dto.isPremium ?? false
      }
    });

    return template;
  }

  /**
   * Get available templates
   */
  async getTemplates(category?: string) {
    const where: any = { isPublic: true };
    
    if (category) {
      where.category = category;
    }

    const templates = await this.prisma.resumeTemplate.findMany({
      where,
      orderBy: { usageCount: 'desc' }
    });

    return templates;
  }

  /**
   * Apply template to resume
   */
  async applyTemplate(userId: string, dto: ApplyTemplateDto) {
    const [resume, template] = await Promise.all([
      this.prisma.resume.findFirst({
        where: { id: dto.resumeId, userId }
      }),
      this.prisma.resumeTemplate.findUnique({
        where: { id: dto.templateId }
      })
    ]);

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Update resume with template
    const updated = await this.prisma.resume.update({
      where: { id: dto.resumeId },
      data: { templateId: dto.templateId }
    });

    // Increment template usage count
    await this.prisma.resumeTemplate.update({
      where: { id: dto.templateId },
      data: { usageCount: { increment: 1 } }
    });

    return updated;
  }

  /**
   * Helper: Get descendant IDs for version tree
   */
  private async getDescendantIds(parentId: string): Promise<string[]> {
    const children = await this.prisma.resume.findMany({
      where: { parentId },
      select: { id: true }
    });

    const ids = children.map(c => c.id);
    
    for (const child of children) {
      const descendants = await this.getDescendantIds(child.id);
      ids.push(...descendants);
    }

    return ids;
  }

  /**
   * Get all tags used by user
   */
  async getUserTags(userId: string) {
    const resumes = await this.prisma.resume.findMany({
      where: { userId, isArchived: false },
      select: { tags: true }
    });

    const allTags = resumes.flatMap(r => r.tags);
    const uniqueTags = [...new Set(allTags)];
    
    // Count tag usage
    const tagCounts = uniqueTags.map(tag => ({
      tag,
      count: allTags.filter(t => t === tag).length
    }));

    return tagCounts.sort((a, b) => b.count - a.count);
  }
}