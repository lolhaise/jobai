// Security Module - Central security configuration for the application
// Handles authentication, authorization, encryption, and protection mechanisms

import { Module, Global } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HelmetMiddleware } from './middleware/helmet.middleware';
import { CorsMiddleware } from './middleware/cors.middleware';
import { SecurityService } from './services/security.service';
import { EncryptionService } from './services/encryption.service';
import { XssProtectionService } from './services/xss-protection.service';
import { SqlInjectionGuard } from './guards/sql-injection.guard';
import { SecurityHeadersInterceptor } from './interceptors/security-headers.interceptor';
import { DataSanitizerInterceptor } from './interceptors/data-sanitizer.interceptor';
import { AuditLogService } from './services/audit-log.service';
import { IpBlockingService } from './services/ip-blocking.service';
import { SessionSecurityService } from './services/session-security.service';

@Global()
@Module({
  imports: [
    // Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
      },
    ]),
  ],
  providers: [
    SecurityService,
    EncryptionService,
    XssProtectionService,
    AuditLogService,
    IpBlockingService,
    SessionSecurityService,
    
    // Global guards
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SqlInjectionGuard,
    },
    
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityHeadersInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DataSanitizerInterceptor,
    },
  ],
  exports: [
    SecurityService,
    EncryptionService,
    XssProtectionService,
    AuditLogService,
    IpBlockingService,
    SessionSecurityService,
  ],
})
export class SecurityModule {}