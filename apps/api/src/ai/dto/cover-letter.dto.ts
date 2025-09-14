import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, IsObject } from 'class-validator';
import { CoverLetterTone, CoverLetterLength } from '../services/cover-letter.service';

// DTO for generating a new cover letter
export class GenerateCoverLetterDto {
  @IsString()
  resumeId: string;

  @IsString()
  jobId: string;

  @IsEnum(CoverLetterTone)
  tone: CoverLetterTone;

  @IsEnum(CoverLetterLength)
  length: CoverLetterLength;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emphasizeSkills?: string[];

  @IsOptional()
  @IsBoolean()
  includeAchievements?: boolean;

  @IsOptional()
  @IsObject()
  companyResearch?: {
    name: string;
    industry?: string;
    mission?: string;
    values?: string[];
    recentNews?: string[];
    culture?: string;
    products?: string[];
    competitors?: string[];
  };
}

// DTO for adjusting cover letter tone
export class AdjustToneDto {
  @IsString()
  coverLetterId: string;

  @IsEnum(CoverLetterTone)
  newTone: CoverLetterTone;
}

// DTO for optimizing cover letter length
export class OptimizeLengthDto {
  @IsString()
  coverLetterId: string;

  @IsEnum(CoverLetterLength)
  targetLength: CoverLetterLength;
}

// DTO for updating cover letter
export class UpdateCoverLetterDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

// Response DTO for cover letter
export class CoverLetterResponseDto {
  id: string;
  content: string;
  qualityScore: number;
  template: string;
  tone: CoverLetterTone;
  length: number;
  suggestions: string[];
  resume?: {
    id: string;
    title: string;
  };
  job?: {
    id: string;
    title: string;
    company: string;
  };
  createdAt: Date;
  updatedAt: Date;
}