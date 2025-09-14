// DTOs for Job Search functionality
// Defines the structure of search requests and responses

import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  IsDate,
  Min,
  Max,
  IsObject,
  ValidateNested,
} from 'class-validator';

// Enum for experience levels
export enum ExperienceLevel {
  INTERNSHIP = 'INTERNSHIP',
  ENTRY = 'ENTRY',
  MID = 'MID',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
  EXECUTIVE = 'EXECUTIVE',
}

// Enum for employment types
export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERNSHIP = 'INTERNSHIP',
  FREELANCE = 'FREELANCE',
  TEMPORARY = 'TEMPORARY',
}

// Enum for sort options
export enum SortBy {
  RELEVANCE = 'relevance',
  DATE = 'date',
  SALARY = 'salary',
  COMPANY = 'company',
}

// Location search parameters
class LocationSearchDto {
  @IsOptional()
  @IsString()
  query?: string; // Text-based location search

  @IsOptional()
  @IsString()
  city?: string; // Specific city

  @IsOptional()
  @IsString()
  state?: string; // State/province

  @IsOptional()
  @IsString()
  country?: string; // Country

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number; // Latitude for radius search

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number; // Longitude for radius search

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  radius?: number; // Radius in miles for geographic search
}

// Main search DTO
export class SearchJobsDto {
  @IsOptional()
  @IsString()
  query?: string; // Free text search query

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationSearchDto)
  location?: LocationSearchDto; // Location parameters

  @IsOptional()
  @IsBoolean()
  remoteOnly?: boolean; // Filter for remote jobs only

  @IsOptional()
  @IsNumber()
  @Min(0)
  minSalary?: number; // Minimum salary filter

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSalary?: number; // Maximum salary filter

  @IsOptional()
  @IsArray()
  @IsEnum(ExperienceLevel, { each: true })
  experienceLevel?: ExperienceLevel[]; // Experience level filter

  @IsOptional()
  @IsArray()
  @IsEnum(EmploymentType, { each: true })
  employmentType?: EmploymentType[]; // Employment type filter

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companies?: string[]; // Filter by specific companies

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[]; // Filter by required skills

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  postedAfter?: Date; // Filter jobs posted after this date

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy; // Sort order for results

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1; // Page number for pagination

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20; // Number of results per page
}

// Aggregation result structure
export interface SearchAggregations {
  experienceLevels: AggregationItem[]; // Count by experience level
  employmentTypes: AggregationItem[]; // Count by employment type
  topCompanies: AggregationItem[]; // Top companies with job counts
  topSkills: AggregationItem[]; // Most requested skills
  salaryRanges: SalaryRangeItem[]; // Salary distribution
  locations: AggregationItem[]; // Top locations
}

// Single aggregation item
export interface AggregationItem {
  value: string; // The aggregated value
  count: number; // Number of jobs with this value
}

// Salary range item
export interface SalaryRangeItem {
  min: number; // Minimum salary in range
  max: number | null; // Maximum salary in range (null for "over X")
  label: string; // Display label
  count: number; // Number of jobs in this range
}

// Pagination metadata
export interface PaginationMeta {
  page: number; // Current page
  limit: number; // Items per page
  total: number; // Total number of items
  totalPages: number; // Total number of pages
  hasNext: boolean; // Has next page
  hasPrev: boolean; // Has previous page
}

// Job search result
export interface JobSearchResult {
  jobs: any[]; // Array of job objects (enhanced with relevance scores)
  pagination: PaginationMeta; // Pagination information
  aggregations: SearchAggregations; // Filter aggregations
}

// Saved search DTO
export class CreateSavedSearchDto {
  @IsString()
  name: string; // Name for the saved search

  @IsOptional()
  @IsString()
  description?: string; // Optional description

  @ValidateNested()
  @Type(() => SearchJobsDto)
  searchParams: SearchJobsDto; // The search parameters to save

  @IsOptional()
  @IsBoolean()
  emailAlerts?: boolean = false; // Enable email alerts for new matches

  @IsOptional()
  @IsEnum(['DAILY', 'WEEKLY', 'INSTANT'])
  alertFrequency?: string = 'DAILY'; // How often to send alerts
}

// Update saved search DTO
export class UpdateSavedSearchDto {
  @IsOptional()
  @IsString()
  name?: string; // Updated name

  @IsOptional()
  @IsString()
  description?: string; // Updated description

  @IsOptional()
  @ValidateNested()
  @Type(() => SearchJobsDto)
  searchParams?: SearchJobsDto; // Updated search parameters

  @IsOptional()
  @IsBoolean()
  emailAlerts?: boolean; // Updated alert setting

  @IsOptional()
  @IsEnum(['DAILY', 'WEEKLY', 'INSTANT'])
  alertFrequency?: string; // Updated frequency
}

// Search suggestions DTO
export class GetSuggestionsDto {
  @IsString()
  query: string; // The partial query to get suggestions for

  @IsEnum(['job', 'company', 'skill', 'location'])
  type: 'job' | 'company' | 'skill' | 'location'; // Type of suggestions to return

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10; // Maximum number of suggestions
}

// Search history entry
export interface SearchHistoryEntry {
  id: string; // Unique identifier
  userId: string; // User who performed the search
  query: string; // Search query
  filters: SearchJobsDto; // Applied filters
  resultsCount: number; // Number of results found
  clickedJobs: string[]; // Jobs clicked from results
  timestamp: Date; // When the search was performed
}

// Search analytics
export interface SearchAnalytics {
  popularQueries: { query: string; count: number }[]; // Most popular search queries
  commonFilters: { filter: string; count: number }[]; // Most used filters
  averageResultsPerSearch: number; // Average number of results
  searchToApplicationRate: number; // Conversion rate from search to application
  topSearchLocations: { location: string; count: number }[]; // Most searched locations
  topSearchSkills: { skill: string; count: number }[]; // Most searched skills
}