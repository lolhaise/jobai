// Import validation decorators
import { IsOptional, IsEnum, IsString, IsBoolean, IsArray, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Import Prisma enums
import { ApplicationStatus, ApplicationStage, ApplicationPriority } from '@prisma/client';

// DTO class for filtering applications with search and pagination
export class FilterApplicationsDto {
  // Optional: Search term for job title, company, or notes
  @IsOptional()
  @IsString()
  search?: string;

  // Optional: Filter by application status
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  // Optional: Filter by application stage
  @IsOptional()
  @IsEnum(ApplicationStage)
  stage?: ApplicationStage;

  // Optional: Filter by priority level
  @IsOptional()
  @IsEnum(ApplicationPriority)
  priority?: ApplicationPriority;

  // Optional: Filter by tags (array of tag names)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  tags?: string[];

  // Optional: Filter by favorite status
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isFavorite?: boolean;

  // Optional: Filter by archived status (defaults to false)
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isArchived?: boolean;

  // Optional: Filter applications applied after this date
  @IsOptional()
  @IsDateString()
  appliedAfter?: string;

  // Optional: Filter applications applied before this date
  @IsOptional()
  @IsDateString()
  appliedBefore?: string;

  // Optional: Filter by company name
  @IsOptional()
  @IsString()
  company?: string;

  // Optional: Filter by job location
  @IsOptional()
  @IsString()
  location?: string;

  // Pagination: Page number (defaults to 1)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  // Pagination: Number of items per page (defaults to 20, max 100)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // Optional: Sort field
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  // Optional: Sort direction
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}