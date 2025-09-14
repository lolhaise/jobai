// Unified Job Schema - Standardizes job data from all API sources
// This schema ensures consistent data structure regardless of source API

import { z } from 'zod';

// Enum for job types across all platforms
export enum JobType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  TEMPORARY = 'TEMPORARY',
  INTERNSHIP = 'INTERNSHIP',
  FREELANCE = 'FREELANCE',
  VOLUNTEER = 'VOLUNTEER',
}

// Enum for remote work options
export enum RemoteOption {
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID',
  ON_SITE = 'ON_SITE',
  FLEXIBLE = 'FLEXIBLE',
}

// Enum for experience levels
export enum ExperienceLevel {
  ENTRY = 'ENTRY',
  JUNIOR = 'JUNIOR',
  MID = 'MID',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
  EXECUTIVE = 'EXECUTIVE',
}

// Enum for job sources
export enum JobSource {
  USAJOBS = 'USAJOBS',
  REMOTEOK = 'REMOTEOK',
  REMOTIVE = 'REMOTIVE',
  THE_MUSE = 'THE_MUSE',
  ADZUNA = 'ADZUNA',
  INDEED = 'INDEED',
  ANGELLIST = 'ANGELLIST',
}

// Salary information schema
export const SalarySchema = z.object({
  // Minimum salary in USD (annualized)
  min: z.number().optional(),
  // Maximum salary in USD (annualized)
  max: z.number().optional(),
  // Currency code (default USD)
  currency: z.string().default('USD'),
  // Pay period (hourly, monthly, yearly)
  period: z.enum(['HOURLY', 'MONTHLY', 'YEARLY']).default('YEARLY'),
  // Whether salary is negotiable
  negotiable: z.boolean().default(false),
});

// Company information schema
export const CompanySchema = z.object({
  // Company name
  name: z.string(),
  // Company website URL
  website: z.string().url().optional(),
  // Company logo URL
  logo: z.string().url().optional(),
  // Company size range
  size: z.enum(['STARTUP', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']).optional(),
  // Industry/sector
  industry: z.string().optional(),
  // Company description
  description: z.string().optional(),
  // Glassdoor rating if available
  rating: z.number().min(0).max(5).optional(),
});

// Location information schema
export const LocationSchema = z.object({
  // City name
  city: z.string().optional(),
  // State or province
  state: z.string().optional(),
  // Country code (ISO 3166)
  country: z.string(),
  // ZIP/Postal code
  postalCode: z.string().optional(),
  // Full address if available
  address: z.string().optional(),
  // Latitude for mapping
  latitude: z.number().optional(),
  // Longitude for mapping
  longitude: z.number().optional(),
  // Whether location is required (vs remote)
  required: z.boolean().default(true),
});

// Application information schema
export const ApplicationSchema = z.object({
  // Direct application URL
  url: z.string().url(),
  // Email to apply to
  email: z.string().email().optional(),
  // Application deadline
  deadline: z.date().optional(),
  // Application instructions
  instructions: z.string().optional(),
  // Whether easy apply is available
  easyApply: z.boolean().default(false),
  // Required documents
  requiredDocuments: z.array(z.enum(['RESUME', 'COVER_LETTER', 'PORTFOLIO', 'REFERENCES', 'TRANSCRIPT'])).default([]),
});

// Benefits information schema
export const BenefitsSchema = z.object({
  // Health insurance offered
  health: z.boolean().optional(),
  // Dental insurance offered
  dental: z.boolean().optional(),
  // Vision insurance offered
  vision: z.boolean().optional(),
  // 401k/retirement offered
  retirement: z.boolean().optional(),
  // PTO days per year
  ptodays: z.number().optional(),
  // Remote work allowed
  remote: z.boolean().optional(),
  // Other benefits as array
  other: z.array(z.string()).default([]),
});

// Main Unified Job Schema
export const UnifiedJobSchema = z.object({
  // Unique identifier (composite of source + external ID)
  id: z.string(),
  // External ID from source API
  externalId: z.string(),
  // Source API this job came from
  source: z.nativeEnum(JobSource),
  // Job title
  title: z.string(),
  // Normalized job title for searching
  normalizedTitle: z.string(),
  // Full job description
  description: z.string(),
  // Short summary (first 200 chars if not provided)
  summary: z.string(),
  // Company information
  company: CompanySchema,
  // Location information
  location: LocationSchema,
  // Remote work option
  remoteOption: z.nativeEnum(RemoteOption),
  // Job type (full-time, part-time, etc)
  jobType: z.nativeEnum(JobType),
  // Experience level required
  experienceLevel: z.nativeEnum(ExperienceLevel),
  // Salary information
  salary: SalarySchema.optional(),
  // Application information
  application: ApplicationSchema,
  // Benefits information
  benefits: BenefitsSchema.optional(),
  // Required skills (extracted from description)
  requiredSkills: z.array(z.string()).default([]),
  // Nice-to-have skills
  preferredSkills: z.array(z.string()).default([]),
  // Job categories/tags
  categories: z.array(z.string()).default([]),
  // Date job was posted
  postedAt: z.date(),
  // Date job was last updated
  updatedAt: z.date(),
  // Date job expires (if known)
  expiresAt: z.date().optional(),
  // Whether job is still active
  isActive: z.boolean().default(true),
  // Whether job is featured/promoted
  isFeatured: z.boolean().default(false),
  // Number of applicants (if known)
  applicantCount: z.number().optional(),
  // Job relevance score (0-100)
  relevanceScore: z.number().min(0).max(100).default(0),
  // Job quality score (0-100)
  qualityScore: z.number().min(0).max(100).default(0),
  // Deduplication hash (for finding duplicates)
  deduplicationHash: z.string(),
  // Raw data from source API (for debugging)
  rawData: z.record(z.any()).optional(),
  // Metadata for tracking
  metadata: z.object({
    // When we first saw this job
    firstSeenAt: z.date(),
    // Last time we checked this job
    lastCheckedAt: z.date(),
    // Number of times we've seen this job
    checkCount: z.number().default(1),
    // Whether this is a duplicate
    isDuplicate: z.boolean().default(false),
    // Parent job ID if this is a duplicate
    parentJobId: z.string().optional(),
  }),
});

// Type exports for TypeScript
export type UnifiedJob = z.infer<typeof UnifiedJobSchema>;
export type Salary = z.infer<typeof SalarySchema>;
export type Company = z.infer<typeof CompanySchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Application = z.infer<typeof ApplicationSchema>;
export type Benefits = z.infer<typeof BenefitsSchema>;

// Helper function to create a unified job from raw API data
export function createUnifiedJob(
  source: JobSource,
  externalId: string,
  rawData: any
): Partial<UnifiedJob> {
  // Base structure that each API adapter will complete
  return {
    id: `${source}_${externalId}`,
    source,
    externalId,
    rawData,
    metadata: {
      firstSeenAt: new Date(),
      lastCheckedAt: new Date(),
      checkCount: 1,
      isDuplicate: false,
    },
  };
}

// Validation helper
export function validateUnifiedJob(job: unknown): UnifiedJob {
  return UnifiedJobSchema.parse(job);
}

// Partial validation for updates
export function validatePartialJob(job: unknown): Partial<UnifiedJob> {
  return UnifiedJobSchema.partial().parse(job);
}