import axios, { AxiosInstance } from 'axios';
import { UnifiedJob, JobSearchFilters, APIClientConfig, JobAPIClient } from './types';
import { BaseAPIClient } from './base-client';

interface USAJobsSearchResult {
  SearchResult: {
    SearchResultCount: number;
    SearchResultCountAll: number;
    SearchResultItems: Array<{
      MatchedObjectDescriptor: any;
    }>;
  };
}

export class USAJobsClient extends BaseAPIClient implements JobAPIClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: APIClientConfig = {}) {
    super(config);
    
    if (!config.apiKey) {
      throw new Error('USAJobs API requires an API key');
    }
    
    this.apiKey = config.apiKey;
    this.client = axios.create({
      baseURL: 'https://data.usajobs.gov/api',
      timeout: config.timeout || 10000,
      headers: {
        'Authorization-Key': config.apiKey,
        'User-Agent': 'JobAI Platform (contact@jobai.com)',
        'Host': 'data.usajobs.gov',
      },
    });
  }

  async search(filters: JobSearchFilters): Promise<UnifiedJob[]> {
    try {
      const params = new URLSearchParams({
        ...(filters.keywords && { Keyword: filters.keywords }),
        ...(filters.location && { LocationName: filters.location }),
        ResultsPerPage: '100',
        Page: '1',
      });

      if (filters.datePosted) {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - filters.datePosted);
        params.append('DatePosted', daysAgo.toISOString().split('T')[0]);
      }

      const response = await this.rateLimiter.add(() =>
        this.client.get<USAJobsSearchResult>(`/Search?${params.toString()}`)
      ) as any;

      const searchResult = response.data.SearchResult;
      
      if (!searchResult || !searchResult.SearchResultItems) {
        return [];
      }

      return searchResult.SearchResultItems
        .map((item: any) => this.transformToUnified(item.MatchedObjectDescriptor))
        .filter((job: UnifiedJob) => this.applyFilters(job, filters));
    } catch (error) {
      console.error('USAJobs API error:', error);
      return [];
    }
  }

  async getJob(id: string): Promise<UnifiedJob | null> {
    try {
      const actualId = id.startsWith('usajobs-') ? id.substring(8) : id;
      
      const response = await this.rateLimiter.add(() =>
        this.client.get<USAJobsSearchResult>(`/Search?PositionID=${actualId}`)
      ) as any;

      const searchResult = response.data.SearchResult;
      
      if (!searchResult?.SearchResultItems?.length) {
        return null;
      }

      return this.transformToUnified(
        searchResult.SearchResultItems[0].MatchedObjectDescriptor
      );
    } catch (error) {
      console.error('USAJobs API error:', error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get('https://data.usajobs.gov/api/Search?ResultsPerPage=1', {
        headers: {
          'Authorization-Key': this.apiKey,
          'User-Agent': 'JobAI Platform (contact@jobai.com)',
          'Host': 'data.usajobs.gov',
        },
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private transformToUnified(rawJob: any): UnifiedJob {
    const positionLocation = rawJob.PositionLocation?.[0] || {};
    const userArea = rawJob.UserArea?.Details || {};
    const remuneration = rawJob.PositionRemuneration?.[0];
    
    const skills = this.extractSkills(userArea.JobSummary || '');
    
    return {
      id: `usajobs-${rawJob.PositionID}`,
      source: 'usajobs',
      sourceId: rawJob.PositionID || '',
      title: rawJob.PositionTitle || '',
      company: rawJob.OrganizationName || '',
      location: positionLocation.LocationName || '',
      description: userArea.JobSummary || '',
      url: rawJob.PositionURI || '',
      salary: remuneration ? {
        min: parseFloat(remuneration.MinimumRange) || undefined,
        max: parseFloat(remuneration.MaximumRange) || undefined,
        currency: 'USD',
        period: remuneration.RateIntervalCode === 'PA' ? 'yearly' : 'hourly',
      } : undefined,
      remote: rawJob.TeleworkEligible === true || rawJob.TeleworkEligible === 'true',
      type: this.mapJobType(rawJob.PositionSchedule?.[0]?.Name),
      experience: userArea.RequiredDocuments || undefined,
      skills,
      postedDate: new Date(rawJob.PublicationStartDate || Date.now()),
      expirationDate: rawJob.ApplicationCloseDate ? new Date(rawJob.ApplicationCloseDate) : undefined,
      category: rawJob.JobCategory?.[0]?.Name || undefined,
      benefits: userArea.Benefits ? [userArea.Benefits] : [],
      requirements: userArea.MajorDuties ? [userArea.MajorDuties] : [],
      responsibilities: userArea.Education ? [userArea.Education] : [],
      applicationUrl: rawJob.ApplyURI?.[0] || rawJob.PositionURI || '',
    };
  }

  private mapJobType(schedule?: string): UnifiedJob['type'] {
    if (!schedule) return 'full-time';
    
    const lower = schedule.toLowerCase();
    if (lower.includes('part')) return 'part-time';
    if (lower.includes('intern')) return 'internship';
    if (lower.includes('temp')) return 'temporary';
    if (lower.includes('contract')) return 'contract';
    
    return 'full-time';
  }

  private extractSkills(description: string): string[] {
    const federalSkills = [
      'Security Clearance', 'Federal Experience', 'GS Level',
      'Budget Management', 'Contract Management', 'Policy Development',
      'Regulatory Compliance', 'Grant Management', 'FOIA',
    ];

    const technicalSkills = [
      'Project Management', 'Data Analysis', 'Microsoft Office',
      'Communication', 'Leadership', 'Problem Solving',
      'Research', 'Writing', 'Public Speaking',
    ];

    const allSkills = [...federalSkills, ...technicalSkills];
    const foundSkills: string[] = [];
    const lowerDescription = description.toLowerCase();

    for (const skill of allSkills) {
      if (lowerDescription.includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    }

    return foundSkills;
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

    return true;
  }
}