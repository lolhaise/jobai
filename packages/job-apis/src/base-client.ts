import PQueue from 'p-queue';
import { APIClientConfig } from './types';

export abstract class BaseAPIClient {
  protected rateLimiter: PQueue;
  protected cacheEnabled: boolean;
  protected cacheTTL: number;

  constructor(config: APIClientConfig = {}) {
    // Configure rate limiting
    const rateLimit = config.rateLimit || 100; // requests per minute
    this.rateLimiter = new PQueue({
      concurrency: Math.min(rateLimit / 10, 10), // Max 10 concurrent requests
      interval: 60000, // 1 minute
      intervalCap: rateLimit,
    });

    this.cacheEnabled = config.cacheEnabled !== false;
    this.cacheTTL = config.cacheTTL || 3600000; // 1 hour default
  }

  protected async withRetry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }

      console.log(`Retrying after ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return this.withRetry(fn, retries - 1, delay * 2);
    }
  }

  protected sanitizeString(str: string | undefined | null): string {
    if (!str) return '';
    
    // Remove excessive whitespace
    return str.replace(/\s+/g, ' ').trim();
  }

  protected extractUrls(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches || [];
  }

  protected extractEmails(text: string): string[] {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
    const matches = text.match(emailRegex);
    return matches || [];
  }
}