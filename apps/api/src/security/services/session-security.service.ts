// Session Security Service - Manages session security and validation
// Prevents session hijacking, fixation, and other session-based attacks

import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';

// Session metadata interface
export interface SessionMetadata {
  id: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  fingerprint: string;
  rotationCount: number;
  suspicious: boolean;
}

@Injectable()
export class SessionSecurityService {
  private readonly sessionTimeout = 1800000; // 30 minutes
  private readonly maxSessionAge = 86400000; // 24 hours
  private readonly maxRotations = 10; // Max session rotations

  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // Create secure session
  async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const fingerprint = this.generateFingerprint(ipAddress, userAgent);
    
    const metadata: SessionMetadata = {
      id: sessionId,
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      ipAddress,
      userAgent,
      fingerprint,
      rotationCount: 0,
      suspicious: false,
    };

    // Store session
    await this.storeSession(sessionId, metadata);
    
    // Track active session for user
    await this.trackUserSession(userId, sessionId);
    
    return sessionId;
  }

  // Validate session
  async validateSession(
    sessionId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<boolean> {
    const metadata = await this.getSession(sessionId);
    
    if (!metadata) {
      return false;
    }

    // Check session age
    if (this.isSessionExpired(metadata)) {
      await this.terminateSession(sessionId);
      return false;
    }

    // Check for anomalies
    if (await this.checkSessionAnomaly(sessionId, ipAddress, userAgent)) {
      await this.markSessionSuspicious(sessionId);
      return false;
    }

    // Update last activity
    await this.updateSessionActivity(sessionId);
    
    return true;
  }

  // Check for session anomalies
  async checkSessionAnomaly(
    sessionId: string,
    currentIP: string,
    currentUserAgent: string
  ): Promise<boolean> {
    const metadata = await this.getSession(sessionId);
    
    if (!metadata) {
      return true; // Session doesn't exist
    }

    // Check IP change
    if (metadata.ipAddress !== currentIP) {
      console.warn(`Session ${sessionId} IP changed from ${metadata.ipAddress} to ${currentIP}`);
      
      // Check if IP change is from same subnet
      if (!this.isSameSubnet(metadata.ipAddress, currentIP)) {
        return true; // Suspicious IP change
      }
    }

    // Check user agent change
    if (metadata.userAgent !== currentUserAgent) {
      console.warn(`Session ${sessionId} user agent changed`);
      
      // Check if it's a minor version update
      if (!this.isSimilarUserAgent(metadata.userAgent, currentUserAgent)) {
        return true; // Suspicious user agent change
      }
    }

    // Check fingerprint
    const currentFingerprint = this.generateFingerprint(currentIP, currentUserAgent);
    if (metadata.fingerprint !== currentFingerprint) {
      // Fingerprint mismatch could indicate session hijacking
      return true;
    }

    // Check for concurrent sessions from different locations
    if (await this.detectConcurrentSessions(metadata.userId, currentIP)) {
      return true;
    }

    return false;
  }

  // Rotate session ID (prevent fixation)
  async rotateSession(oldSessionId: string): Promise<string> {
    const metadata = await this.getSession(oldSessionId);
    
    if (!metadata) {
      throw new Error('Session not found');
    }

    // Check rotation limit
    if (metadata.rotationCount >= this.maxRotations) {
      throw new Error('Session rotation limit exceeded');
    }

    // Generate new session ID
    const newSessionId = this.generateSessionId();
    
    // Update metadata
    metadata.id = newSessionId;
    metadata.rotationCount++;
    
    // Store new session
    await this.storeSession(newSessionId, metadata);
    
    // Delete old session
    await this.deleteSession(oldSessionId);
    
    // Update user's session tracking
    await this.updateUserSession(metadata.userId, oldSessionId, newSessionId);
    
    return newSessionId;
  }

  // Terminate session
  async terminateSession(sessionId: string): Promise<void> {
    const metadata = await this.getSession(sessionId);
    
    if (metadata) {
      // Remove from user's active sessions
      await this.removeUserSession(metadata.userId, sessionId);
    }
    
    // Delete session data
    await this.deleteSession(sessionId);
  }

  // Terminate all user sessions
  async terminateAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    
    for (const sessionId of sessions) {
      await this.deleteSession(sessionId);
    }
    
    // Clear user's session list
    await this.clearUserSessions(userId);
  }

  // Generate session ID
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate session fingerprint
  private generateFingerprint(ipAddress: string, userAgent: string): string {
    const data = `${ipAddress}:${userAgent}:${process.env.SESSION_SECRET || 'default'}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Store session
  private async storeSession(sessionId: string, metadata: SessionMetadata): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redis.set(
      key,
      JSON.stringify(metadata),
      'PX',
      this.sessionTimeout
    );
  }

  // Get session
  private async getSession(sessionId: string): Promise<SessionMetadata | null> {
    const key = `session:${sessionId}`;
    const data = await this.redis.get(key);
    
    if (data) {
      return JSON.parse(data);
    }
    
    return null;
  }

  // Delete session
  private async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redis.del(key);
  }

  // Update session activity
  private async updateSessionActivity(sessionId: string): Promise<void> {
    const metadata = await this.getSession(sessionId);
    
    if (metadata) {
      metadata.lastActivity = new Date();
      await this.storeSession(sessionId, metadata);
    }
  }

  // Mark session as suspicious
  private async markSessionSuspicious(sessionId: string): Promise<void> {
    const metadata = await this.getSession(sessionId);
    
    if (metadata) {
      metadata.suspicious = true;
      await this.storeSession(sessionId, metadata);
      console.warn(`Session ${sessionId} marked as suspicious`);
    }
  }

  // Check if session is expired
  private isSessionExpired(metadata: SessionMetadata): boolean {
    const now = Date.now();
    const createdAt = new Date(metadata.createdAt).getTime();
    const lastActivity = new Date(metadata.lastActivity).getTime();
    
    // Check absolute age
    if (now - createdAt > this.maxSessionAge) {
      return true;
    }
    
    // Check inactivity
    if (now - lastActivity > this.sessionTimeout) {
      return true;
    }
    
    return false;
  }

  // Check if IPs are in same subnet
  private isSameSubnet(ip1: string, ip2: string): boolean {
    // Simple check - in production use proper subnet comparison
    const parts1 = ip1.split('.');
    const parts2 = ip2.split('.');
    
    // Check if first 3 octets match (same /24 subnet)
    return parts1[0] === parts2[0] &&
           parts1[1] === parts2[1] &&
           parts1[2] === parts2[2];
  }

  // Check if user agents are similar
  private isSimilarUserAgent(ua1: string, ua2: string): boolean {
    // Extract browser and OS
    const extract = (ua: string) => {
      const browser = ua.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/)?.[0] || '';
      const os = ua.match(/(Windows|Mac|Linux|Android|iOS)/)?.[0] || '';
      return { browser, os };
    };
    
    const info1 = extract(ua1);
    const info2 = extract(ua2);
    
    // OS must match, browser can have minor version differences
    return info1.os === info2.os &&
           info1.browser.split('/')[0] === info2.browser.split('/')[0];
  }

  // Detect concurrent sessions
  private async detectConcurrentSessions(
    userId: string,
    currentIP: string
  ): Promise<boolean> {
    const sessions = await this.getUserSessions(userId);
    
    for (const sessionId of sessions) {
      const metadata = await this.getSession(sessionId);
      
      if (metadata && metadata.ipAddress !== currentIP) {
        // Check if both sessions are active
        const lastActivity = new Date(metadata.lastActivity).getTime();
        if (Date.now() - lastActivity < 60000) { // Active in last minute
          console.warn(`Concurrent sessions detected for user ${userId}`);
          return true;
        }
      }
    }
    
    return false;
  }

  // Track user session
  private async trackUserSession(userId: string, sessionId: string): Promise<void> {
    const key = `user:sessions:${userId}`;
    await this.redis.sadd(key, sessionId);
    await this.redis.expire(key, 86400); // 24 hours
  }

  // Update user session
  private async updateUserSession(
    userId: string,
    oldSessionId: string,
    newSessionId: string
  ): Promise<void> {
    const key = `user:sessions:${userId}`;
    await this.redis.srem(key, oldSessionId);
    await this.redis.sadd(key, newSessionId);
  }

  // Remove user session
  private async removeUserSession(userId: string, sessionId: string): Promise<void> {
    const key = `user:sessions:${userId}`;
    await this.redis.srem(key, sessionId);
  }

  // Get user sessions
  private async getUserSessions(userId: string): Promise<string[]> {
    const key = `user:sessions:${userId}`;
    return this.redis.smembers(key);
  }

  // Clear user sessions
  private async clearUserSessions(userId: string): Promise<void> {
    const key = `user:sessions:${userId}`;
    await this.redis.del(key);
  }
}