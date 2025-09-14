import { UnifiedJob, JobSearchFilters, APIClientConfig, JobAPIClient } from './types';
import { USAJobsClient } from './usajobs';
import { RemoteOKClient } from './remoteok';
import { RemotiveClient } from './remotive';
import { TheMuseClient } from './the-muse';
import PQueue from 'p-queue';

export interface AggregatorConfig {
  usaJobsApiKey?: string;
  theMuseApiKey?: string;
  enabledSources?: ('usajobs' | 'remoteok' | 'remotive' | 'themuse')[];
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export class JobAggregator {
  private clients: Map<string, JobAPIClient> = new Map();
  private cache: Map<string, { data: UnifiedJob[]; timestamp: number }> = new Map();
  private cacheTTL: number;
  private queue: PQueue;

  constructor(config: AggregatorConfig = {}) {
    this.cacheTTL = config.cacheTTL || 3600000; // 1 hour default
    this.queue = new PQueue({ concurrency: 3 });

    // Initialize all available API clients
    const enabledSources = config.enabledSources || ['usajobs', 'remoteok', 'remotive', 'themuse'];

    if (enabledSources.includes('usajobs') && config.usaJobsApiKey) {
      this.clients.set('usajobs', new USAJobsClient({ apiKey: config.usaJobsApiKey }));
    }

    if (enabledSources.includes('remoteok')) {
      this.clients.set('remoteok', new RemoteOKClient());
    }

    if (enabledSources.includes('remotive')) {
      this.clients.set('remotive', new RemotiveClient());
    }

    if (enabledSources.includes('themuse')) {
      this.clients.set('themuse', new TheMuseClient({ apiKey: config.theMuseApiKey }));
    }
  }

  async searchAllSources(filters: JobSearchFilters): Promise<UnifiedJob[]> {
    // Check cache first
    const cacheKey = JSON.stringify(filters);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // Check API availability
    const availableClients: [string, JobAPIClient][] = [];
    for (const [source, client] of this.clients) {
      const isAvailable = await client.isAvailable();
      if (isAvailable) {
        availableClients.push([source, client]);
      } else {
        console.warn(`${source} API is not available`);
      }
    }

    // Search all available sources in parallel
    const searchPromises = availableClients.map(([source, client]) =>
      this.queue.add(async () => {
        try {
          console.log(`Searching ${source}...`);
          const jobs = await client.search(filters);
          console.log(`Found ${jobs.length} jobs from ${source}`);
          return jobs;
        } catch (error) {
          console.error(`Error searching ${source}:`, error);
          return [];
        }
      }) as Promise<UnifiedJob[]>
    );

    const results = await Promise.all(searchPromises);
    const allJobs = results.flat();

    // Deduplicate and score jobs
    const deduplicatedJobs = this.deduplicateJobs(allJobs);
    const scoredJobs = this.scoreJobs(deduplicatedJobs, filters);

    // Cache results
    this.cache.set(cacheKey, {
      data: scoredJobs,
      timestamp: Date.now(),
    });

    return scoredJobs;
  }

  async getJob(id: string): Promise<UnifiedJob | null> {
    const [source] = id.split('-');
    const client = this.clients.get(source);
    
    if (!client) {
      console.error(`Unknown job source: ${source}`);
      return null;
    }

    return await client.getJob(id);
  }

  private deduplicateJobs(jobs: UnifiedJob[]): UnifiedJob[] {
    const seen = new Map<string, UnifiedJob>();

    for (const job of jobs) {
      // Create a unique key based on company, title, and location
      const normalizedTitle = job.title.toLowerCase().replace(/[^\w\s]/g, '');
      const normalizedCompany = job.company.toLowerCase().replace(/[^\w\s]/g, '');
      const normalizedLocation = job.location.toLowerCase().replace(/[^\w\s]/g, '');
      
      const key = `${normalizedCompany}-${normalizedTitle}-${normalizedLocation}`;
      
      if (!seen.has(key)) {
        seen.set(key, job);
      } else {
        // Keep the job with more information
        const existing = seen.get(key)!;
        if (this.getJobCompleteness(job) > this.getJobCompleteness(existing)) {
          seen.set(key, job);
        }
      }
    }

    return Array.from(seen.values());
  }

  private getJobCompleteness(job: UnifiedJob): number {
    let score = 0;
    
    if (job.description) score += job.description.length > 100 ? 2 : 1;
    if (job.salary) score += 2;
    if (job.skills && job.skills.length > 0) score += 1;
    if (job.requirements && job.requirements.length > 0) score += 1;
    if (job.responsibilities && job.responsibilities.length > 0) score += 1;
    if (job.benefits && job.benefits.length > 0) score += 1;
    if (job.companyLogo) score += 1;
    if (job.applicationUrl) score += 1;
    
    return score;
  }

  private scoreJobs(jobs: UnifiedJob[], filters: JobSearchFilters): UnifiedJob[] {
    return jobs.map(job => {
      let score = 0;

      // Keyword matching
      if (filters.keywords) {
        const keywords = filters.keywords.toLowerCase().split(' ');
        const jobText = `${job.title} ${job.description} ${job.skills.join(' ')}`.toLowerCase();
        
        for (const keyword of keywords) {
          if (jobText.includes(keyword)) {
            score += 10;
          }
        }
      }

      // Location preference
      if (filters.location && job.location.toLowerCase().includes(filters.location.toLowerCase())) {
        score += 5;
      }

      // Remote preference
      if (filters.remote && job.remote) {
        score += 8;
      }

      // Salary match
      if (filters.salary?.min && job.salary?.min) {
        if (job.salary.min >= filters.salary.min) {
          score += 7;
        }
      }

      // Recency bonus
      const daysSincePosted = Math.floor((Date.now() - job.postedDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSincePosted <= 7) {
        score += 5;
      } else if (daysSincePosted <= 14) {
        score += 3;
      } else if (daysSincePosted <= 30) {
        score += 1;
      }

      // Job completeness bonus
      score += this.getJobCompleteness(job);

      return { ...job, score };
    }).sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  async getAvailableSources(): Promise<string[]> {
    const available: string[] = [];
    
    for (const [source, client] of this.clients) {
      if (await client.isAvailable()) {
        available.push(source);
      }
    }
    
    return available;
  }

  clearCache(): void {
    this.cache.clear();
  }
}