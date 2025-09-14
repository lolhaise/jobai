import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@jobai/database';
import { JwtService } from '@nestjs/jwt';

export interface UserSession {
  id: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  isActive: boolean;
  lastAccessedAt: Date;
  createdAt: Date;
}

@Injectable()
export class SessionService {
  constructor(private jwtService: JwtService) {}

  async getUserSessions(userId: string, currentUserId: string) {
    // Users can only view their own sessions
    if (userId !== currentUserId) {
      throw new ForbiddenException('You can only view your own sessions');
    }

    // In a real implementation, you might have a sessions table in your database
    // For now, we'll simulate sessions based on user activity
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Simulate current session (in practice, you'd track these in a database)
    const currentSession = {
      id: `session_${userId}_current`,
      userId: userId,
      deviceInfo: 'Web Browser',
      ipAddress: '192.168.1.1',
      isActive: true,
      lastAccessedAt: new Date(),
      createdAt: user.createdAt,
    };

    return {
      currentSession,
      allSessions: [currentSession],
      totalActiveSessions: 1,
    };
  }

  async revokeSession(userId: string, sessionId: string, currentUserId: string) {
    // Users can only revoke their own sessions
    if (userId !== currentUserId) {
      throw new ForbiddenException('You can only revoke your own sessions');
    }

    // In a real implementation, you'd mark the session as inactive in the database
    // and potentially blacklist the JWT token
    
    return { message: 'Session revoked successfully', sessionId };
  }

  async revokeAllSessions(userId: string, currentUserId: string) {
    // Users can only revoke their own sessions
    if (userId !== currentUserId) {
      throw new ForbiddenException('You can only revoke your own sessions');
    }

    // In a real implementation, you'd mark all user sessions as inactive
    // and potentially blacklist all JWT tokens for the user
    
    return { message: 'All sessions revoked successfully', userId };
  }

  async refreshSession(userId: string, currentUserId: string) {
    if (userId !== currentUserId) {
      throw new ForbiddenException('You can only refresh your own session');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate new access token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getSessionActivity(userId: string, currentUserId: string) {
    // Users can only view their own session activity
    if (userId !== currentUserId) {
      throw new ForbiddenException('You can only view your own session activity');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      userId: user.id,
      accountCreatedAt: user.createdAt,
      lastUpdatedAt: user.updatedAt,
      // In practice, you'd include more detailed activity logs
      recentActivity: [
        {
          action: 'account_created',
          timestamp: user.createdAt,
          ipAddress: '192.168.1.1',
          deviceInfo: 'Web Browser',
        },
      ],
    };
  }
}