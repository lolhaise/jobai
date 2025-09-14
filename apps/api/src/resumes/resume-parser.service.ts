import { Injectable } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as fs from 'fs';
import * as path from 'path';

export interface ParsedResume {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: string[];
  languages: string[];
  rawText: string;
  metadata: {
    fileName: string;
    fileType: string;
    parseDate: Date;
    confidence: number;
  };
}

export interface Experience {
  title?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  responsibilities: string[];
}

export interface Education {
  degree?: string;
  field?: string;
  institution?: string;
  location?: string;
  graduationDate?: string;
  gpa?: string;
}

@Injectable()
export class ResumeParserService {
  async parseResume(file: Express.Multer.File): Promise<ParsedResume> {
    let rawText = '';
    
    switch (file.mimetype) {
      case 'application/pdf':
        rawText = await this.parsePDF(file.buffer);
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        rawText = await this.parseDOCX(file.buffer);
        break;
      case 'text/plain':
        rawText = file.buffer.toString('utf-8');
        break;
      default:
        throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    const parsed = this.extractStructuredData(rawText);
    
    return {
      ...parsed,
      rawText,
      metadata: {
        fileName: file.originalname,
        fileType: file.mimetype,
        parseDate: new Date(),
        confidence: this.calculateConfidence(parsed),
      },
    };
  }

  private async parsePDF(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  private async parseDOCX(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error('DOCX parsing error:', error);
      throw new Error('Failed to parse DOCX file');
    }
  }

  private extractStructuredData(text: string): Omit<ParsedResume, 'rawText' | 'metadata'> {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    const parsed: Omit<ParsedResume, 'rawText' | 'metadata'> = {
      fullName: this.extractName(lines),
      email: this.extractEmail(text),
      phone: this.extractPhone(text),
      location: this.extractLocation(lines),
      summary: this.extractSummary(lines),
      experience: this.extractExperience(lines),
      education: this.extractEducation(lines),
      skills: this.extractSkills(lines),
      certifications: this.extractCertifications(lines),
      languages: this.extractLanguages(lines),
    };

    return parsed;
  }

  private extractName(lines: string[]): string | undefined {
    // Usually the name is one of the first non-empty lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      // Check if line looks like a name (contains 2-4 words, no special characters except space)
      if (/^[A-Za-z]+(\s[A-Za-z]+){1,3}$/.test(line)) {
        return line;
      }
    }
    return undefined;
  }

  private extractEmail(text: string): string | undefined {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const match = text.match(emailRegex);
    return match ? match[1] : undefined;
  }

  private extractPhone(text: string): string | undefined {
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/;
    const match = text.match(phoneRegex);
    return match ? match[0] : undefined;
  }

  private extractLocation(lines: string[]): string | undefined {
    // Look for patterns like "City, State" or "City, Country"
    const locationRegex = /^[A-Za-z\s]+,\s*[A-Za-z\s]+$/;
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      if (locationRegex.test(lines[i])) {
        return lines[i];
      }
    }
    return undefined;
  }

  private extractSummary(lines: string[]): string | undefined {
    const summaryKeywords = ['summary', 'objective', 'profile', 'about'];
    let summaryStart = -1;
    let summaryEnd = -1;

    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      
      if (summaryKeywords.some(keyword => lineLower.includes(keyword))) {
        summaryStart = i + 1;
      } else if (summaryStart > -1 && this.isSectionHeader(lines[i])) {
        summaryEnd = i;
        break;
      }
    }

    if (summaryStart > -1) {
      if (summaryEnd === -1) {
        summaryEnd = Math.min(summaryStart + 5, lines.length);
      }
      return lines.slice(summaryStart, summaryEnd).join(' ');
    }

    return undefined;
  }

  private extractExperience(lines: string[]): Experience[] {
    const experiences: Experience[] = [];
    const expKeywords = ['experience', 'employment', 'work history', 'professional experience'];
    
    let expStart = -1;
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      if (expKeywords.some(keyword => lineLower.includes(keyword))) {
        expStart = i + 1;
        break;
      }
    }

    if (expStart === -1) return experiences;

    let currentExp: Partial<Experience> | null = null;
    const dateRegex = /(\d{4}|\d{1,2}\/\d{4}|[A-Za-z]+\s+\d{4})/;
    
    for (let i = expStart; i < lines.length; i++) {
      const line = lines[i];
      
      if (this.isSectionHeader(line)) break;
      
      // Check if this line contains dates (likely a new experience entry)
      if (dateRegex.test(line)) {
        if (currentExp && currentExp.title) {
          experiences.push(currentExp as Experience);
        }
        
        currentExp = {
          responsibilities: [],
        };
        
        // Try to extract job title and company
        const parts = line.split(/[-–|]/);
        if (parts.length > 0) {
          currentExp.title = parts[0].trim();
          if (parts.length > 1) {
            currentExp.company = parts[1].trim();
          }
        }
        
        // Extract dates
        const dates = line.match(new RegExp(dateRegex, 'g'));
        if (dates && dates.length >= 1) {
          currentExp.startDate = dates[0];
          if (dates.length >= 2) {
            currentExp.endDate = dates[1];
          }
        }
      } else if (currentExp && line.length > 0) {
        // This is likely a responsibility or description
        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
          currentExp.responsibilities?.push(line.substring(1).trim());
        } else if (!currentExp.description) {
          currentExp.description = line;
        } else {
          currentExp.responsibilities?.push(line);
        }
      }
    }
    
    if (currentExp && currentExp.title) {
      experiences.push(currentExp as Experience);
    }
    
    return experiences;
  }

  private extractEducation(lines: string[]): Education[] {
    const education: Education[] = [];
    const eduKeywords = ['education', 'academic', 'qualifications'];
    
    let eduStart = -1;
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      if (eduKeywords.some(keyword => lineLower.includes(keyword))) {
        eduStart = i + 1;
        break;
      }
    }

    if (eduStart === -1) return education;

    const degreeKeywords = ['bachelor', 'master', 'phd', 'doctorate', 'associate', 'diploma', 'certificate', 'b.s.', 'b.a.', 'm.s.', 'm.a.', 'mba'];
    const dateRegex = /(\d{4})/;
    
    for (let i = eduStart; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      
      if (this.isSectionHeader(line)) break;
      
      if (degreeKeywords.some(keyword => lineLower.includes(keyword))) {
        const edu: Partial<Education> = {};
        
        // Extract degree
        for (const keyword of degreeKeywords) {
          if (lineLower.includes(keyword)) {
            const startIndex = lineLower.indexOf(keyword);
            const endIndex = Math.min(startIndex + 50, line.length);
            edu.degree = line.substring(startIndex, endIndex).trim();
            break;
          }
        }
        
        // Look for institution in next few lines
        for (let j = i; j < Math.min(i + 3, lines.length); j++) {
          if (lines[j].includes('University') || lines[j].includes('College') || lines[j].includes('Institute')) {
            edu.institution = lines[j];
            break;
          }
        }
        
        // Extract graduation date
        const dateMatch = line.match(dateRegex);
        if (dateMatch) {
          edu.graduationDate = dateMatch[0];
        }
        
        // Extract GPA if present
        const gpaMatch = line.match(/GPA:?\s*([\d.]+)/i);
        if (gpaMatch) {
          edu.gpa = gpaMatch[1];
        }
        
        if (edu.degree || edu.institution) {
          education.push(edu as Education);
        }
      }
    }
    
    return education;
  }

  private extractSkills(lines: string[]): string[] {
    const skills: string[] = [];
    const skillKeywords = ['skills', 'technologies', 'competencies', 'expertise'];
    
    let skillStart = -1;
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      if (skillKeywords.some(keyword => lineLower.includes(keyword))) {
        skillStart = i + 1;
        break;
      }
    }

    if (skillStart === -1) return skills;

    for (let i = skillStart; i < Math.min(skillStart + 10, lines.length); i++) {
      const line = lines[i];
      
      if (this.isSectionHeader(line)) break;
      
      // Split by common delimiters
      const skillItems = line.split(/[,;|•·]/);
      for (const item of skillItems) {
        const trimmed = item.trim();
        if (trimmed && trimmed.length > 1 && trimmed.length < 50) {
          skills.push(trimmed);
        }
      }
    }
    
    return [...new Set(skills)]; // Remove duplicates
  }

  private extractCertifications(lines: string[]): string[] {
    const certifications: string[] = [];
    const certKeywords = ['certifications', 'certificates', 'licenses', 'credentials'];
    
    let certStart = -1;
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      if (certKeywords.some(keyword => lineLower.includes(keyword))) {
        certStart = i + 1;
        break;
      }
    }

    if (certStart === -1) return certifications;

    for (let i = certStart; i < Math.min(certStart + 10, lines.length); i++) {
      const line = lines[i];
      
      if (this.isSectionHeader(line)) break;
      
      if (line.length > 5 && line.length < 100) {
        certifications.push(line.replace(/^[•\-*]\s*/, '').trim());
      }
    }
    
    return certifications;
  }

  private extractLanguages(lines: string[]): string[] {
    const languages: string[] = [];
    const langKeywords = ['languages', 'language skills'];
    
    let langStart = -1;
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      if (langKeywords.some(keyword => lineLower.includes(keyword))) {
        langStart = i + 1;
        break;
      }
    }

    if (langStart === -1) return languages;

    for (let i = langStart; i < Math.min(langStart + 5, lines.length); i++) {
      const line = lines[i];
      
      if (this.isSectionHeader(line)) break;
      
      // Split by common delimiters
      const langItems = line.split(/[,;|•·]/);
      for (const item of langItems) {
        const trimmed = item.trim();
        if (trimmed && trimmed.length > 1 && trimmed.length < 50) {
          // Remove proficiency levels for cleaner data
          const cleaned = trimmed.replace(/\(.*?\)/g, '').trim();
          if (cleaned) {
            languages.push(cleaned);
          }
        }
      }
    }
    
    return [...new Set(languages)]; // Remove duplicates
  }

  private isSectionHeader(line: string): boolean {
    const headers = [
      'experience', 'education', 'skills', 'certifications', 'languages',
      'summary', 'objective', 'projects', 'achievements', 'awards',
      'publications', 'references', 'interests', 'hobbies'
    ];
    
    const lineLower = line.toLowerCase();
    return headers.some(header => {
      const regex = new RegExp(`^${header}s?\\s*:?$`);
      return regex.test(lineLower);
    });
  }

  private calculateConfidence(parsed: Omit<ParsedResume, 'rawText' | 'metadata'>): number {
    let score = 0;
    let maxScore = 0;

    // Check presence of key fields
    const checks = [
      { field: parsed.fullName, weight: 15 },
      { field: parsed.email, weight: 15 },
      { field: parsed.phone, weight: 10 },
      { field: parsed.location, weight: 5 },
      { field: parsed.summary, weight: 10 },
      { field: parsed.experience.length > 0, weight: 20 },
      { field: parsed.education.length > 0, weight: 15 },
      { field: parsed.skills.length > 0, weight: 10 },
    ];

    for (const check of checks) {
      maxScore += check.weight;
      if (check.field) {
        score += check.weight;
      }
    }

    return Math.round((score / maxScore) * 100);
  }
}