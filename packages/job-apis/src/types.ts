export interface UnifiedJob {
  id: string;
  source: 'usajobs' | 'remoteok' | 'remotive' | 'themuse';
  sourceId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
  };
  remote: boolean;
  type: 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary';
  experience?: string;
  skills: string[];
  postedDate: Date;
  expirationDate?: Date;
  category?: string;
  benefits?: string[];
  requirements?: string[];
  responsibilities?: string[];
  companyLogo?: string;
  applicationUrl?: string;
  score?: number;
}

export interface JobSearchFilters {
  keywords?: string;
  location?: string;
  remote?: boolean;
  salary?: {
    min?: number;
    max?: number;
  };
  type?: string[];
  experience?: string[];
  category?: string[];
  datePosted?: number;
}

export interface APIClientConfig {
  apiKey?: string;
  rateLimit?: number;
  timeout?: number;
  retryAttempts?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export interface APIResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  metadata?: {
    totalResults?: number;
    page?: number;
    pageSize?: number;
  };
}

export interface JobAPIClient {
  search(filters: JobSearchFilters): Promise<UnifiedJob[]>;
  getJob(id: string): Promise<UnifiedJob | null>;
  isAvailable(): Promise<boolean>;
}