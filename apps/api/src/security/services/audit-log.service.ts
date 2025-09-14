// Audit Log Service - Tracks all security-related events
// Provides forensic capabilities and compliance logging

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@jobai/database';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

// Audit log entry interface
export interface AuditLogEntry {
  id?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resource?: string;
  details: Record<string, any>;
  success: boolean;
  errorMessage?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // Log an audit event
  async logEvent(event: Partial<AuditLogEntry>): Promise<void> {
    const entry: AuditLogEntry = {
      type: event.type || 'UNKNOWN',
      severity: event.severity || 'low',
      timestamp: event.timestamp || new Date(),
      action: event.action || 'UNKNOWN',
      details: event.details || {},
      success: event.success ?? true,
      ...event,
    };

    // Store in database for persistence
    await this.storeInDatabase(entry);
    
    // Store in Redis for real-time access
    await this.storeInRedis(entry);
    
    // Trigger alerts for critical events
    if (entry.severity === 'critical') {
      await this.triggerAlert(entry);
    }
  }

  // Store audit log in database
  private async storeInDatabase(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          type: entry.type,
          action: entry.action,
          userId: entry.userId,
          metadata: entry.details as any,
          createdAt: entry.timestamp,
        },
      });
    } catch (error) {
      console.error('Failed to store audit log in database:', error);
    }
  }

  // Store in Redis for real-time monitoring
  private async storeInRedis(entry: AuditLogEntry): Promise<void> {
    const key = `audit:${entry.severity}:${Date.now()}`;
    await this.redis.set(key, JSON.stringify(entry), 'EX', 86400); // 24 hours
    
    // Add to sorted set for time-based queries
    await this.redis.zadd(
      'audit:timeline',
      entry.timestamp.getTime(),
      key
    );
  }

  // Trigger alert for critical events
  private async triggerAlert(entry: AuditLogEntry): Promise<void> {
    console.error('🚨 CRITICAL SECURITY EVENT:', entry);
    // Here you would integrate with alerting systems
    // like PagerDuty, Slack, email, etc.
  }

  // Get audit logs
  async getAuditLogs(options: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    severity?: string;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    const where: any = {};
    
    if (options.userId) {
      where.userId = options.userId;
    }
    
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const logs = await this.prisma.activityLog.findMany({
      where,
      take: options.limit || 100,
      orderBy: { createdAt: 'desc' },
    });

    return logs.map(log => ({
      id: log.id,
      type: log.type,
      severity: 'medium' as const,
      timestamp: log.createdAt,
      userId: log.userId || undefined,
      action: log.action,
      details: log.metadata as Record<string, any>,
      success: true,
    }));
  }

  // Get statistics
  async getStatistics(): Promise<{
    totalEvents: number;
    criticalEvents: number;
    recentEvents: number;
  }> {
    const now = Date.now();
    const hourAgo = now - 3600000;
    
    // Get recent events from Redis
    const recentKeys = await this.redis.zrangebyscore(
      'audit:timeline',
      hourAgo,
      now
    );

    // Count critical events
    const criticalPattern = 'audit:critical:*';
    const criticalKeys = await this.redis.keys(criticalPattern);

    return {
      totalEvents: await this.prisma.activityLog.count(),
      criticalEvents: criticalKeys.length,
      recentEvents: recentKeys.length,
    };
  }

  // Clean up old logs
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}