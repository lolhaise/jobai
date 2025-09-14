// Import validation decorators from class-validator
import { IsString, IsOptional, IsDateString, IsEnum, IsInt, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Import Prisma enums for type safety
import { ApplicationStatus, ApplicationStage, ApplicationPriority } from '@prisma/client';

// DTO class for creating a new application
export class CreateApplicationDto {
  // Required: Job ID this application is for
  @IsString()
  jobId: string;

  // Required: Resume ID to use for this application
  @IsString()
  resumeId: string;

  // Optional: Application status (defaults to DRAFT)
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  // Optional: Current stage of application process
  @IsOptional()
  @IsEnum(ApplicationStage)
  stage?: ApplicationStage;

  // Optional: Priority level for this application
  @IsOptional()
  @IsEnum(ApplicationPriority)
  priority?: ApplicationPriority;

  // Optional: Date when application was submitted
  @IsOptional()
  @IsDateString()
  appliedAt?: string;

  // Optional: URL where application was submitted
  @IsOptional()
  @IsString()
  applicationUrl?: string;

  // Optional: Reference number from employer
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  // Optional: Source of application (LinkedIn, company website, etc.)
  @IsOptional()
  @IsString()
  source?: string;

  // Optional: Contact person name (recruiter, hiring manager)
  @IsOptional()
  @IsString()
  contactPerson?: string;

  // Optional: Contact email address
  @IsOptional()
  @IsString()
  contactEmail?: string;

  // Optional: Expected response deadline
  @IsOptional()
  @IsDateString()
  responseDeadline?: string;

  // Optional: Next interview date
  @IsOptional()
  @IsDateString()
  interviewDate?: string;

  // Optional: Expected start date if hired
  @IsOptional()
  @IsDateString()
  startDate?: string;

  // Optional: Your salary expectation (in cents to avoid floating point issues)
  @IsOptional()
  @IsInt()
  @Min(0)
  salaryExpectation?: number;

  // Optional: Cover letter content
  @IsOptional()
  @IsString()
  coverLetter?: string;

  // Optional: Next follow-up date
  @IsOptional()
  @IsDateString()
  nextFollowUp?: string;

  // Optional: General notes about this application
  @IsOptional()
  @IsString()
  notes?: string;

  // Optional: Color for Kanban board visualization
  @IsOptional()
  @IsString()
  color?: string;

  // Optional: Mark as favorite
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}