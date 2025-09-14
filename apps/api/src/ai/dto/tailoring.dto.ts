import { IsString, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class TailorResumeDto {
  @IsString()
  resumeId: string;

  @IsString()
  jobDescription: string;

  @IsOptional()
  @IsString()
  jobUrl?: string;

  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean; // Automatically apply optimizations without review

  @IsOptional()
  @IsNumber()
  aggressiveness?: number; // 0-100: How much to modify (0 = minimal, 100 = maximum)
}

export class AnalyzeJobDto {
  @IsString()
  jobDescription: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  company?: string;
}

export class OptimizeBulletsDto {
  @IsArray()
  @IsString({ each: true })
  bullets: string[];

  @IsString()
  jobDescription: string;

  @IsOptional()
  @IsNumber()
  maxBullets?: number;
}

export class GenerateCoverLetterDto {
  @IsString()
  resumeId: string;

  @IsString()
  jobDescription: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  hiringManager?: string;

  @IsOptional()
  @IsString()
  tone?: 'formal' | 'casual' | 'enthusiastic';
}

export class ATSScoreDto {
  @IsString()
  resumeContent: string;

  @IsString()
  jobDescription: string;
}

export class KeywordExtractionDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsNumber()
  maxKeywords?: number;

  @IsOptional()
  @IsString()
  type?: 'job' | 'resume';
}