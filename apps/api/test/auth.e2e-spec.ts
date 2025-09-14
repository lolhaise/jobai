import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth Controller (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    prisma = app.get(PrismaService);
    
    await app.init();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'test',
        },
      },
    });
    await app.close();
  });

  describe('/auth/signup (POST)', () => {
    it('should register a new user', async () => {
      // When: signup request is made with valid data
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test.e2e@example.com',
          password: 'Test123!@#',
          name: 'Test User',
        })
        .expect(201);

      // Then: response contains access token and user data
      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user).toMatchObject({
        email: 'test.e2e@example.com',
        name: 'Test User',
        role: 'USER',
      });
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 400 for invalid email format', async () => {
      // When: signup request with invalid email
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'Test123!@#',
          name: 'Test User',
        })
        .expect(400);

      // Then: error message is returned
      expect(response.body.message).toContain('email must be an email');
    });

    it('should return 400 for weak password', async () => {
      // When: signup request with weak password
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test2@example.com',
          password: '123',
          name: 'Test User',
        })
        .expect(400);

      // Then: error message is returned
      expect(response.body.message).toContain('password must be longer than or equal to 8 characters');
    });

    it('should return 409 for duplicate email', async () => {
      // Given: user already exists
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test.duplicate@example.com',
          password: 'Test123!@#',
          name: 'Test User',
        })
        .expect(201);

      // When: signup with same email
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test.duplicate@example.com',
          password: 'Test123!@#',
          name: 'Another User',
        })
        .expect(409);

      // Then: conflict error is returned
      expect(response.body.message).toContain('Email already registered');
    });
  });

  describe('/auth/signin (POST)', () => {
    beforeAll(async () => {
      // Setup: create a test user
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test.signin@example.com',
          password: 'Test123!@#',
          name: 'Signin Test User',
        });
    });

    it('should signin with valid credentials', async () => {
      // When: signin request with valid credentials
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: 'test.signin@example.com',
          password: 'Test123!@#',
        })
        .expect(200);

      // Then: response contains access token and user data
      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user).toMatchObject({
        email: 'test.signin@example.com',
        name: 'Signin Test User',
      });
    });

    it('should return 401 for invalid password', async () => {
      // When: signin with wrong password
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: 'test.signin@example.com',
          password: 'WrongPassword',
        })
        .expect(401);

      // Then: unauthorized error is returned
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      // When: signin with non-existent email
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!@#',
        })
        .expect(401);

      // Then: unauthorized error is returned
      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('/auth/me (GET)', () => {
    let accessToken: string;
    let userId: string;

    beforeAll(async () => {
      // Setup: create user and get token
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test.me@example.com',
          password: 'Test123!@#',
          name: 'Me Test User',
        });

      accessToken = response.body.access_token;
      userId = response.body.user.id;
    });

    it('should return current user with valid token', async () => {
      // When: request with valid token
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Then: user data is returned
      expect(response.body).toMatchObject({
        id: userId,
        email: 'test.me@example.com',
        name: 'Me Test User',
        role: 'USER',
      });
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      // When: request without token
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      // When: request with invalid token
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/auth/refresh (POST)', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      // Setup: create user and get tokens
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test.refresh@example.com',
          password: 'Test123!@#',
          name: 'Refresh Test User',
        });

      accessToken = response.body.access_token;
      refreshToken = response.body.refresh_token;
    });

    it('should refresh access token with valid refresh token', async () => {
      // When: refresh request with valid token
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: refreshToken,
        })
        .expect(200);

      // Then: new access token is returned
      expect(response.body).toHaveProperty('access_token');
      expect(response.body.access_token).not.toBe(accessToken);
    });

    it('should return 401 with invalid refresh token', async () => {
      // When: refresh with invalid token
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: 'invalid-refresh-token',
        })
        .expect(401);
    });
  });

  describe('/auth/logout (POST)', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Setup: create user and get token
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test.logout@example.com',
          password: 'Test123!@#',
          name: 'Logout Test User',
        });

      accessToken = response.body.access_token;
    });

    it('should logout successfully', async () => {
      // When: logout request with valid token
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Then: success message is returned
      expect(response.body).toMatchObject({
        success: true,
        message: 'Logged out successfully',
      });
    });

    it('should return 401 without token', async () => {
      // When: logout without token
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });
});