// Data Sanitizer Interceptor - Sanitizes all outgoing data
// Prevents sensitive data leakage and XSS in responses

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { XssProtectionService } from '../services/xss-protection.service';

@Injectable()
export class DataSanitizerInterceptor implements NestInterceptor {
  // Sensitive fields to redact
  private readonly sensitiveFields = [
    'password',
    'passwordHash',
    'ssn',
    'creditCard',
    'bankAccount',
    'apiKey',
    'secretKey',
    'accessToken',
    'refreshToken',
    'privateKey',
  ];

  constructor(
    private readonly xssProtectionService: XssProtectionService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => this.sanitizeResponse(data)),
    );
  }

  // Sanitize response data
  private sanitizeResponse(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      // Sanitize string for XSS
      return this.xssProtectionService.sanitizeText(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeResponse(item));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Check for sensitive fields
        if (this.isSensitiveField(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          // Recursively sanitize
          sanitized[key] = this.sanitizeResponse(value);
        }
      }
      
      return sanitized;
    }

    return data;
  }

  // Check if field is sensitive
  private isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();
    return this.sensitiveFields.some(sensitive => 
      lowerField.includes(sensitive.toLowerCase())
    );
  }
}