// SQL Injection Guard - Prevents SQL injection attacks
// Validates all incoming requests for malicious SQL patterns

import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class SqlInjectionGuard implements CanActivate {
  // SQL injection patterns to detect
  private readonly sqlPatterns = [
    // Basic SQL injection
    /('|")(\s*)(or|OR|and|AND)(\s*)('|"|\d+)(\s*)=(\s*)('|"|\d+)/,
    // Comments
    /--[^\r\n]*/,
    /\/\*[\s\S]*?\*\//,
    // Union operations
    /\b(union|UNION)(\s+)(select|SELECT|all|ALL)\b/,
    // Database operations
    /\b(drop|DROP|create|CREATE|alter|ALTER|truncate|TRUNCATE)\s+(table|TABLE|database|DATABASE|schema|SCHEMA)\b/,
    // System operations
    /\b(exec|EXEC|execute|EXECUTE|xp_|sp_)\w+/,
    // Information schema
    /\b(information_schema|INFORMATION_SCHEMA|sysobjects|SYSOBJECTS|syscolumns|SYSCOLUMNS)\b/,
    // Time-based injection
    /\b(sleep|SLEEP|waitfor|WAITFOR|delay|DELAY|benchmark|BENCHMARK)\b\s*\(/,
    // Boolean-based injection
    /\b(having|HAVING|group\s+by|GROUP\s+BY)\b/,
    // Stacked queries
    /;\s*(select|SELECT|insert|INSERT|update|UPDATE|delete|DELETE)/,
    // Special characters
    /[\x00-\x1F\x7F]/,
  ];

  // NoSQL injection patterns
  private readonly noSqlPatterns = [
    /\$where/,
    /\$regex/,
    /\$ne/,
    /\$gt/,
    /\$lt/,
    /\$gte/,
    /\$lte/,
    /\$in/,
    /\$nin/,
    /\$exists/,
    /\$type/,
    /\$mod/,
    /\$text/,
    /\$elemMatch/,
    /\.\$\./,
  ];

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Check all request data
    this.checkForInjection(request.query, 'Query parameters');
    this.checkForInjection(request.params, 'URL parameters');
    this.checkForInjection(request.body, 'Request body');
    this.checkForInjection(request.headers, 'Headers');
    
    return true;
  }

  // Check for SQL/NoSQL injection in data
  private checkForInjection(data: any, source: string): void {
    if (!data) return;

    // Convert to string for pattern matching
    const dataString = this.stringify(data);
    
    // Check SQL patterns
    for (const pattern of this.sqlPatterns) {
      if (pattern.test(dataString)) {
        console.warn(`SQL injection attempt detected in ${source}:`, pattern);
        throw new BadRequestException({
          message: 'Potentially malicious request detected',
          error: 'SECURITY_VIOLATION',
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    // Check NoSQL patterns
    for (const pattern of this.noSqlPatterns) {
      if (pattern.test(dataString)) {
        console.warn(`NoSQL injection attempt detected in ${source}:`, pattern);
        throw new BadRequestException({
          message: 'Potentially malicious request detected',
          error: 'SECURITY_VIOLATION',
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    // Deep check for objects
    if (typeof data === 'object') {
      this.deepCheck(data, source);
    }
  }

  // Convert data to string for pattern matching
  private stringify(data: any): string {
    if (typeof data === 'string') {
      return data;
    }
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data);
      } catch {
        return String(data);
      }
    }
    return String(data);
  }

  // Deep check for nested objects
  private deepCheck(obj: any, source: string, depth: number = 0): void {
    // Prevent infinite recursion
    if (depth > 10) return;
    
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'string') {
          this.checkString(item, source);
        } else if (typeof item === 'object' && item !== null) {
          this.deepCheck(item, source, depth + 1);
        }
      }
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        // Check the key itself
        this.checkString(key, source);
        
        // Check the value
        if (typeof value === 'string') {
          this.checkString(value, source);
        } else if (typeof value === 'object' && value !== null) {
          this.deepCheck(value, source, depth + 1);
        }
      }
    }
  }

  // Check individual string for injection
  private checkString(str: string, source: string): void {
    // Check SQL patterns
    for (const pattern of this.sqlPatterns) {
      if (pattern.test(str)) {
        console.warn(`SQL injection in ${source}:`, str);
        throw new BadRequestException('Invalid input detected');
      }
    }
    
    // Check NoSQL patterns
    for (const pattern of this.noSqlPatterns) {
      if (pattern.test(str)) {
        console.warn(`NoSQL injection in ${source}:`, str);
        throw new BadRequestException('Invalid input detected');
      }
    }
    
    // Check for encoded patterns
    this.checkEncodedPatterns(str, source);
  }

  // Check for encoded injection attempts
  private checkEncodedPatterns(str: string, source: string): void {
    // URL decode and check
    try {
      const decoded = decodeURIComponent(str);
      if (decoded !== str) {
        // Check decoded string
        for (const pattern of [...this.sqlPatterns, ...this.noSqlPatterns]) {
          if (pattern.test(decoded)) {
            console.warn(`Encoded injection in ${source}:`, str);
            throw new BadRequestException('Invalid encoded input');
          }
        }
      }
    } catch {
      // Invalid encoding, possibly an attack
    }
    
    // Base64 decode and check
    if (this.isBase64(str)) {
      try {
        const decoded = Buffer.from(str, 'base64').toString('utf-8');
        for (const pattern of [...this.sqlPatterns, ...this.noSqlPatterns]) {
          if (pattern.test(decoded)) {
            console.warn(`Base64 encoded injection in ${source}:`, str);
            throw new BadRequestException('Invalid encoded input');
          }
        }
      } catch {
        // Invalid base64, ignore
      }
    }
    
    // Hex decode and check
    if (this.isHex(str)) {
      try {
        const decoded = Buffer.from(str, 'hex').toString('utf-8');
        for (const pattern of [...this.sqlPatterns, ...this.noSqlPatterns]) {
          if (pattern.test(decoded)) {
            console.warn(`Hex encoded injection in ${source}:`, str);
            throw new BadRequestException('Invalid encoded input');
          }
        }
      } catch {
        // Invalid hex, ignore
      }
    }
  }

  // Check if string is base64
  private isBase64(str: string): boolean {
    const base64Regex = /^[A-Za-z0-9+/]*(=|==)?$/;
    return base64Regex.test(str) && str.length % 4 === 0;
  }

  // Check if string is hex
  private isHex(str: string): boolean {
    const hexRegex = /^[0-9A-Fa-f]+$/;
    return hexRegex.test(str) && str.length % 2 === 0;
  }
}