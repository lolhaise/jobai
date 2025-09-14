import axios, { AxiosInstance } from 'axios';
import { UnifiedJob, JobSearchFilters, APIClientConfig, JobAPIClient } from './types';
import { BaseAPIClient } from './base-client';

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo?: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
}

export class RemotiveClient extends BaseAPIClient implements JobAPIClient {
  private client: AxiosInstance;

  constructor(config: APIClientConfig = {}) {
    super(config);
    this.client = axios.create({
      baseURL: 'https://remotive.com/api',
      timeout: config.timeout || 10000,
    });
  }

  async search(filters: JobSearchFilters): Promise<UnifiedJob[]> {
    try {
      const params: any = {
        limit: 100,
      };

      if (filters.category) {
        params.category = filters.category[0];
      }

      if (filters.keywords) {
        params.search = filters.keywords;
      }

      const response = await this.rateLimiter.add(() =>
        this.client.get('/remote-jobs', { params })
      ) as any;

      const jobs = response.data.jobs || [];
      
      return jobs.map((job: RemotiveJob) => this.transformToUnified(job))
        .filter((job: UnifiedJob) => this.applyFilters(job, filters));
    } catch (error) {
      console.error('Remotive API error:', error);
      return [];
    }
  }

  async getJob(id: string): Promise<UnifiedJob | null> {
    try {
      const response = await this.rateLimiter.add(() =>
        this.client.get('/remote-jobs')
      ) as any;
      
      const job = response.data.jobs.find((j: RemotiveJob) => j.id.toString() === id);
      return job ? this.transformToUnified(job) : null;
    } catch (error) {
      console.error('Remotive API error:', error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get('https://remotive.com/api/remote-jobs?limit=1', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private transformToUnified(job: RemotiveJob): UnifiedJob {
    const salary = this.parseSalary(job.salary);
    
    return {
      id: `remotive-${job.id}`,
      source: 'remotive',
      sourceId: job.id.toString(),
      title: job.title,
      company: job.company_name,
      location: job.candidate_required_location || 'Remote',
      description: job.description,
      url: job.url,
      salary,
      remote: true,
      type: this.mapJobType(job.job_type),
      skills: job.tags || [],
      postedDate: new Date(job.publication_date),
      category: job.category,
      companyLogo: job.company_logo,
      applicationUrl: job.url,
    };
  }

  private parseSalary(salaryString: string): UnifiedJob['salary'] | undefined {
    if (!salaryString) return undefined;

    const salaryMatch = salaryString.match(/\$?([\d,]+)\s*-?\s*\$?([\d,]+)?/);
    if (salaryMatch) {
      const min = parseInt(salaryMatch[1].replace(/,/g, ''));
      const max = salaryMatch[2] ? parseInt(salaryMatch[2].replace(/,/g, '')) : undefined;
      
      return {
        min,
        max,
        currency: 'USD',
        period: salaryString.toLowerCase().includes('hour') ? 'hourly' : 'yearly',
      };
    }

    return undefined;
  }

  private mapJobType(type: string): UnifiedJob['type'] {
    const typeMap: Record<string, UnifiedJob['type']> = {
      'full_time': 'full-time',
      'contract': 'contract',
      'part_time': 'part-time',
      'internship': 'internship',
      'temporary': 'temporary',
    };
    
    return typeMap[type.toLowerCase()] || 'full-time';
  }

  private applyFilters(job: UnifiedJob, filters: JobSearchFilters): boolean {
    if (filters.salary?.min && job.salary?.min && job.salary.min < filters.salary.min) {
      return false;
    }

    if (filters.type && filters.type.length > 0 && !filters.type.includes(job.type)) {
      return false;
    }

    if (filters.datePosted) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - filters.datePosted);
      if (job.postedDate < daysAgo) {
        return false;
      }
    }

    return true;
  }
}