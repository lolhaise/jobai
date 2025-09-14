import axios, { AxiosInstance } from 'axios';
import { UnifiedJob, JobSearchFilters, APIClientConfig, JobAPIClient } from './types';
import { BaseAPIClient } from './base-client';

interface TheMuseJob {
  id: number;
  name: string;
  contents: string;
  short_name: string;
  publication_date: string;
  company: {
    id: number;
    name: string;
    short_name: string;
  };
  locations: Array<{
    name: string;
  }>;
  levels: Array<{
    name: string;
    short_name: string;
  }>;
  categories: Array<{
    name: string;
  }>;
  refs: {
    landing_page: string;
  };
  type?: string;
}

interface TheMuseResponse {
  results: TheMuseJob[];
  page: number;
  page_count: number;
  items_per_page: number;
  took: number;
  timed_out: boolean;
  total: number;
}

export class TheMuseClient extends BaseAPIClient implements JobAPIClient {
  private client: AxiosInstance;
  private apiKey?: string;

  constructor(config: APIClientConfig = {}) {
    super(config);
    this.apiKey = config.apiKey;
    this.client = axios.create({
      baseURL: 'https://www.themuse.com/api/public',
      timeout: config.timeout || 10000,
    });
  }

  async search(filters: JobSearchFilters): Promise<UnifiedJob[]> {
    try {
      const allJobs: UnifiedJob[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore && page < 5) {
        const params: any = {
          page,
          descending: true,
        };

        if (this.apiKey) {
          params.api_key = this.apiKey;
        }

        if (filters.keywords) {
          params.query = filters.keywords;
        }

        if (filters.location && filters.location !== 'Remote') {
          params.location = filters.location;
        }

        if (filters.category && filters.category.length > 0) {
          params.category = filters.category.join(',');
        }

        if (filters.experience && filters.experience.length > 0) {
          params.level = filters.experience.join(',');
        }

        const response = await this.rateLimiter.add(() =>
          this.client.get<TheMuseResponse>('/jobs', { params })
        ) as any;

        const jobs = response.data.results.map((job: TheMuseJob) => this.transformToUnified(job));
        const filteredJobs = jobs.filter((job: UnifiedJob) => this.applyFilters(job, filters));
        
        allJobs.push(...filteredJobs);

        hasMore = response.data.page < response.data.page_count - 1;
        page++;

        if (allJobs.length >= 100) break;
      }

      return allJobs.slice(0, 100);
    } catch (error) {
      console.error('The Muse API error:', error);
      return [];
    }
  }

  async getJob(id: string): Promise<UnifiedJob | null> {
    try {
      const params: any = {};
      if (this.apiKey) {
        params.api_key = this.apiKey;
      }

      const response = await this.rateLimiter.add(() =>
        this.client.get<TheMuseJob>(`/jobs/${id}`, { params })
      ) as any;
      
      return this.transformToUnified(response.data);
    } catch (error) {
      console.error('The Muse API error:', error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const params: any = { page: 0 };
      if (this.apiKey) {
        params.api_key = this.apiKey;
      }

      const response = await axios.get('https://www.themuse.com/api/public/jobs', {
        params,
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private transformToUnified(job: TheMuseJob): UnifiedJob {
    const location = job.locations.map(l => l.name).join(', ') || 'Not specified';
    const isRemote = location.toLowerCase().includes('remote') || 
                     location.toLowerCase().includes('flexible');
    
    return {
      id: `themuse-${job.id}`,
      source: 'themuse',
      sourceId: job.id.toString(),
      title: job.name,
      company: job.company.name,
      location,
      description: job.contents,
      url: job.refs.landing_page,
      remote: isRemote,
      type: this.mapJobType(job.type),
      experience: job.levels.map(l => l.name).join(', '),
      skills: this.extractSkills(job.contents),
      postedDate: new Date(job.publication_date),
      category: job.categories.map(c => c.name).join(', '),
      applicationUrl: job.refs.landing_page,
    };
  }

  private mapJobType(type?: string): UnifiedJob['type'] {
    if (!type) return 'full-time';
    
    const typeMap: Record<string, UnifiedJob['type']> = {
      'Full-Time': 'full-time',
      'Part-Time': 'part-time',
      'Contract': 'contract',
      'Internship': 'internship',
      'Temporary': 'temporary',
    };
    
    return typeMap[type] || 'full-time';
  }

  private extractSkills(description: string): string[] {
    const commonSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js',
      'AWS', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'PostgreSQL',
      'Git', 'CI/CD', 'Agile', 'REST API', 'GraphQL', 'Machine Learning',
      'Data Science', 'DevOps', 'Cloud', 'Azure', 'GCP', 'Linux',
      'HTML', 'CSS', 'Vue', 'Angular', 'Spring', 'Django', 'Flask',
    ];

    const skills: string[] = [];
    const lowerDescription = description.toLowerCase();

    for (const skill of commonSkills) {
      if (lowerDescription.includes(skill.toLowerCase())) {
        skills.push(skill);
      }
    }

    return skills;
  }

  private applyFilters(job: UnifiedJob, filters: JobSearchFilters): boolean {
    if (filters.remote === true && !job.remote) {
      return false;
    }

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