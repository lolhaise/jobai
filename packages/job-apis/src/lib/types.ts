/**
 * API Integration Framework Types
 * Comprehensive type definitions for the job board API integration system
 */

// Base API Types
export interface APICredentials {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface APIEndpoint {
  baseUrl: string;
  version?: string;
  timeout?: number;
  retries?: number;
}

export interface APILimits {
  requests: number;
  per: number; // milliseconds
  burst?: number;
  quotaReset?: Date;
}

// Job Board Provider Configuration
export interface JobBoardProvider {
  id: string;
  name: string;
  type: 'rest' | 'graphql' | 'soap' | 'webhook';
  status: 'active' | 'inactive' | 'maintenance' | 'deprecated';
  endpoint: APIEndpoint;
  credentials: APICredentials;
  rateLimits: APILimits;
  features: JobBoardFeatures;
  webhook?: WebhookConfiguration;
  metadata?: Record<string, any>;
}

export interface JobBoardFeatures {
  search: boolean;
  details: boolean;
  apply: boolean;
  webhooks: boolean;
  bulkOperations: boolean;
  realTimeUpdates: boolean;
  advancedFilters: boolean;
  salaryData: boolean;
  companyData: boolean;
}

export interface WebhookConfiguration {
  url: string;
  secret: string;
  events: string[];
  headers?: Record<string, string>;
  retryPolicy?: WebhookRetryPolicy;
}

export interface WebhookRetryPolicy {
  maxAttempts: number;
  backoffType: 'linear' | 'exponential';
  initialDelay: number;
  maxDelay: number;
}

// Job Data Models
export interface StandardJob {
  // Identifiers
  id: string;
  externalId: string;
  source: string;
  sourceUrl?: string;
  
  // Basic Information
  title: string;
  description: string;
  summary?: string;
  
  // Company Information
  company: CompanyData;
  
  // Position Details
  location: LocationData;
  remote: boolean;
  hybrid?: boolean;
  department?: string;
  level: JobLevel;
  employmentType: EmploymentType;
  
  // Compensation
  salary?: SalaryData;
  benefits?: string[];
  equity?: boolean;
  
  // Requirements
  requirements: JobRequirements;
  
  // Application Information
  applicationMethod: ApplicationMethod;
  applicationUrl?: string;
  applicationEmail?: string;
  applicationDeadline?: Date;
  
  // Metadata
  tags: string[];
  categories: string[];
  skills: string[];
  languages?: string[];
  postedAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  featured?: boolean;
  urgent?: boolean;
  
  // Processing Status
  status: JobStatus;
  processingMetadata?: JobProcessingMetadata;
}

export interface CompanyData {
  name: string;
  description?: string;
  website?: string;
  logo?: string;
  size?: CompanySize;
  industry?: string;
  location?: LocationData;
  founded?: number;
  culture?: string[];
  benefits?: string[];
  socialMedia?: SocialMediaLinks;
}

export interface LocationData {
  country: string;
  countryCode?: string;
  state?: string;
  stateCode?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  timezone?: string;
}

export interface SalaryData {
  min?: number;
  max?: number;
  currency: string;
  period: SalaryPeriod;
  negotiable?: boolean;
  equity?: boolean;
  bonus?: boolean;
  commission?: boolean;
  benefits?: boolean;
}

export interface JobRequirements {
  experience: ExperienceLevel;
  education?: EducationLevel;
  skills: SkillRequirement[];
  languages?: LanguageRequirement[];
  certifications?: string[];
  licenses?: string[];
  other?: string[];
}

export interface SkillRequirement {
  name: string;
  level: SkillLevel;
  required: boolean;
  yearsRequired?: number;
}

export interface LanguageRequirement {
  language: string;
  level: LanguageLevel;
  required: boolean;
}

export interface ApplicationMethod {
  type: 'url' | 'email' | 'internal' | 'thirdparty';
  value: string;
  instructions?: string;
  requiredDocuments?: string[];
}

export interface JobProcessingMetadata {
  fetchedAt: Date;
  processedAt: Date;
  lastUpdatedAt: Date;
  version: number;
  checksum: string;
  errors?: string[];
  warnings?: string[];
  enrichments?: string[];
}

export interface SocialMediaLinks {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  github?: string;
  glassdoor?: string;
}

// Enums and Union Types
export type JobLevel = 
  | 'internship' 
  | 'entry' 
  | 'junior' 
  | 'mid' 
  | 'senior' 
  | 'lead' 
  | 'principal' 
  | 'director' 
  | 'vp' 
  | 'c-level';

export type EmploymentType = 
  | 'fulltime' 
  | 'parttime' 
  | 'contract' 
  | 'temporary' 
  | 'freelance' 
  | 'internship';

export type CompanySize = 
  | 'startup' 
  | 'small' 
  | 'medium' 
  | 'large' 
  | 'enterprise';

export type SalaryPeriod = 
  | 'hourly' 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'yearly';

export type ExperienceLevel = 
  | 'none' 
  | '0-1' 
  | '1-3' 
  | '3-5' 
  | '5-10' 
  | '10+';

export type EducationLevel = 
  | 'none' 
  | 'high-school' 
  | 'associates' 
  | 'bachelors' 
  | 'masters' 
  | 'phd';

export type SkillLevel = 
  | 'beginner' 
  | 'intermediate' 
  | 'advanced' 
  | 'expert';

export type LanguageLevel = 
  | 'basic' 
  | 'conversational' 
  | 'fluent' 
  | 'native';

export type JobStatus = 
  | 'active' 
  | 'inactive' 
  | 'expired' 
  | 'filled' 
  | 'draft' 
  | 'pending' 
  | 'rejected';

// Search and Filter Types
export interface JobSearchQuery {
  // Basic Search
  keywords?: string;
  location?: LocationFilter;
  remote?: boolean;
  
  // Company Filters
  company?: string;
  companySize?: CompanySize[];
  industry?: string[];
  
  // Job Details
  level?: JobLevel[];
  employmentType?: EmploymentType[];
  salary?: SalaryFilter;
  
  // Requirements
  experience?: ExperienceLevel[];
  education?: EducationLevel[];
  skills?: string[];
  
  // Date Filters
  postedSince?: Date;
  updatedSince?: Date;
  
  // Pagination
  page?: number;
  limit?: number;
  
  // Sorting
  sortBy?: JobSortField;
  sortOrder?: 'asc' | 'desc';
}

export interface LocationFilter {
  countries?: string[];
  states?: string[];
  cities?: string[];
  radius?: number; // kilometers
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface SalaryFilter {
  min?: number;
  max?: number;
  currency?: string;
  period?: SalaryPeriod;
}

export type JobSortField = 
  | 'relevance' 
  | 'date' 
  | 'salary' 
  | 'company' 
  | 'location' 
  | 'title';

export interface JobSearchResult {
  jobs: StandardJob[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  query: JobSearchQuery;
  executionTime: number;
  source: string;
}

// API Response Types
export interface APISuccessResponse<T = any> {
  success: true;
  data: T;
  metadata?: {
    requestId: string;
    timestamp: Date;
    source: string;
    cached?: boolean;
    rateLimited?: boolean;
  };
}

export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    retryable?: boolean;
    retryAfter?: number;
  };
  metadata?: {
    requestId: string;
    timestamp: Date;
    source: string;
  };
}

export type APIResponse<T = any> = APISuccessResponse<T> | APIErrorResponse;

// Integration Health and Monitoring
export interface IntegrationHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'maintenance';
  lastCheck: Date;
  responseTime: number;
  uptime: number;
  rateLimits: {
    remaining: number;
    resetTime: Date;
    limit: number;
  };
  errors: {
    count: number;
    lastError?: Date;
    types: Record<string, number>;
  };
  features: Record<string, boolean>;
}

export interface IntegrationMetrics {
  provider: string;
  timeframe: {
    start: Date;
    end: Date;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
    rateLimited: number;
    cached: number;
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    slowestEndpoint: string;
  };
  jobs: {
    fetched: number;
    processed: number;
    errors: number;
    duplicates: number;
  };
}

// Configuration Types
export interface APIIntegrationConfig {
  providers: JobBoardProvider[];
  global: {
    timeout: number;
    retries: number;
    rateLimiting: {
      enabled: boolean;
      default: APILimits;
    };
    caching: {
      enabled: boolean;
      ttl: number;
      maxSize: number;
    };
    errorHandling: {
      circuitBreaker: boolean;
      exponentialBackoff: boolean;
      maxRetries: number;
    };
    monitoring: {
      enabled: boolean;
      healthChecks: boolean;
      metrics: boolean;
      alerting: boolean;
    };
  };
}