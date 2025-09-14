import { IsOptional, IsString, IsUrl, IsArray, IsInt, IsBoolean, IsEnum, IsDateString, Min } from 'class-validator';

export enum WorkAuthorization {
  CITIZEN = 'CITIZEN',
  PERMANENT_RESIDENT = 'PERMANENT_RESIDENT',
  WORK_VISA = 'WORK_VISA',
  STUDENT_VISA = 'STUDENT_VISA',
  OTHER = 'OTHER'
}

export enum SecurityClearance {
  NONE = 'NONE',
  PUBLIC_TRUST = 'PUBLIC_TRUST',
  SECRET = 'SECRET',
  TOP_SECRET = 'TOP_SECRET',
  TS_SCI = 'TS_SCI'
}

export enum VeteranStatus {
  NOT_VETERAN = 'NOT_VETERAN',
  VETERAN = 'VETERAN',
  PROTECTED_VETERAN = 'PROTECTED_VETERAN',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

export enum DisabilityStatus {
  NO = 'NO',
  YES = 'YES',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

export enum JobSearchStatus {
  ACTIVE = 'ACTIVE',
  PASSIVE = 'PASSIVE',
  NOT_LOOKING = 'NOT_LOOKING',
  URGENT = 'URGENT'
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  desiredJobTitles?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  desiredSalaryMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  desiredSalaryMax?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  desiredLocations?: string[];

  @IsOptional()
  @IsBoolean()
  openToRemote?: boolean;

  @IsOptional()
  @IsBoolean()
  openToHybrid?: boolean;

  @IsOptional()
  @IsBoolean()
  openToOnsite?: boolean;

  @IsOptional()
  @IsEnum(WorkAuthorization)
  workAuthorization?: WorkAuthorization;

  @IsOptional()
  @IsBoolean()
  requiresSponsorship?: boolean;

  @IsOptional()
  @IsEnum(SecurityClearance)
  securityClearance?: SecurityClearance;

  @IsOptional()
  @IsEnum(VeteranStatus)
  veteranStatus?: VeteranStatus;

  @IsOptional()
  @IsEnum(DisabilityStatus)
  disabilityStatus?: DisabilityStatus;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ethnicity?: string[];

  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @IsOptional()
  @IsUrl()
  githubUrl?: string;

  @IsOptional()
  @IsUrl()
  portfolioUrl?: string;

  @IsOptional()
  @IsEnum(JobSearchStatus)
  jobSearchStatus?: JobSearchStatus;

  @IsOptional()
  @IsDateString()
  availableStartDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  noticePeriod?: number;
}