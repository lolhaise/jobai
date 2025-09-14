import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

// Mock the PrismaService
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  profile: {
    create: jest.fn(),
  },
};

// Mock the JwtService
const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: typeof mockPrismaService;
  let jwtService: typeof mockJwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('signup', () => {
    const signupDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should create a new user successfully', async () => {
      // Given: email doesn't exist
      prisma.user.findUnique.mockResolvedValue(null);
      
      // Given: user creation succeeds
      const hashedPassword = 'hashedPassword';
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve(hashedPassword));
      
      const newUser = {
        id: '1',
        email: signupDto.email,
        name: signupDto.name,
        password: hashedPassword,
        role: 'USER',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      prisma.user.create.mockResolvedValue(newUser);
      
      // Given: JWT token generation
      const token = 'jwt-token';
      jwtService.sign.mockReturnValue(token);

      // When: signup is called
      const result = await service.signup(signupDto);

      // Then: user is created with correct data
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: signupDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(signupDto.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: signupDto.email,
          password: hashedPassword,
          name: signupDto.name,
          role: 'USER',
          profile: {
            create: {
              fullName: signupDto.name,
            },
          },
        },
        include: {
          profile: true,
        },
      });
      expect(result).toEqual({
        access_token: token,
        user: expect.objectContaining({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        }),
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      // Given: email already exists
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: signupDto.email,
      });

      // When/Then: signup should throw ConflictException
      await expect(service.signup(signupDto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('signin', () => {
    const signinDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should signin user successfully with correct credentials', async () => {
      // Given: user exists with correct password
      const user = {
        id: '1',
        email: signinDto.email,
        password: 'hashedPassword',
        name: 'Test User',
        role: 'USER',
        emailVerified: true,
        profile: { id: '1' },
      };
      
      prisma.user.findFirst.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      
      const token = 'jwt-token';
      jwtService.sign.mockReturnValue(token);

      // When: signin is called
      const result = await service.signin(signinDto);

      // Then: token and user are returned
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: signinDto.email },
        include: { profile: true },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(signinDto.password, user.password);
      expect(result).toEqual({
        access_token: token,
        user: expect.objectContaining({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }),
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Given: user doesn't exist
      prisma.user.findFirst.mockResolvedValue(null);

      // When/Then: signin should throw UnauthorizedException
      await expect(service.signin(signinDto)).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      // Given: user exists but password is wrong
      const user = {
        id: '1',
        email: signinDto.email,
        password: 'hashedPassword',
      };
      
      prisma.user.findFirst.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      // When/Then: signin should throw UnauthorizedException
      await expect(service.signin(signinDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user if valid', async () => {
      // Given: valid user id
      const userId = '1';
      const user = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        profile: { id: '1' },
      };
      
      prisma.user.findUnique.mockResolvedValue(user);

      // When: validateUser is called
      const result = await service.validateUser(userId);

      // Then: user is returned
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: { profile: true },
      });
      expect(result).toEqual(user);
    });

    it('should return null if user not found', async () => {
      // Given: invalid user id
      const userId = 'invalid';
      prisma.user.findUnique.mockResolvedValue(null);

      // When: validateUser is called
      const result = await service.validateUser(userId);

      // Then: null is returned
      expect(result).toBeNull();
    });
  });
});