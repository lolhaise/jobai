import axios, { AxiosInstance } from 'axios';
import { UnifiedJob, JobSearchFilters, APIClientConfig, JobAPIClient } from './types';
import { BaseAPIClient } from './base-client';

interface RemoteOKJob {
  id: string;
  slug: string;
  epoch: number;
  date: string;
  created_at: string;
  company: string;
  company_logo?: string;
  position: string;
  tags: string[];
  logo?: string;
  description: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  url: string;
  apply_url?: string;
}

export class RemoteOKClient extends BaseAPIClient implements JobAPIClient {
  private client: AxiosInstance;

  constructor(config: APIClientConfig = {}) {
    super(config);
    this.client = axios.create({
      baseURL: 'https://remoteok.com/api',
      timeout: config.timeout || 10000,
      headers: {
        'User-Agent': 'JobAI Platform',
      },
    });
  }

  async search(filters: JobSearchFilters): Promise<UnifiedJob[]> {
    try {
      let url = '';
      
      // RemoteOK supports tag-based searching
      if (filters.keywords) {
        const tag = filters.keywords.split(' ')[0].toLowerCase();
        url = `?tag=${tag}`;
      }

      const response = await this.rateLimiter.add(() =>
        this.client.get<any[]>(url)
      ) as any;

      // RemoteOK returns an array where first element might be metadata
      const data = Array.isArray(response.data) ? response.data : [];
      const jobs = data.filter((item: any) => item.id && item.position);
      
      return jobs
        .map((job: RemoteOKJob) => this.transformToUnified(job))
        .filter((job: UnifiedJob) => this.applyFilters(job, filters))
        .slice(0, 100); // Limit to 100 results
    } catch (error) {
      console.error('RemoteOK API error:', error);
      return [];
    }
  }

  async getJob(id: string): Promise<UnifiedJob | null> {
    try {
      // RemoteOK doesn't have a single job endpoint, so we fetch all and filter
      const actualId = id.startsWith('remoteok-') ? id.substring(9) : id;
      const response = await this.rateLimiter.add(() =>
        this.client.get<any[]>('')
      ) as any;

      const data = Array.isArray(response.data) ? response.data : [];
      const job = data.find((item: any) => item.id === actualId || item.slug === actualId);
      
      return job ? this.transformToUnified(job) : null;
    } catch (error) {
      console.error('RemoteOK API error:', error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get('https://remoteok.com/api', {
        timeout: 5000,
        headers: {
          'User-Agent': 'JobAI Platform',
        },
      });
      return response.status === 200 && Array.isArray(response.data);
    } catch {
      return false;
    }
  }

  private transformToUnified(job: RemoteOKJob): UnifiedJob {
    const salary = this.extractSalary(job);
    const postedDate = job.epoch 
      ? new Date(job.epoch * 1000) 
      : job.created_at 
        ? new Date(job.created_at) 
        : new Date();
    
    return {
      id: `remoteok-${job.id || job.slug}`,
      source: 'remoteok',
      sourceId: job.id || job.slug || '',
      title: job.position || '',
      company: job.company || '',
      location: job.location || 'Remote',
      description: this.cleanDescription(job.description || ''),
      url: job.url || job.apply_url || '',
      salary,
      remote: true, // RemoteOK only lists remote jobs
      type: this.detectJobType(job.position, job.tags),
      skills: job.tags || [],
      postedDate,
      companyLogo: job.company_logo || job.logo,
      applicationUrl: job.apply_url || job.url || '',
    };
  }

  private cleanDescription(description: string): string {
    // Remove HTML tags if present
    return description.replace(/<[^>]*>/g, '').trim();
  }

  private extractSalary(job: RemoteOKJob): UnifiedJob['salary'] | undefined {
    if (!job.salary_min && !job.salary_max) {
      return undefined;
    }
    
    return {
      min: job.salary_min || undefined,
      max: job.salary_max || undefined,
      currency: 'USD',
      period: 'yearly',
    };
  }

  private detectJobType(title: string, tags: string[]): UnifiedJob['type'] {
    const combinedText = `${title} ${tags.join(' ')}`.toLowerCase();
    
    if (combinedText.includes('intern')) return 'internship';
    if (combinedText.includes('contract')) return 'contract';
    if (combinedText.includes('part-time') || combinedText.includes('part time')) return 'part-time';
    if (combinedText.includes('temporary') || combinedText.includes('temp')) return 'temporary';
    
    return 'full-time';
  }

  private applyFilters(job: UnifiedJob, filters: JobSearchFilters): boolean {
    // Since RemoteOK only has remote jobs, check if user explicitly wants non-remote
    if (filters.remote === false) {
      return false;
    }

    if (filters.salary?.min && job.salary?.min && job.salary.min < filters.salary.min) {
      return false;
    }

    if (filters.salary?.max && job.salary?.max && job.salary.max > filters.salary.max) {
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

    // Additional keyword filtering if not already handled by API
    if (filters.keywords) {
      const keywords = filters.keywords.toLowerCase().split(' ');
      const jobText = `${job.title} ${job.description} ${job.skills.join(' ')}`.toLowerCase();
      
      const hasMatch = keywords.some(keyword => jobText.includes(keyword));
      if (!hasMatch) {
        return false;
      }
    }

    return true;
  }
}