// Encryption Service - Handles all data encryption and decryption
// Uses AES-256-GCM for symmetric encryption and bcrypt for password hashing

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly saltRounds = 12;
  private readonly masterKey: Buffer;

  constructor() {
    // Load master key from environment or generate if not exists
    const key = process.env.ENCRYPTION_KEY || this.generateMasterKey();
    this.masterKey = Buffer.from(key, 'hex');
  }

  // Generate a new master key (only for initial setup)
  private generateMasterKey(): string {
    const key = crypto.randomBytes(this.keyLength).toString('hex');
    console.warn('⚠️  Generated new encryption key. Save this to ENCRYPTION_KEY env variable:', key);
    return key;
  }

  // Encrypt sensitive data
  encrypt(text: string): string {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
      
      // Encrypt the text
      const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final(),
      ]);
      
      // Get the authentication tag
      const tag = cipher.getAuthTag();
      
      // Combine IV, tag, and encrypted data
      const combined = Buffer.concat([iv, tag, encrypted]);
      
      // Return base64 encoded string
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt sensitive data
  decrypt(encryptedText: string): string {
    try {
      // Decode from base64
      const combined = Buffer.from(encryptedText, 'base64');
      
      // Extract components
      const iv = combined.slice(0, this.ivLength);
      const tag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.ivLength + this.tagLength);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
      decipher.setAuthTag(tag);
      
      // Decrypt the data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Hash password using bcrypt
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  // Verify password against hash
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Encrypt PII (Personally Identifiable Information)
  encryptPII(data: any): any {
    const piiFields = ['ssn', 'dob', 'phoneNumber', 'address', 'bankAccount', 'creditCard'];
    
    if (typeof data === 'string') {
      return this.encrypt(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.encryptPII(item));
    }
    
    if (data && typeof data === 'object') {
      const encrypted: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (piiFields.includes(key) && typeof value === 'string') {
          encrypted[key] = this.encrypt(value);
        } else {
          encrypted[key] = this.encryptPII(value);
        }
      }
      return encrypted;
    }
    
    return data;
  }

  // Decrypt PII
  decryptPII(data: any): any {
    const piiFields = ['ssn', 'dob', 'phoneNumber', 'address', 'bankAccount', 'creditCard'];
    
    if (typeof data === 'string' && this.isEncrypted(data)) {
      return this.decrypt(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.decryptPII(item));
    }
    
    if (data && typeof data === 'object') {
      const decrypted: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (piiFields.includes(key) && typeof value === 'string' && this.isEncrypted(value)) {
          decrypted[key] = this.decrypt(value);
        } else {
          decrypted[key] = this.decryptPII(value);
        }
      }
      return decrypted;
    }
    
    return data;
  }

  // Check if a string is encrypted
  private isEncrypted(text: string): boolean {
    try {
      const decoded = Buffer.from(text, 'base64');
      return decoded.length >= this.ivLength + this.tagLength;
    } catch {
      return false;
    }
  }

  // Generate secure random token
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate HMAC for data integrity
  generateHMAC(data: string, secret?: string): string {
    const hmacSecret = secret || this.masterKey.toString('hex');
    return crypto
      .createHmac('sha256', hmacSecret)
      .update(data)
      .digest('hex');
  }

  // Verify HMAC
  verifyHMAC(data: string, hmac: string, secret?: string): boolean {
    const expectedHmac = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(hmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    );
  }

  // Encrypt file
  async encryptFile(buffer: Buffer): Promise<Buffer> {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final(),
    ]);
    
    const tag = cipher.getAuthTag();
    
    return Buffer.concat([iv, tag, encrypted]);
  }

  // Decrypt file
  async decryptFile(encryptedBuffer: Buffer): Promise<Buffer> {
    const iv = encryptedBuffer.slice(0, this.ivLength);
    const tag = encryptedBuffer.slice(this.ivLength, this.ivLength + this.tagLength);
    const encrypted = encryptedBuffer.slice(this.ivLength + this.tagLength);
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
    decipher.setAuthTag(tag);
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
  }

  // Key derivation for user-specific encryption
  deriveKey(userId: string, salt?: string): Buffer {
    const userSalt = salt || crypto.randomBytes(32).toString('hex');
    return crypto.pbkdf2Sync(userId, userSalt, 100000, this.keyLength, 'sha256');
  }

  // Encrypt with user-specific key
  encryptForUser(text: string, userId: string): string {
    const userKey = this.deriveKey(userId);
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, userKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);
    
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, tag, encrypted]);
    
    return combined.toString('base64');
  }

  // Decrypt with user-specific key
  decryptForUser(encryptedText: string, userId: string): string {
    const userKey = this.deriveKey(userId);
    const combined = Buffer.from(encryptedText, 'base64');
    
    const iv = combined.slice(0, this.ivLength);
    const tag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
    const encrypted = combined.slice(this.ivLength + this.tagLength);
    
    const decipher = crypto.createDecipheriv(this.algorithm, userKey, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    
    return decrypted.toString('utf8');
  }
}