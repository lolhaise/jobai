import { Test, TestingModule } from '@nestjs/testing';
import { ResumesService } from './resumes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ResumeParserService } from './resume-parser.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mock the PrismaService
const mockPrismaService = {
  resume: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  resumeVersion: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Mock the ResumeParserService
const mockResumeParserService = {
  parseResume: jest.fn(),
};

describe('ResumesService', () => {
  let service: ResumesService;
  let prisma: typeof mockPrismaService;
  let parserService: typeof mockResumeParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ResumeParserService,
          useValue: mockResumeParserService,
        },
      ],
    }).compile();

    service = module.get<ResumesService>(ResumesService);
    prisma = module.get(PrismaService);
    parserService = module.get(ResumeParserService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('uploadResume', () => {
    const userId = 'user-1';
    const file = {
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('mock pdf content'),
      size: 1024,
    } as Express.Multer.File;

    it('should upload and parse resume successfully', async () => {
      // Given: parser returns parsed data
      const parsedData = {
        personalInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
        },
        summary: 'Experienced developer',
        experience: [
          {
            company: 'Tech Corp',
            position: 'Senior Developer',
            startDate: '2020-01',
            endDate: '2023-01',
            description: 'Led development team',
          },
        ],
        education: [
          {
            institution: 'University',
            degree: 'BS Computer Science',
            graduationDate: '2019',
          },
        ],
        skills: ['JavaScript', 'TypeScript', 'React'],
      };

      parserService.parseResume.mockResolvedValue(parsedData);

      // Given: resume creation succeeds
      const createdResume = {
        id: 'resume-1',
        userId,
        title: 'Resume - John Doe',
        originalFileName: file.originalname,
        fileUrl: 'https://storage.example.com/resume-1.pdf',
        parsedContent: parsedData,
        isActive: false,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.resume.create.mockResolvedValue(createdResume);

      // When: uploadResume is called
      const result = await service.uploadResume(userId, file);

      // Then: resume is parsed and saved
      expect(parserService.parseResume).toHaveBeenCalledWith(file.buffer, file.mimetype);
      expect(prisma.resume.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          title: 'Resume - John Doe',
          originalFileName: file.originalname,
          parsedContent: parsedData,
        }),
      });
      expect(result).toEqual(createdResume);
    });

    it('should throw BadRequestException for invalid file type', async () => {
      // Given: invalid file type
      const invalidFile = {
        ...file,
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      // When/Then: uploadResume should throw BadRequestException
      await expect(service.uploadResume(userId, invalidFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(parserService.parseResume).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for file too large', async () => {
      // Given: file size exceeds limit (5MB)
      const largeFile = {
        ...file,
        size: 6 * 1024 * 1024, // 6MB
      } as Express.Multer.File;

      // When/Then: uploadResume should throw BadRequestException
      await expect(service.uploadResume(userId, largeFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(parserService.parseResume).not.toHaveBeenCalled();
    });
  });

  describe('getUserResumes', () => {
    const userId = 'user-1';

    it('should return user resumes with pagination', async () => {
      // Given: user has multiple resumes
      const resumes = [
        {
          id: 'resume-1',
          title: 'Resume 1',
          userId,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 'resume-2',
          title: 'Resume 2',
          userId,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      prisma.resume.findMany.mockResolvedValue(resumes);
      prisma.resume.count.mockResolvedValue(2);

      // When: getUserResumes is called
      const result = await service.getUserResumes(userId, { page: 1, limit: 10 });

      // Then: resumes are returned with pagination
      expect(prisma.resume.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
        include: {
          _count: {
            select: {
              tailoredVersions: true,
              applications: true,
            },
          },
        },
      });
      expect(result).toEqual({
        data: resumes,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter archived resumes', async () => {
      // When: getUserResumes is called with archived filter
      await service.getUserResumes(userId, { page: 1, limit: 10, archived: false });

      // Then: query includes archived filter
      expect(prisma.resume.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId,
            isArchived: false,
          },
        }),
      );
    });
  });

  describe('updateResume', () => {
    const userId = 'user-1';
    const resumeId = 'resume-1';
    const updateData = {
      title: 'Updated Resume',
      summary: 'Updated summary',
      skills: ['Node.js', 'Python'],
    };

    it('should update resume successfully', async () => {
      // Given: resume exists and belongs to user
      const existingResume = {
        id: resumeId,
        userId,
        title: 'Old Resume',
        parsedContent: { summary: 'Old summary' },
      };

      prisma.resume.findUnique.mockResolvedValue(existingResume);

      // Given: update succeeds
      const updatedResume = {
        ...existingResume,
        ...updateData,
        parsedContent: {
          ...existingResume.parsedContent,
          summary: updateData.summary,
          skills: updateData.skills,
        },
        updatedAt: new Date(),
      };

      prisma.resume.update.mockResolvedValue(updatedResume);

      // When: updateResume is called
      const result = await service.updateResume(userId, resumeId, updateData);

      // Then: resume is updated
      expect(prisma.resume.findUnique).toHaveBeenCalledWith({
        where: { id: resumeId, userId },
      });
      expect(prisma.resume.update).toHaveBeenCalledWith({
        where: { id: resumeId },
        data: expect.objectContaining({
          title: updateData.title,
          parsedContent: expect.objectContaining({
            summary: updateData.summary,
            skills: updateData.skills,
          }),
        }),
      });
      expect(result).toEqual(updatedResume);
    });

    it('should throw NotFoundException if resume not found', async () => {
      // Given: resume doesn't exist
      prisma.resume.findUnique.mockResolvedValue(null);

      // When/Then: updateResume should throw NotFoundException
      await expect(service.updateResume(userId, resumeId, updateData)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.resume.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteResume', () => {
    const userId = 'user-1';
    const resumeId = 'resume-1';

    it('should delete resume successfully', async () => {
      // Given: resume exists and belongs to user
      const existingResume = {
        id: resumeId,
        userId,
        title: 'Resume to delete',
      };

      prisma.resume.findUnique.mockResolvedValue(existingResume);
      prisma.resume.delete.mockResolvedValue(existingResume);

      // When: deleteResume is called
      const result = await service.deleteResume(userId, resumeId);

      // Then: resume is deleted
      expect(prisma.resume.findUnique).toHaveBeenCalledWith({
        where: { id: resumeId, userId },
      });
      expect(prisma.resume.delete).toHaveBeenCalledWith({
        where: { id: resumeId },
      });
      expect(result).toEqual({ success: true, message: 'Resume deleted successfully' });
    });

    it('should throw NotFoundException if resume not found', async () => {
      // Given: resume doesn't exist
      prisma.resume.findUnique.mockResolvedValue(null);

      // When/Then: deleteResume should throw NotFoundException
      await expect(service.deleteResume(userId, resumeId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.resume.delete).not.toHaveBeenCalled();
    });
  });

  describe('createVersion', () => {
    const userId = 'user-1';
    const resumeId = 'resume-1';
    const versionData = {
      changes: {
        summary: 'Updated for specific job',
        skills: ['Added AWS', 'Added Docker'],
      },
      changeReason: 'Tailored for DevOps position',
    };

    it('should create new version successfully', async () => {
      // Given: parent resume exists
      const parentResume = {
        id: resumeId,
        userId,
        title: 'Original Resume',
        parsedContent: {
          summary: 'Original summary',
          skills: ['JavaScript', 'React'],
        },
        version: 1,
      };

      prisma.resume.findUnique.mockResolvedValue(parentResume);

      // Given: transaction succeeds
      const newVersion = {
        id: 'version-1',
        parentResumeId: resumeId,
        userId,
        title: 'Original Resume - Version 2',
        parsedContent: {
          ...parentResume.parsedContent,
          ...versionData.changes,
        },
        version: 2,
        changeReason: versionData.changeReason,
        createdAt: new Date(),
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        const mockPrismaTransaction = {
          resumeVersion: {
            create: jest.fn().mockResolvedValue(newVersion),
          },
          resume: {
            update: jest.fn().mockResolvedValue({ ...parentResume, version: 2 }),
          },
        };
        return callback(mockPrismaTransaction);
      });

      // When: createVersion is called
      const result = await service.createVersion(userId, resumeId, versionData);

      // Then: version is created
      expect(prisma.resume.findUnique).toHaveBeenCalledWith({
        where: { id: resumeId, userId },
      });
      expect(result).toEqual(expect.objectContaining({
        id: newVersion.id,
        parentResumeId: resumeId,
        version: 2,
        changeReason: versionData.changeReason,
      }));
    });

    it('should throw NotFoundException if parent resume not found', async () => {
      // Given: resume doesn't exist
      prisma.resume.findUnique.mockResolvedValue(null);

      // When/Then: createVersion should throw NotFoundException
      await expect(service.createVersion(userId, resumeId, versionData)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});