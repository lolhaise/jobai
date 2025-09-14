// Main Security Service - Orchestrates all security features
// Provides centralized security operations and monitoring

import { Injectable, Logger } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { XssProtectionService } from './xss-protection.service';
import { RateLimiterService } from './rate-limiter.service';
import { AuditLogService } from './audit-log.service';
import { IpBlockingService } from './ip-blocking.service';
import { SessionSecurityService } from './session-security.service';
import * as crypto from 'crypto';

// Security event types
export enum SecurityEventType {
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  CSRF_ATTEMPT = 'CSRF_ATTEMPT',
}

// Security context for requests
export interface SecurityContext {
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  method: string;
  path: string;
  timestamp: Date;
  riskScore?: number;
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  
  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly xssProtectionService: XssProtectionService,
    private readonly rateLimiterService: RateLimiterService,
    private readonly auditLogService: AuditLogService,
    private readonly ipBlockingService: IpBlockingService,
    private readonly sessionSecurityService: SessionSecurityService,
  ) {}

  // Validate and sanitize input
  async validateInput(data: any, options?: {
    allowHtml?: boolean;
    checkSql?: boolean;
    checkXss?: boolean;
  }): Promise<any> {
    const opts = {
      allowHtml: false,
      checkSql: true,
      checkXss: true,
      ...options,
    };

    // Check for XSS
    if (opts.checkXss && this.xssProtectionService.detectXSS(JSON.stringify(data))) {
      await this.logSecurityEvent(SecurityEventType.XSS_ATTEMPT, { data });
      throw new Error('Potential XSS attack detected');
    }

    // Sanitize based on content type
    if (opts.allowHtml) {
      return this.xssProtectionService.sanitizeHtml(data);
    } else {
      return this.xssProtectionService.sanitizeJSON(data);
    }
  }

  // Generate CSRF token
  generateCSRFToken(sessionId: string): string {
    const secret = process.env.CSRF_SECRET || 'default-csrf-secret';
    const token = crypto
      .createHmac('sha256', secret)
      .update(sessionId + Date.now())
      .digest('hex');
    
    return token;
  }

  // Validate CSRF token
  validateCSRFToken(token: string, sessionId: string): boolean {
    // Implementation would check against stored tokens
    // For now, basic validation
    return token && token.length === 64;
  }

  // Calculate security risk score
  async calculateRiskScore(context: SecurityContext): Promise<number> {
    let score = 0;

    // Check IP reputation
    const ipRisk = await this.ipBlockingService.checkIPReputation(context.ipAddress);
    score += ipRisk * 30;

    // Check session anomalies
    const sessionRisk = await this.sessionSecurityService.checkSessionAnomaly(
      context.sessionId || '',
      context.ipAddress,
      context.userAgent
    );
    score += sessionRisk ? 20 : 0;

    // Check request patterns
    const stats = await this.rateLimiterService.getStatistics();
    if (stats.topOffenders.includes(context.ipAddress)) {
      score += 25;
    }

    // Check time-based risk (odd hours)
    const hour = new Date().getHours();
    if (hour >= 0 && hour <= 6) {
      score += 10;
    }

    // Check for suspicious user agents
    const suspiciousAgents = ['curl', 'wget', 'python', 'scrapy', 'bot'];
    if (suspiciousAgents.some(agent => context.userAgent.toLowerCase().includes(agent))) {
      score += 15;
    }

    return Math.min(100, score);
  }

  // Log security event
  async logSecurityEvent(
    eventType: SecurityEventType,
    details: any,
    context?: Partial<SecurityContext>
  ): Promise<void> {
    const event = {
      type: eventType,
      timestamp: new Date(),
      details,
      context,
      severity: this.getEventSeverity(eventType),
    };

    // Log to audit service
    await this.auditLogService.logEvent(event);

    // Log critical events
    if (event.severity === 'critical') {
      this.logger.error(`Critical security event: ${eventType}`, event);
      // Could trigger alerts here
    } else if (event.severity === 'high') {
      this.logger.warn(`Security event: ${eventType}`, event);
    } else {
      this.logger.log(`Security event: ${eventType}`);
    }
  }

  // Get event severity
  private getEventSeverity(eventType: SecurityEventType): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<SecurityEventType, 'low' | 'medium' | 'high' | 'critical'> = {
      [SecurityEventType.LOGIN_ATTEMPT]: 'low',
      [SecurityEventType.LOGIN_SUCCESS]: 'low',
      [SecurityEventType.LOGIN_FAILURE]: 'medium',
      [SecurityEventType.LOGOUT]: 'low',
      [SecurityEventType.PASSWORD_CHANGE]: 'medium',
      [SecurityEventType.PERMISSION_DENIED]: 'medium',
      [SecurityEventType.SUSPICIOUS_ACTIVITY]: 'high',
      [SecurityEventType.DATA_ACCESS]: 'low',
      [SecurityEventType.DATA_MODIFICATION]: 'medium',
      [SecurityEventType.SECURITY_VIOLATION]: 'critical',
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: 'medium',
      [SecurityEventType.XSS_ATTEMPT]: 'critical',
      [SecurityEventType.SQL_INJECTION_ATTEMPT]: 'critical',
      [SecurityEventType.CSRF_ATTEMPT]: 'high',
    };

    return severityMap[eventType] || 'medium';
  }

  // Perform security health check
  async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    metrics: Record<string, any>;
  }> {
    const issues: string[] = [];
    const metrics: Record<string, any> = {};

    // Check encryption
    try {
      const testData = 'test';
      const encrypted = this.encryptionService.encrypt(testData);
      const decrypted = this.encryptionService.decrypt(encrypted);
      if (decrypted !== testData) {
        issues.push('Encryption/decryption mismatch');
      }
      metrics.encryptionStatus = 'operational';
    } catch (error) {
      issues.push('Encryption service failure');
      metrics.encryptionStatus = 'failed';
    }

    // Check rate limiting
    const rateLimitStats = await this.rateLimiterService.getStatistics();
    metrics.blockedIPs = rateLimitStats.blockedIPs;
    metrics.activePatterns = rateLimitStats.activePatterns;
    
    if (rateLimitStats.blockedIPs > 100) {
      issues.push('High number of blocked IPs');
    }

    // Check audit logging
    const auditStats = await this.auditLogService.getStatistics();
    metrics.auditEvents = auditStats.totalEvents;
    metrics.criticalEvents = auditStats.criticalEvents;
    
    if (auditStats.criticalEvents > 10) {
      issues.push('Multiple critical security events detected');
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (issues.length > 0) {
      status = issues.some(issue => issue.includes('critical')) ? 'critical' : 'degraded';
    }

    return { status, issues, metrics };
  }

  // Encrypt sensitive data
  async encryptSensitiveData(data: any): Promise<string> {
    return this.encryptionService.encrypt(JSON.stringify(data));
  }

  // Decrypt sensitive data
  async decryptSensitiveData(encryptedData: string): Promise<any> {
    const decrypted = this.encryptionService.decrypt(encryptedData);
    return JSON.parse(decrypted);
  }

  // Hash password
  async hashPassword(password: string): Promise<string> {
    return this.encryptionService.hashPassword(password);
  }

  // Verify password
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return this.encryptionService.verifyPassword(password, hash);
  }

  // Generate secure token
  generateSecureToken(length: number = 32): string {
    return this.encryptionService.generateSecureToken(length);
  }

  // Validate request security
  async validateRequestSecurity(request: any): Promise<void> {
    const context: SecurityContext = {
      ipAddress: request.ip || request.connection?.remoteAddress,
      userAgent: request.headers?.['user-agent'] || 'unknown',
      method: request.method,
      path: request.path,
      timestamp: new Date(),
      userId: request.user?.id,
      sessionId: request.session?.id,
    };

    // Calculate risk score
    context.riskScore = await this.calculateRiskScore(context);

    // Block high-risk requests
    if (context.riskScore > 80) {
      await this.logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        { riskScore: context.riskScore },
        context
      );
      throw new Error('Request blocked due to high security risk');
    }

    // Apply rate limiting based on risk
    const rateLimitTier = context.riskScore > 50 ? 'strict' : 'normal';
    await this.rateLimiterService.checkRateLimit(context.ipAddress, rateLimitTier);
  }

  // Get security configuration
  getSecurityConfig(): Record<string, any> {
    return {
      encryption: {
        algorithm: 'aes-256-gcm',
        passwordHashRounds: 12,
      },
      rateLimit: {
        enabled: true,
        tiers: ['strict', 'normal', 'relaxed', 'auth'],
      },
      xss: {
        enabled: true,
        sanitizeHtml: true,
      },
      sql: {
        preventInjection: true,
        useParameterizedQueries: true,
      },
      csrf: {
        enabled: true,
        tokenLength: 64,
      },
      headers: {
        hsts: true,
        csp: true,
        xFrameOptions: 'DENY',
      },
    };
  }
}