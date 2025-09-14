// Security Headers Interceptor - Adds security headers to all responses
// Implements OWASP recommended security headers

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    
    // Set security headers
    this.setSecurityHeaders(response);
    
    return next.handle().pipe(
      tap(() => {
        // Additional headers after response processing
        this.setResponseHeaders(response);
      }),
    );
  }

  private setSecurityHeaders(response: any): void {
    // Content Security Policy
    response.setHeader(
      'Content-Security-Policy',
      this.getCSP()
    );
    
    // Strict Transport Security (HSTS)
    response.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
    
    // X-Frame-Options - Prevent clickjacking
    response.setHeader('X-Frame-Options', 'DENY');
    
    // X-Content-Type-Options - Prevent MIME sniffing
    response.setHeader('X-Content-Type-Options', 'nosniff');
    
    // X-XSS-Protection - Enable XSS filter
    response.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer-Policy - Control referrer information
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions-Policy (formerly Feature-Policy)
    response.setHeader(
      'Permissions-Policy',
      this.getPermissionsPolicy()
    );
    
    // X-Permitted-Cross-Domain-Policies
    response.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    
    // X-Download-Options
    response.setHeader('X-Download-Options', 'noopen');
    
    // Cache-Control for security
    response.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    
    // Pragma for older browsers
    response.setHeader('Pragma', 'no-cache');
    
    // Expires
    response.setHeader('Expires', '0');
    
    // X-DNS-Prefetch-Control
    response.setHeader('X-DNS-Prefetch-Control', 'off');
    
    // Remove potentially dangerous headers
    response.removeHeader('X-Powered-By');
    response.removeHeader('Server');
  }

  private setResponseHeaders(response: any): void {
    // Set CORS headers if not already set
    if (!response.getHeader('Access-Control-Allow-Origin')) {
      // Configure based on environment
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
      const origin = response.req?.headers?.origin;
      
      if (allowedOrigins.includes(origin)) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }
    
    // Set security headers for API responses
    response.setHeader('X-API-Version', '1.0.0');
    response.setHeader('X-Request-Id', this.generateRequestId());
    response.setHeader('X-Rate-Limit-Limit', '100');
    response.setHeader('X-Rate-Limit-Remaining', '99');
    response.setHeader('X-Rate-Limit-Reset', new Date(Date.now() + 60000).toISOString());
  }

  private getCSP(): string {
    const policies = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.openai.com https://api.anthropic.com wss: https:",
      "media-src 'self' blob:",
      "object-src 'none'",
      "frame-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "upgrade-insecure-requests",
      "block-all-mixed-content",
      "report-uri /api/security/csp-report",
    ];
    
    return policies.join('; ');
  }

  private getPermissionsPolicy(): string {
    const policies = [
      'accelerometer=()',
      'autoplay=()',
      'camera=()',
      'display-capture=()',
      'document-domain=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'payment=()',
      'picture-in-picture=()',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=()',
      'xr-spatial-tracking=()',
    ];
    
    return policies.join(', ');
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}