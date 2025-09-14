import { INestApplication, Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';

/**
 * Test helper utilities for API testing
 */

export interface TestUser {
  id: string;
  email: string;
  name: string;
  password: string;
  accessToken: string;
  role: 'USER' | 'PREMIUM' | 'ADMIN';
}

export class TestHelper {
  private app: INestApplication;
  private prisma: PrismaService;
  private jwtService: JwtService;

  constructor(app: INestApplication) {
    this.app = app;
    this.prisma = app.get(PrismaService);
    this.jwtService = app.get(JwtService);
  }

  /**
   * Create a test user with authentication token
   */
  async createTestUser(data?: Partial<TestUser>): Promise<TestUser> {
    const timestamp = Date.now();
    const defaultData = {
      email: `test${timestamp}@example.com`,
      name: `Test User ${timestamp}`,
      password: 'Test123!@#',
      role: 'USER' as const,
    };

    const userData = { ...defaultData, ...data };

    // Create user via API
    const response = await request(this.app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: userData.email,
        password: userData.password,
        name: userData.name,
      })
      .expect(201);

    // Update role if needed
    if (userData.role !== 'USER') {
      await this.prisma.user.update({
        where: { id: response.body.user.id },
        data: { role: userData.role },
      });
    }

    return {
      ...userData,
      id: response.body.user.id,
      accessToken: response.body.access_token,
    };
  }

  /**
   * Create multiple test users
   */
  async createTestUsers(count: number): Promise<TestUser[]> {
    const users: TestUser[] = [];
    for (let i = 0; i < count; i++) {
      const user = await this.createTestUser({
        email: `test-user-${i}-${Date.now()}@example.com`,
        name: `Test User ${i}`,
      });
      users.push(user);
    }
    return users;
  }

  /**
   * Clean up test users
   */
  async cleanupTestUsers(emails?: string[]) {
    if (emails && emails.length > 0) {
      await this.prisma.user.deleteMany({
        where: {
          email: {
            in: emails,
          },
        },
      });
    } else {
      // Clean up all test users
      await this.prisma.user.deleteMany({
        where: {
          email: {
            startsWith: 'test',
          },
        },
      });
    }
  }

  /**
   * Create authenticated request helper
   */
  authenticatedRequest(token: string) {
    return {
      get: (url: string) =>
        request(this.app.getHttpServer())
          .get(url)
          .set('Authorization', `Bearer ${token}`),
      post: (url: string) =>
        request(this.app.getHttpServer())
          .post(url)
          .set('Authorization', `Bearer ${token}`),
      put: (url: string) =>
        request(this.app.getHttpServer())
          .put(url)
          .set('Authorization', `Bearer ${token}`),
      patch: (url: string) =>
        request(this.app.getHttpServer())
          .patch(url)
          .set('Authorization', `Bearer ${token}`),
      delete: (url: string) =>
        request(this.app.getHttpServer())
          .delete(url)
          .set('Authorization', `Bearer ${token}`),
    };
  }

  /**
   * Create test resume for user
   */
  async createTestResume(userId: string, data?: any) {
    return this.prisma.resume.create({
      data: {
        userId,
        title: data?.title || 'Test Resume',
        originalFileName: data?.originalFileName || 'test-resume.pdf',
        fileUrl: data?.fileUrl || 'https://storage.example.com/test-resume.pdf',
        parsedContent: data?.parsedContent || {
          personalInfo: {
            name: 'Test User',
            email: 'test@example.com',
            phone: '123-456-7890',
          },
          summary: 'Test summary',
          experience: [],
          education: [],
          skills: ['JavaScript', 'TypeScript'],
        },
        isActive: data?.isActive || false,
        version: data?.version || 1,
      },
    });
  }

  /**
   * Create test job
   */
  async createTestJob(data?: any) {
    return this.prisma.job.create({
      data: {
        externalId: data?.externalId || `job-${Date.now()}`,
        source: data?.source || 'TEST',
        title: data?.title || 'Test Job',
        company: data?.company || 'Test Company',
        location: data?.location || 'Remote',
        description: data?.description || 'Test job description',
        requirements: data?.requirements || ['3+ years experience'],
        salary: data?.salary || {
          min: 50000,
          max: 100000,
          currency: 'USD',
        },
        jobType: data?.jobType || 'FULL_TIME',
        experienceLevel: data?.experienceLevel || 'MID',
        postedAt: data?.postedAt || new Date(),
        applicationUrl: data?.applicationUrl || 'https://example.com/apply',
        isActive: data?.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  /**
   * Create test application
   */
  async createTestApplication(userId: string, jobId: string, data?: any) {
    return this.prisma.application.create({
      data: {
        userId,
        jobId,
        resumeId: data?.resumeId,
        coverLetterId: data?.coverLetterId,
        status: data?.status || 'APPLIED',
        appliedAt: data?.appliedAt || new Date(),
        notes: data?.notes || '',
      },
    });
  }

  /**
   * Seed database with test data
   */
  async seedDatabase() {
    // Create test users
    const users = await this.createTestUsers(3);
    
    // Create jobs
    const jobs = [];
    for (let i = 0; i < 10; i++) {
      const job = await this.createTestJob({
        title: `Test Job ${i}`,
        company: `Company ${i}`,
        salary: {
          min: 50000 + i * 10000,
          max: 100000 + i * 10000,
          currency: 'USD',
        },
      });
      jobs.push(job);
    }

    // Create resumes for users
    for (const user of users) {
      await this.createTestResume(user.id, {
        title: `${user.name}'s Resume`,
      });
    }

    return { users, jobs };
  }

  /**
   * Wait for condition with timeout
   */
  async waitFor(
    condition: () => Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100,
  ): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error('Timeout waiting for condition');
  }

  /**
   * Generate mock file for upload testing
   */
  generateMockFile(type: 'pdf' | 'docx' | 'txt' = 'pdf') {
    const mimeTypes = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
    };

    return {
      fieldname: 'file',
      originalname: `test-file.${type}`,
      encoding: '7bit',
      mimetype: mimeTypes[type],
      buffer: Buffer.from('mock file content'),
      size: 1024,
    };
  }

  /**
   * Assert pagination response structure
   */
  assertPaginationResponse(response: any) {
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('total');
    expect(response).toHaveProperty('page');
    expect(response).toHaveProperty('limit');
    expect(response).toHaveProperty('totalPages');
    expect(Array.isArray(response.data)).toBe(true);
  }

  /**
   * Assert error response structure
   */
  assertErrorResponse(response: any, statusCode: number) {
    expect(response.status).toBe(statusCode);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('statusCode');
    expect(response.body.statusCode).toBe(statusCode);
  }

  /**
   * Create test module with mocked dependencies
   */
  static async createTestModule(
    moduleClass: Type<any>,
    providers?: any[],
  ): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: [moduleClass],
      providers: providers || [],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user: {
          create: jest.fn(),
          findMany: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        resume: {
          create: jest.fn(),
          findMany: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        job: {
          create: jest.fn(),
          findMany: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        application: {
          create: jest.fn(),
          findMany: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        $transaction: jest.fn(),
      })
      .compile();
  }
}

/**
 * Test data factory for generating consistent test data
 */
export class TestDataFactory {
  static createUser(overrides?: Partial<any>) {
    const timestamp = Date.now();
    return {
      id: `user-${timestamp}`,
      email: `test${timestamp}@example.com`,
      name: `Test User ${timestamp}`,
      password: 'hashedPassword',
      role: 'USER',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createResume(userId: string, overrides?: Partial<any>) {
    const timestamp = Date.now();
    return {
      id: `resume-${timestamp}`,
      userId,
      title: 'Test Resume',
      originalFileName: 'resume.pdf',
      fileUrl: 'https://storage.example.com/resume.pdf',
      parsedContent: {
        personalInfo: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '123-456-7890',
        },
        summary: 'Experienced professional',
        experience: [],
        education: [],
        skills: ['JavaScript', 'TypeScript'],
      },
      isActive: false,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createJob(overrides?: Partial<any>) {
    const timestamp = Date.now();
    return {
      id: `job-${timestamp}`,
      externalId: `ext-${timestamp}`,
      source: 'TEST',
      title: 'Software Engineer',
      company: 'Tech Corp',
      location: 'Remote',
      description: 'We are looking for a software engineer',
      requirements: ['3+ years experience', 'JavaScript'],
      salary: {
        min: 80000,
        max: 120000,
        currency: 'USD',
      },
      jobType: 'FULL_TIME',
      experienceLevel: 'MID',
      postedAt: new Date(),
      applicationUrl: 'https://example.com/apply',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createApplication(
    userId: string,
    jobId: string,
    overrides?: Partial<any>,
  ) {
    const timestamp = Date.now();
    return {
      id: `app-${timestamp}`,
      userId,
      jobId,
      status: 'APPLIED',
      appliedAt: new Date(),
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
}

/**
 * Custom test matchers
 */
export const customMatchers = {
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid date`
          : `Expected ${received} to be a valid date`,
    };
  },

  toBeValidUUID(received: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid UUID`
          : `Expected ${received} to be a valid UUID`,
    };
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid email`
          : `Expected ${received} to be a valid email`,
    };
  },

  toBeValidJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
    const pass = jwtRegex.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid JWT`
          : `Expected ${received} to be a valid JWT`,
    };
  },
};