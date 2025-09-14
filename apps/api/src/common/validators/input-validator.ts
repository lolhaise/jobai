// Input Validation System - Comprehensive validation for all user inputs
// Prevents injection attacks, XSS, and malformed data from entering the system

import { BadRequestException } from '@nestjs/common';
import * as validator from 'validator';
import { createHash } from 'crypto';

// Validation rules for different data types
export interface ValidationRule {
  type: 'string' | 'number' | 'email' | 'url' | 'date' | 'boolean' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  sanitize?: boolean;
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  escape?: boolean;
}

// Validation schema for complex objects
export interface ValidationSchema {
  [key: string]: ValidationRule | ValidationSchema;
}

export class InputValidator {
  // Dangerous patterns that indicate potential attacks
  private static readonly DANGEROUS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gi, // Script tags
    /<iframe[^>]*>.*?<\/iframe>/gi, // Iframe tags
    /javascript:/gi, // JavaScript protocol
    /on\w+="[^"]*"/gi, // Event handlers
    /<object[^>]*>.*?<\/object>/gi, // Object tags
    /<embed[^>]*>/gi, // Embed tags
    /<img[^>]*on\w+=[^>]*>/gi, // Image with event handlers
  ];

  // SQL injection patterns
  private static readonly SQL_INJECTION_PATTERNS = [
    /('|")(\s*)(or|and)(\s*)('|"|\d+)(\s*)=(\s*)('|"|\d+)/gi, // Basic SQL injection
    /union(\s+)select/gi, // Union select
    /drop(\s+)table/gi, // Drop table
    /insert(\s+)into/gi, // Insert into
    /select(\s+)\*?(\s+)from/gi, // Select from
    /update(\s+)\w+(\s+)set/gi, // Update set
    /delete(\s+)from/gi, // Delete from
    /exec(\s*)\(/gi, // Exec command
    /xp_cmdshell/gi, // SQL Server command shell
  ];

  // NoSQL injection patterns
  private static readonly NOSQL_INJECTION_PATTERNS = [
    /\$where/gi, // MongoDB $where
    /\$regex/gi, // MongoDB $regex
    /\$ne/gi, // MongoDB $ne
    /\$gt/gi, // MongoDB $gt
    /\$lt/gi, // MongoDB $lt
    /\.\$\./gi, // Path traversal
  ];

  // Validate input against schema
  static validate(data: any, schema: ValidationSchema): void {
    const errors: string[] = [];
    this.validateObject(data, schema, '', errors);
    
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Recursive validation for nested objects
  private static validateObject(
    data: any,
    schema: ValidationSchema,
    path: string,
    errors: string[]
  ): void {
    for (const [key, rule] of Object.entries(schema)) {
      const fieldPath = path ? `${path}.${key}` : key;
      const value = data?.[key];

      if (this.isValidationRule(rule)) {
        this.validateField(value, rule, fieldPath, errors);
        
        // Sanitize and transform the value if needed
        if (value !== undefined && value !== null) {
          data[key] = this.sanitizeValue(value, rule);
        }
      } else {
        // Nested object validation
        if (value && typeof value === 'object') {
          this.validateObject(value, rule as ValidationSchema, fieldPath, errors);
        }
      }
    }
  }

  // Check if object is a validation rule
  private static isValidationRule(obj: any): obj is ValidationRule {
    return obj && typeof obj === 'object' && 'type' in obj;
  }

  // Validate individual field
  private static validateField(
    value: any,
    rule: ValidationRule,
    path: string,
    errors: string[]
  ): void {
    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${path} is required`);
      return;
    }

    // Skip validation for optional empty fields
    if (!rule.required && (value === undefined || value === null)) {
      return;
    }

    // Type validation
    switch (rule.type) {
      case 'string':
        this.validateString(value, rule, path, errors);
        break;
      case 'number':
        this.validateNumber(value, rule, path, errors);
        break;
      case 'email':
        this.validateEmail(value, path, errors);
        break;
      case 'url':
        this.validateUrl(value, path, errors);
        break;
      case 'date':
        this.validateDate(value, path, errors);
        break;
      case 'boolean':
        this.validateBoolean(value, path, errors);
        break;
      case 'array':
        this.validateArray(value, rule, path, errors);
        break;
      case 'object':
        this.validateObjectType(value, path, errors);
        break;
    }

    // Custom validation
    if (rule.custom && !rule.custom(value)) {
      errors.push(`${path} failed custom validation`);
    }
  }

  // String validation
  private static validateString(
    value: any,
    rule: ValidationRule,
    path: string,
    errors: string[]
  ): void {
    if (typeof value !== 'string') {
      errors.push(`${path} must be a string`);
      return;
    }

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(value)) {
        errors.push(`${path} contains potentially dangerous content`);
        return;
      }
    }

    // Check for SQL injection
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(value)) {
        errors.push(`${path} contains suspicious SQL patterns`);
        return;
      }
    }

    // Check for NoSQL injection
    for (const pattern of this.NOSQL_INJECTION_PATTERNS) {
      if (pattern.test(value)) {
        errors.push(`${path} contains suspicious NoSQL patterns`);
        return;
      }
    }

    // Length validation
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${path} must be at least ${rule.minLength} characters`);
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(`${path} must be at most ${rule.maxLength} characters`);
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`${path} does not match the required pattern`);
    }
  }

  // Number validation
  private static validateNumber(
    value: any,
    rule: ValidationRule,
    path: string,
    errors: string[]
  ): void {
    const num = Number(value);
    if (isNaN(num)) {
      errors.push(`${path} must be a number`);
      return;
    }

    if (rule.min !== undefined && num < rule.min) {
      errors.push(`${path} must be at least ${rule.min}`);
    }
    if (rule.max !== undefined && num > rule.max) {
      errors.push(`${path} must be at most ${rule.max}`);
    }
  }

  // Email validation
  private static validateEmail(value: any, path: string, errors: string[]): void {
    if (typeof value !== 'string' || !validator.isEmail(value)) {
      errors.push(`${path} must be a valid email address`);
    }
  }

  // URL validation
  private static validateUrl(value: any, path: string, errors: string[]): void {
    if (typeof value !== 'string' || !validator.isURL(value)) {
      errors.push(`${path} must be a valid URL`);
    }
  }

  // Date validation
  private static validateDate(value: any, path: string, errors: string[]): void {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      errors.push(`${path} must be a valid date`);
    }
  }

  // Boolean validation
  private static validateBoolean(value: any, path: string, errors: string[]): void {
    if (typeof value !== 'boolean') {
      errors.push(`${path} must be a boolean`);
    }
  }

  // Array validation
  private static validateArray(
    value: any,
    rule: ValidationRule,
    path: string,
    errors: string[]
  ): void {
    if (!Array.isArray(value)) {
      errors.push(`${path} must be an array`);
      return;
    }

    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${path} must have at least ${rule.minLength} items`);
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(`${path} must have at most ${rule.maxLength} items`);
    }
  }

  // Object type validation
  private static validateObjectType(value: any, path: string, errors: string[]): void {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(`${path} must be an object`);
    }
  }

  // Sanitize value based on rules
  private static sanitizeValue(value: any, rule: ValidationRule): any {
    if (typeof value !== 'string') return value;

    let sanitized = value;

    // Trim whitespace
    if (rule.trim) {
      sanitized = sanitized.trim();
    }

    // Case transformation
    if (rule.lowercase) {
      sanitized = sanitized.toLowerCase();
    }
    if (rule.uppercase) {
      sanitized = sanitized.toUpperCase();
    }

    // HTML escape
    if (rule.escape || rule.sanitize) {
      sanitized = validator.escape(sanitized);
    }

    // Additional sanitization
    if (rule.sanitize) {
      // Remove null bytes
      sanitized = sanitized.replace(/\0/g, '');
      
      // Remove control characters
      sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
      
      // Normalize Unicode
      sanitized = sanitized.normalize('NFC');
    }

    return sanitized;
  }

  // Validate file uploads
  static validateFile(file: Express.Multer.File, options: {
    allowedMimeTypes?: string[];
    maxSize?: number;
    allowedExtensions?: string[];
  }): void {
    const errors: string[] = [];

    // Check file existence
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Check MIME type
    if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      const maxSizeMB = options.maxSize / (1024 * 1024);
      errors.push(`File size exceeds maximum allowed size of ${maxSizeMB}MB`);
    }

    // Check file extension
    if (options.allowedExtensions) {
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      if (!extension || !options.allowedExtensions.includes(extension)) {
        errors.push(`File extension .${extension} is not allowed`);
      }
    }

    // Check for double extensions (potential attack)
    if (file.originalname.split('.').length > 2) {
      errors.push('Files with multiple extensions are not allowed');
    }

    // Check for null bytes in filename
    if (file.originalname.includes('\0')) {
      errors.push('Invalid filename');
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'File validation failed',
        errors,
      });
    }
  }

  // Validate and sanitize JSON
  static sanitizeJSON(json: string): any {
    try {
      // Remove comments and trailing commas (common in malformed JSON)
      const cleaned = json
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
        .replace(/\/\/.*$/gm, '') // Remove // comments
        .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas

      const parsed = JSON.parse(cleaned);
      
      // Deep sanitize all string values
      return this.deepSanitize(parsed);
    } catch (error) {
      throw new BadRequestException('Invalid JSON format');
    }
  }

  // Deep sanitize object
  private static deepSanitize(obj: any): any {
    if (typeof obj === 'string') {
      return validator.escape(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitize(item));
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize the key as well
        const sanitizedKey = validator.escape(key);
        sanitized[sanitizedKey] = this.deepSanitize(value);
      }
      return sanitized;
    }
    return obj;
  }

  // Generate safe ID (for preventing ID manipulation)
  static generateSafeId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const hash = createHash('sha256')
      .update(timestamp + random)
      .digest('hex')
      .substring(0, 16);
    return `${timestamp}_${hash}`;
  }
}

// Validation schemas for common entities
export const ValidationSchemas = {
  // User registration schema
  userRegistration: {
    email: {
      type: 'email' as const,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: 'string' as const,
      required: true,
      minLength: 8,
      maxLength: 128,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    },
    firstName: {
      type: 'string' as const,
      required: true,
      minLength: 1,
      maxLength: 50,
      trim: true,
      escape: true,
    },
    lastName: {
      type: 'string' as const,
      required: true,
      minLength: 1,
      maxLength: 50,
      trim: true,
      escape: true,
    },
  },

  // Job search schema
  jobSearch: {
    query: {
      type: 'string' as const,
      required: false,
      maxLength: 200,
      trim: true,
      escape: true,
    },
    location: {
      type: 'string' as const,
      required: false,
      maxLength: 100,
      trim: true,
      escape: true,
    },
    minSalary: {
      type: 'number' as const,
      required: false,
      min: 0,
      max: 1000000,
    },
    maxSalary: {
      type: 'number' as const,
      required: false,
      min: 0,
      max: 1000000,
    },
    page: {
      type: 'number' as const,
      required: false,
      min: 1,
      max: 1000,
    },
    limit: {
      type: 'number' as const,
      required: false,
      min: 1,
      max: 100,
    },
  },

  // Resume update schema
  resumeUpdate: {
    title: {
      type: 'string' as const,
      required: false,
      maxLength: 200,
      trim: true,
      escape: true,
    },
    content: {
      type: 'string' as const,
      required: false,
      maxLength: 50000,
      sanitize: true,
    },
    tags: {
      type: 'array' as const,
      required: false,
      maxLength: 10,
    },
  },
};

// Export validation decorators for NestJS
export function ValidateInput(schema: ValidationSchema) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      // Validate the first argument (usually the DTO)
      if (args[0]) {
        InputValidator.validate(args[0], schema);
      }
      return method.apply(this, args);
    };
  };
}