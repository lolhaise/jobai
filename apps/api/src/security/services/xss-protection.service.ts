// XSS Protection Service - Prevents Cross-Site Scripting attacks
// Sanitizes user input and output to prevent malicious script injection

import { Injectable } from '@nestjs/common';
import * as DOMPurify from 'isomorphic-dompurify';
import * as validator from 'validator';

@Injectable()
export class XssProtectionService {
  // Allowed HTML tags for rich text content
  private readonly allowedTags = [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'span', 'div',
  ];

  // Allowed HTML attributes
  private readonly allowedAttributes = {
    'a': ['href', 'title', 'target'],
    'span': ['class'],
    'div': ['class'],
    'code': ['class'],
  };

  // Dangerous protocols to block
  private readonly dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
    'chrome:',
    'chrome-extension:',
  ];

  // XSS attack patterns
  private readonly xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<embed[^>]*>/gi,
    /<object[^>]*>/gi,
    /<applet[^>]*>/gi,
    /<meta[^>]*>/gi,
    /<link[^>]*>/gi,
    /<style[^>]*>.*?<\/style>/gi,
    /expression\s*\(/gi,
    /import\s+/gi,
    /@import/gi,
    /behavior:/gi,
    /-moz-binding:/gi,
  ];

  // Sanitize HTML content
  sanitizeHtml(html: string, options?: {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
  }): string {
    // Check for obvious XSS patterns
    for (const pattern of this.xssPatterns) {
      if (pattern.test(html)) {
        console.warn('XSS pattern detected in HTML content');
        // Strip all HTML if XSS detected
        return validator.escape(html);
      }
    }

    // Use DOMPurify for HTML sanitization
    const config = {
      ALLOWED_TAGS: options?.allowedTags || this.allowedTags,
      ALLOWED_ATTR: this.flattenAttributes(options?.allowedAttributes || this.allowedAttributes),
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SAFE_FOR_TEMPLATES: true,
      WHOLE_DOCUMENT: false,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
      FORCE_BODY: true,
      SANITIZE_DOM: true,
      IN_PLACE: false,
      USE_PROFILES: {},
      FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'link', 'meta'],
      FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover'],
    };

    const sanitized = DOMPurify.sanitize(html, config);

    // Additional validation
    return this.validateUrls(sanitized);
  }

  // Flatten attributes for DOMPurify
  private flattenAttributes(attributes: Record<string, string[]>): string[] {
    const flattened: string[] = [];
    for (const [tag, attrs] of Object.entries(attributes)) {
      for (const attr of attrs) {
        flattened.push(attr);
      }
    }
    return flattened;
  }

  // Validate URLs in content
  private validateUrls(content: string): string {
    // Find and validate all URLs
    const urlPattern = /href="([^"]*)"/gi;
    return content.replace(urlPattern, (match, url) => {
      // Check for dangerous protocols
      for (const protocol of this.dangerousProtocols) {
        if (url.toLowerCase().startsWith(protocol)) {
          return 'href="#"';
        }
      }
      
      // Validate URL format
      if (!this.isValidUrl(url)) {
        return 'href="#"';
      }
      
      return match;
    });
  }

  // Check if URL is valid
  private isValidUrl(url: string): boolean {
    // Allow relative URLs
    if (url.startsWith('/') || url.startsWith('#')) {
      return true;
    }
    
    // Validate absolute URLs
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Sanitize plain text (no HTML allowed)
  sanitizeText(text: string): string {
    if (typeof text !== 'string') {
      return '';
    }

    // Escape HTML entities
    let sanitized = validator.escape(text);

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove control characters (except newlines and tabs)
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }

  // Sanitize JSON data
  sanitizeJSON(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeText(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeJSON(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Sanitize the key
        const sanitizedKey = this.sanitizeText(key);
        // Sanitize the value
        sanitized[sanitizedKey] = this.sanitizeJSON(value);
      }
      return sanitized;
    }
    
    return data;
  }

  // Sanitize filename
  sanitizeFilename(filename: string): string {
    // Remove path components
    let sanitized = filename.replace(/[\/\\]/g, '');
    
    // Remove special characters
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Remove leading dots
    sanitized = sanitized.replace(/^\.+/, '');
    
    // Limit length
    if (sanitized.length > 255) {
      const extension = sanitized.split('.').pop();
      const name = sanitized.substring(0, 250 - (extension?.length || 0));
      sanitized = extension ? `${name}.${extension}` : name;
    }
    
    // Default name if empty
    if (!sanitized) {
      sanitized = 'unnamed_file';
    }
    
    return sanitized;
  }

  // Sanitize SQL input (additional layer beyond parameterized queries)
  sanitizeSqlInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Escape special SQL characters
    let sanitized = input
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[\\]/g, '') // Remove backslashes
      .replace(/[;]/g, '') // Remove semicolons
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove multi-line comment start
      .replace(/\*\//g, ''); // Remove multi-line comment end

    // Remove SQL keywords used in injection
    const sqlKeywords = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE',
      'ALTER', 'UNION', 'JOIN', 'WHERE', 'FROM', 'EXEC',
      'SCRIPT', 'JAVASCRIPT', 'VBSCRIPT'
    ];

    for (const keyword of sqlKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      sanitized = sanitized.replace(regex, '');
    }

    return sanitized.trim();
  }

  // Create Content Security Policy
  generateCSP(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.openai.com https://api.anthropic.com",
      "media-src 'self'",
      "object-src 'none'",
      "frame-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
      "upgrade-insecure-requests",
    ].join('; ');
  }

  // Validate and sanitize email
  sanitizeEmail(email: string): string {
    const sanitized = email.toLowerCase().trim();
    
    if (!validator.isEmail(sanitized)) {
      throw new Error('Invalid email format');
    }
    
    // Additional validation for common injection attempts
    if (sanitized.includes('<') || sanitized.includes('>') || sanitized.includes('javascript:')) {
      throw new Error('Invalid characters in email');
    }
    
    return sanitized;
  }

  // Validate and sanitize URL
  sanitizeUrl(url: string): string {
    // Check for dangerous protocols
    for (const protocol of this.dangerousProtocols) {
      if (url.toLowerCase().startsWith(protocol)) {
        throw new Error('Dangerous protocol detected');
      }
    }
    
    // Validate URL format
    if (!validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: false,
      require_valid_protocol: true,
    })) {
      throw new Error('Invalid URL format');
    }
    
    return url;
  }

  // Check content for XSS attempts
  detectXSS(content: string): boolean {
    for (const pattern of this.xssPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }
    return false;
  }

  // Create safe error message (no sensitive data)
  sanitizeErrorMessage(error: any): string {
    const message = error?.message || 'An error occurred';
    
    // Remove sensitive patterns
    const sanitized = message
      .replace(/\/[^\/\s]+/g, '/***') // Hide file paths
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '***.***.***.***') // Hide IPs
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***.***') // Hide emails
      .replace(/\b\d{4,}\b/g, '****'); // Hide long numbers
    
    return this.sanitizeText(sanitized);
  }
}