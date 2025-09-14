// IP Blocking Service - Manages IP reputation and blocking
// Implements IP-based security measures and geolocation checks

import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as geoip from 'geoip-lite';

// IP reputation levels
export enum IPReputation {
  TRUSTED = 0,
  NORMAL = 1,
  SUSPICIOUS = 2,
  MALICIOUS = 3,
  BLOCKED = 4,
}

@Injectable()
export class IpBlockingService {
  // Known malicious IP ranges
  private readonly maliciousRanges = [
    '10.0.0.0/8',      // Private network (sometimes used in attacks)
    '192.168.0.0/16',  // Private network
    '172.16.0.0/12',   // Private network
  ];

  // Trusted IP ranges (e.g., office IPs)
  private readonly trustedRanges = [
    // Add your trusted IP ranges here
  ];

  // Countries to block (if needed for compliance)
  private readonly blockedCountries = [
    // Add country codes if needed, e.g., 'CN', 'RU'
  ];

  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // Check IP reputation
  async checkIPReputation(ip: string): Promise<number> {
    // Check if IP is blocked
    if (await this.isIPBlocked(ip)) {
      return IPReputation.BLOCKED;
    }

    // Check if IP is trusted
    if (this.isIPTrusted(ip)) {
      return IPReputation.TRUSTED;
    }

    // Check if IP is in malicious range
    if (this.isIPMalicious(ip)) {
      return IPReputation.MALICIOUS;
    }

    // Check geolocation
    const geoRisk = await this.checkGeolocation(ip);
    if (geoRisk > 0) {
      return IPReputation.SUSPICIOUS;
    }

    // Check reputation database
    const reputation = await this.getStoredReputation(ip);
    if (reputation !== null) {
      return reputation;
    }

    return IPReputation.NORMAL;
  }

  // Block an IP address
  async blockIP(ip: string, duration: number = 86400000, reason?: string): Promise<void> {
    const key = `ip:blocked:${ip}`;
    const data = {
      blockedAt: Date.now(),
      duration,
      reason: reason || 'Security violation',
    };
    
    await this.redis.set(key, JSON.stringify(data), 'PX', duration);
    
    // Log the block
    console.warn(`Blocked IP ${ip} for ${duration}ms: ${reason}`);
  }

  // Unblock an IP address
  async unblockIP(ip: string): Promise<void> {
    const key = `ip:blocked:${ip}`;
    await this.redis.del(key);
    console.log(`Unblocked IP ${ip}`);
  }

  // Check if IP is blocked
  async isIPBlocked(ip: string): Promise<boolean> {
    const key = `ip:blocked:${ip}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  // Check if IP is trusted
  private isIPTrusted(ip: string): boolean {
    // Localhost is always trusted
    if (ip === '127.0.0.1' || ip === '::1') {
      return true;
    }

    // Check trusted ranges
    for (const range of this.trustedRanges) {
      if (this.isIPInRange(ip, range)) {
        return true;
      }
    }

    return false;
  }

  // Check if IP is malicious
  private isIPMalicious(ip: string): boolean {
    // Check known malicious ranges
    for (const range of this.maliciousRanges) {
      if (this.isIPInRange(ip, range)) {
        return true;
      }
    }

    return false;
  }

  // Check geolocation risks
  private async checkGeolocation(ip: string): Promise<number> {
    try {
      const geo = geoip.lookup(ip);
      
      if (!geo) {
        // Unknown location is slightly suspicious
        return 1;
      }

      // Check if country is blocked
      if (this.blockedCountries.includes(geo.country)) {
        return 3;
      }

      // Check for VPN/proxy indicators
      if (await this.isVPN(ip)) {
        return 2;
      }

      return 0;
    } catch (error) {
      console.error('Geolocation check failed:', error);
      return 0;
    }
  }

  // Check if IP is a VPN/proxy
  private async isVPN(ip: string): Promise<boolean> {
    // Check known VPN providers
    const vpnKey = `ip:vpn:${ip}`;
    const cached = await this.redis.get(vpnKey);
    
    if (cached !== null) {
      return cached === 'true';
    }

    // Here you would integrate with a VPN detection service
    // For now, basic heuristic
    const geo = geoip.lookup(ip);
    if (geo) {
      // Check for datacenter IPs (common for VPNs)
      const datacenterCountries = ['NL', 'DE', 'US', 'GB', 'SG'];
      const isDatacenter = datacenterCountries.includes(geo.country);
      
      await this.redis.set(vpnKey, isDatacenter ? 'true' : 'false', 'EX', 3600);
      return isDatacenter;
    }

    return false;
  }

  // Get stored reputation
  private async getStoredReputation(ip: string): Promise<number | null> {
    const key = `ip:reputation:${ip}`;
    const value = await this.redis.get(key);
    
    if (value) {
      return parseInt(value);
    }
    
    return null;
  }

  // Update IP reputation
  async updateReputation(ip: string, reputation: IPReputation): Promise<void> {
    const key = `ip:reputation:${ip}`;
    await this.redis.set(key, reputation.toString(), 'EX', 86400); // 24 hours
  }

  // Check if IP is in CIDR range
  private isIPInRange(ip: string, range: string): boolean {
    // Simplified CIDR check
    // In production, use a proper CIDR library
    const [rangeIP, maskBits] = range.split('/');
    
    if (!maskBits) {
      return ip === rangeIP;
    }

    const ipParts = ip.split('.').map(Number);
    const rangeParts = rangeIP.split('.').map(Number);
    const mask = parseInt(maskBits);
    
    // Convert to 32-bit integers
    const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const rangeNum = (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3];
    
    // Apply mask
    const maskNum = (0xFFFFFFFF << (32 - mask)) >>> 0;
    
    return (ipNum & maskNum) === (rangeNum & maskNum);
  }

  // Get blocked IPs list
  async getBlockedIPs(): Promise<string[]> {
    const pattern = 'ip:blocked:*';
    const keys = await this.redis.keys(pattern);
    
    return keys.map(key => key.replace('ip:blocked:', ''));
  }

  // Get IP statistics
  async getIPStatistics(ip: string): Promise<{
    reputation: number;
    isBlocked: boolean;
    location: any;
    requests: number;
  }> {
    const reputation = await this.checkIPReputation(ip);
    const isBlocked = await this.isIPBlocked(ip);
    const location = geoip.lookup(ip);
    
    // Get request count
    const requestKey = `ip:requests:${ip}`;
    const requests = await this.redis.get(requestKey);
    
    return {
      reputation,
      isBlocked,
      location,
      requests: parseInt(requests || '0'),
    };
  }

  // Track IP request
  async trackIPRequest(ip: string): Promise<void> {
    const key = `ip:requests:${ip}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 3600); // Reset hourly
  }
}