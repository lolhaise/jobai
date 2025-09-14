import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@jobai/database';
import { ResumeParserService, ParsedResume } from './resume-parser.service';

const prisma = new PrismaClient();

@Injectable()
export class ResumesService {
  constructor(private readonly parserService: ResumeParserService) {}

  async parseAndSaveResume(
    userId: string,
    file: Express.Multer.File,
  ): Promise<any> {
    // Parse the resume file
    const parsedData = await this.parserService.parseResume(file);

    // Save to database
    const resume = await prisma.resume.create({
      data: {
        userId,
        title: parsedData.fullName || file.originalname,
        originalFileName: file.originalname,
        fileFormat: this.mapMimeToFileFormat(file.mimetype),
        originalFileUrl: '', // Will be updated when we implement file storage
        summary: parsedData.summary,
        experience: parsedData.experience as any[],
        education: parsedData.education as any[],
        skills: parsedData.skills,
        certifications: parsedData.certifications.map(cert => ({ name: cert })),
        languages: parsedData.languages.map(lang => ({ name: lang })),
        keywords: parsedData.skills, // Use skills as initial keywords
        isDefault: false,
      },
    });

    // Update user profile with extracted information if it doesn't exist
    await this.updateUserProfile(userId, parsedData);

    return {
      id: resume.id,
      title: resume.title,
      fileName: resume.originalFileName,
      parsedData: {
        fullName: parsedData.fullName,
        email: parsedData.email,
        phone: parsedData.phone,
        location: parsedData.location,
        summary: parsedData.summary,
        experienceCount: parsedData.experience.length,
        educationCount: parsedData.education.length,
        skillsCount: parsedData.skills.length,
        confidence: parsedData.metadata.confidence,
      },
      createdAt: resume.createdAt,
    };
  }

  async getResumes(userId: string) {
    const resumes = await prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        originalFileName: true,
        fileFormat: true,
        isDefault: true,
        summary: true,
        skills: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return resumes.map(resume => ({
      id: resume.id,
      title: resume.title,
      fileName: resume.originalFileName,
      fileFormat: resume.fileFormat,
      isDefault: resume.isDefault,
      summary: resume.summary,
      skillsCount: resume.skills?.length || 0,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    }));
  }

  async getResumeById(userId: string, resumeId: string): Promise<any> {
    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId,
      },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return resume;
  }

  async updateParsedData(
    userId: string,
    resumeId: string,
    parsedData: Partial<ParsedResume>,
  ): Promise<any> {
    const resume = await this.getResumeById(userId, resumeId);

    const updated = await prisma.resume.update({
      where: { id: resumeId },
      data: {
        title: parsedData.fullName || resume.title,
        summary: parsedData.summary || resume.summary,
        experience: parsedData.experience as any[] || resume.experience,
        education: parsedData.education as any[] || resume.education,
        skills: parsedData.skills || resume.skills,
        certifications: parsedData.certifications?.map(cert => ({ name: cert })) || resume.certifications,
        languages: parsedData.languages?.map(lang => ({ name: lang })) || resume.languages,
        updatedAt: new Date(),
      },
    });

    // Update user profile with the new data
    if (parsedData) {
      await this.updateUserProfile(userId, parsedData as ParsedResume);
    }

    return updated;
  }

  async setActiveResume(userId: string, resumeId: string): Promise<any> {
    // First, set all resumes to not default
    await prisma.resume.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Then set the selected resume as default
    const updated = await prisma.resume.update({
      where: { id: resumeId },
      data: { isDefault: true },
    });

    return updated;
  }

  async deleteResume(userId: string, resumeId: string) {
    const resume = await this.getResumeById(userId, resumeId);

    await prisma.resume.delete({
      where: { id: resumeId },
    });

    return { message: 'Resume deleted successfully' };
  }

  private async updateUserProfile(userId: string, parsedData: ParsedResume) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Create profile with parsed data
      await prisma.profile.create({
        data: {
          userId,
          phone: parsedData.phone,
          location: parsedData.location,
          // Map skills to desired job titles if they look like job titles
          desiredJobTitles: parsedData.experience
            .map(exp => exp.title)
            .filter((title): title is string => !!title)
            .slice(0, 5), // Take first 5 job titles
        },
      });
    } else {
      // Update only empty fields
      const updates: any = {};
      
      if (!profile.phone && parsedData.phone) {
        updates.phone = parsedData.phone;
      }
      
      if (!profile.location && parsedData.location) {
        updates.location = parsedData.location;
      }
      
      if (profile.desiredJobTitles.length === 0 && parsedData.experience.length > 0) {
        updates.desiredJobTitles = parsedData.experience
          .map(exp => exp.title)
          .filter((title): title is string => !!title)
          .slice(0, 5);
      }

      if (Object.keys(updates).length > 0) {
        await prisma.profile.update({
          where: { userId },
          data: updates,
        });
      }
    }
  }

  async extractSkillsFromAllResumes(userId: string): Promise<string[]> {
    const resumes = await prisma.resume.findMany({
      where: { userId },
      select: { skills: true },
    });

    const allSkills = new Set<string>();

    for (const resume of resumes) {
      if (resume.skills && Array.isArray(resume.skills)) {
        resume.skills.forEach((skill: string) => allSkills.add(skill));
      }
    }

    return Array.from(allSkills);
  }

  private mapMimeToFileFormat(mimeType: string): 'PDF' | 'DOCX' | 'TXT' | undefined {
    switch (mimeType) {
      case 'application/pdf':
        return 'PDF';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'DOCX';
      case 'text/plain':
        return 'TXT';
      default:
        return undefined;
    }
  }
}