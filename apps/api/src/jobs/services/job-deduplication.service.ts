// Job Deduplication Service - Identifies and manages duplicate job listings
// Uses multiple strategies to detect duplicates across different job boards

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import * as similarity from 'string-similarity';
import { UnifiedJob } from '../schemas/unified-job.schema';

// Interface for deduplication results
interface DeduplicationResult {
  // Whether this job is a duplicate
  isDuplicate: boolean;
  // Confidence score (0-100) that this is a duplicate
  confidence: number;
  // ID of the parent job if duplicate
  parentJobId?: string;
  // Reason for the match
  matchReason?: string;
  // Similar jobs found (potential duplicates)
  similarJobs?: Array<{
    jobId: string;
    similarity: number;
    matchType: string;
  }>;
}

// Interface for deduplication strategies
interface DeduplicationStrategy {
  // Strategy name for logging
  name: string;
  // Execute the strategy
  execute(job: UnifiedJob, existingJobs: UnifiedJob[]): DeduplicationResult;
  // Weight for this strategy in final decision
  weight: number;
}

@Injectable()
export class JobDeduplicationService {
  private readonly logger = new Logger(JobDeduplicationService.name);
  
  // Threshold for considering jobs as duplicates (0-100)
  private readonly DUPLICATE_THRESHOLD = 85;
  
  // Threshold for fuzzy matching titles
  private readonly TITLE_SIMILARITY_THRESHOLD = 0.9;
  
  // Threshold for description similarity
  private readonly DESCRIPTION_SIMILARITY_THRESHOLD = 0.85;

  /**
   * Generate a deduplication hash for a job
   * This hash is used for exact matching of duplicates
   */
  generateDeduplicationHash(job: Partial<UnifiedJob>): string {
    // Normalize and combine key fields for hashing
    const normalizedCompany = this.normalizeString(job.company?.name || '');
    const normalizedTitle = this.normalizeString(job.title || '');
    const normalizedLocation = this.normalizeString(
      `${job.location?.city || ''} ${job.location?.state || ''} ${job.location?.country || ''}`
    );
    
    // Create hash from normalized values
    const hashInput = `${normalizedCompany}|${normalizedTitle}|${normalizedLocation}`;
    return createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Check if a job is a duplicate of existing jobs
   */
  async checkForDuplicates(
    job: UnifiedJob,
    existingJobs: UnifiedJob[]
  ): Promise<DeduplicationResult> {
    // If no existing jobs, it's not a duplicate
    if (existingJobs.length === 0) {
      return {
        isDuplicate: false,
        confidence: 0,
      };
    }

    // Define deduplication strategies
    const strategies: DeduplicationStrategy[] = [
      this.createExactHashStrategy(),
      this.createTitleCompanyLocationStrategy(),
      this.createFuzzyTitleStrategy(),
      this.createDescriptionSimilarityStrategy(),
      this.createApplicationUrlStrategy(),
    ];

    // Execute all strategies and collect results
    const strategyResults = strategies.map(strategy => {
      const result = strategy.execute(job, existingJobs);
      return {
        ...result,
        strategyName: strategy.name,
        weight: strategy.weight,
      };
    });

    // Calculate weighted confidence score
    const weightedConfidence = this.calculateWeightedConfidence(strategyResults);
    
    // Find the best match (highest confidence)
    const bestMatch = strategyResults
      .filter(r => r.isDuplicate)
      .sort((a, b) => b.confidence - a.confidence)[0];

    // Log the deduplication decision
    if (bestMatch && weightedConfidence >= this.DUPLICATE_THRESHOLD) {
      this.logger.debug(
        `Duplicate detected: Job "${job.title}" at ${job.company.name} ` +
        `matches existing job with ${weightedConfidence}% confidence ` +
        `(Strategy: ${bestMatch.strategyName})`
      );
    }

    return {
      isDuplicate: weightedConfidence >= this.DUPLICATE_THRESHOLD,
      confidence: weightedConfidence,
      parentJobId: bestMatch?.parentJobId,
      matchReason: bestMatch?.matchReason,
      similarJobs: this.findSimilarJobs(job, existingJobs),
    };
  }

  /**
   * Strategy: Exact hash matching
   */
  private createExactHashStrategy(): DeduplicationStrategy {
    return {
      name: 'ExactHash',
      weight: 1.0,
      execute: (job: UnifiedJob, existingJobs: UnifiedJob[]) => {
        // Find jobs with exact same hash
        const match = existingJobs.find(
          existing => existing.deduplicationHash === job.deduplicationHash
        );

        if (match) {
          return {
            isDuplicate: true,
            confidence: 100,
            parentJobId: match.id,
            matchReason: 'Exact hash match',
          };
        }

        return { isDuplicate: false, confidence: 0 };
      },
    };
  }

  /**
   * Strategy: Title + Company + Location exact match
   */
  private createTitleCompanyLocationStrategy(): DeduplicationStrategy {
    return {
      name: 'TitleCompanyLocation',
      weight: 0.9,
      execute: (job: UnifiedJob, existingJobs: UnifiedJob[]) => {
        // Normalize fields for comparison
        const normalizedTitle = this.normalizeString(job.title);
        const normalizedCompany = this.normalizeString(job.company.name);
        const normalizedLocation = this.normalizeString(
          `${job.location.city} ${job.location.state}`
        );

        // Find exact matches
        const match = existingJobs.find(existing => {
          const existingTitle = this.normalizeString(existing.title);
          const existingCompany = this.normalizeString(existing.company.name);
          const existingLocation = this.normalizeString(
            `${existing.location.city} ${existing.location.state}`
          );

          return (
            normalizedTitle === existingTitle &&
            normalizedCompany === existingCompany &&
            normalizedLocation === existingLocation
          );
        });

        if (match) {
          return {
            isDuplicate: true,
            confidence: 95,
            parentJobId: match.id,
            matchReason: 'Title, company, and location match',
          };
        }

        return { isDuplicate: false, confidence: 0 };
      },
    };
  }

  /**
   * Strategy: Fuzzy title matching with same company
   */
  private createFuzzyTitleStrategy(): DeduplicationStrategy {
    return {
      name: 'FuzzyTitle',
      weight: 0.8,
      execute: (job: UnifiedJob, existingJobs: UnifiedJob[]) => {
        const normalizedCompany = this.normalizeString(job.company.name);
        
        // Filter jobs from same company
        const sameCompanyJobs = existingJobs.filter(
          existing => this.normalizeString(existing.company.name) === normalizedCompany
        );

        if (sameCompanyJobs.length === 0) {
          return { isDuplicate: false, confidence: 0 };
        }

        // Find best title match
        const titles = sameCompanyJobs.map(j => j.title);
        const matches = similarity.findBestMatch(job.title, titles);

        if (matches.bestMatch.rating >= this.TITLE_SIMILARITY_THRESHOLD) {
          const matchedJob = sameCompanyJobs[matches.bestMatchIndex];
          return {
            isDuplicate: true,
            confidence: Math.round(matches.bestMatch.rating * 90),
            parentJobId: matchedJob.id,
            matchReason: `Fuzzy title match (${Math.round(matches.bestMatch.rating * 100)}% similar)`,
          };
        }

        return { isDuplicate: false, confidence: 0 };
      },
    };
  }

  /**
   * Strategy: Description similarity matching
   */
  private createDescriptionSimilarityStrategy(): DeduplicationStrategy {
    return {
      name: 'DescriptionSimilarity',
      weight: 0.7,
      execute: (job: UnifiedJob, existingJobs: UnifiedJob[]) => {
        // Only check jobs from same company or similar titles
        const candidateJobs = existingJobs.filter(existing => {
          const sameCompany = this.normalizeString(existing.company.name) === 
                             this.normalizeString(job.company.name);
          const similarTitle = similarity.compareTwoStrings(
            job.title, 
            existing.title
          ) > 0.7;
          return sameCompany || similarTitle;
        });

        if (candidateJobs.length === 0) {
          return { isDuplicate: false, confidence: 0 };
        }

        // Compare descriptions using shingles (n-grams)
        const jobShingles = this.createShingles(job.description, 3);
        let bestMatch: { job: UnifiedJob; similarity: number } | null = null;

        for (const candidate of candidateJobs) {
          const candidateShingles = this.createShingles(candidate.description, 3);
          const similarity = this.calculateJaccardSimilarity(jobShingles, candidateShingles);

          if (similarity >= this.DESCRIPTION_SIMILARITY_THRESHOLD) {
            if (!bestMatch || similarity > bestMatch.similarity) {
              bestMatch = { job: candidate, similarity };
            }
          }
        }

        if (bestMatch) {
          return {
            isDuplicate: true,
            confidence: Math.round(bestMatch.similarity * 85),
            parentJobId: bestMatch.job.id,
            matchReason: `Description similarity (${Math.round(bestMatch.similarity * 100)}%)`,
          };
        }

        return { isDuplicate: false, confidence: 0 };
      },
    };
  }

  /**
   * Strategy: Application URL matching
   */
  private createApplicationUrlStrategy(): DeduplicationStrategy {
    return {
      name: 'ApplicationUrl',
      weight: 0.6,
      execute: (job: UnifiedJob, existingJobs: UnifiedJob[]) => {
        // Normalize application URL
        const normalizedUrl = this.normalizeUrl(job.application.url);
        
        // Find jobs with same application URL
        const match = existingJobs.find(
          existing => this.normalizeUrl(existing.application.url) === normalizedUrl
        );

        if (match) {
          return {
            isDuplicate: true,
            confidence: 90,
            parentJobId: match.id,
            matchReason: 'Same application URL',
          };
        }

        return { isDuplicate: false, confidence: 0 };
      },
    };
  }

  /**
   * Calculate weighted confidence from multiple strategies
   */
  private calculateWeightedConfidence(
    results: Array<{ confidence: number; weight: number }>
  ): number {
    const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
    const weightedSum = results.reduce(
      (sum, r) => sum + r.confidence * r.weight,
      0
    );
    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Find similar jobs (not necessarily duplicates)
   */
  private findSimilarJobs(
    job: UnifiedJob,
    existingJobs: UnifiedJob[],
    limit: number = 5
  ): Array<{ jobId: string; similarity: number; matchType: string }> {
    const similarities = existingJobs.map(existing => {
      // Calculate different similarity scores
      const titleSimilarity = similarity.compareTwoStrings(job.title, existing.title);
      const companySimilarity = similarity.compareTwoStrings(
        job.company.name,
        existing.company.name
      );
      const skillsSimilarity = this.calculateArraySimilarity(
        job.requiredSkills,
        existing.requiredSkills
      );

      // Weighted average of similarities
      const overallSimilarity = (
        titleSimilarity * 0.4 +
        companySimilarity * 0.3 +
        skillsSimilarity * 0.3
      );

      return {
        jobId: existing.id,
        similarity: Math.round(overallSimilarity * 100),
        matchType: this.getMatchType(titleSimilarity, companySimilarity, skillsSimilarity),
      };
    });

    // Return top similar jobs
    return similarities
      .filter(s => s.similarity > 50)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Normalize string for comparison
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '');
  }

  /**
   * Normalize URL for comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove tracking parameters
      const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source'];
      paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
      return urlObj.toString().toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Create shingles (n-grams) from text
   */
  private createShingles(text: string, n: number = 3): Set<string> {
    const normalized = this.normalizeString(text);
    const shingles = new Set<string>();
    
    for (let i = 0; i <= normalized.length - n; i++) {
      shingles.add(normalized.substring(i, i + n));
    }
    
    return shingles;
  }

  /**
   * Calculate Jaccard similarity between two sets
   */
  private calculateJaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  /**
   * Calculate similarity between two arrays
   */
  private calculateArraySimilarity(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 && arr2.length === 0) return 1;
    if (arr1.length === 0 || arr2.length === 0) return 0;

    const set1 = new Set(arr1.map(s => this.normalizeString(s)));
    const set2 = new Set(arr2.map(s => this.normalizeString(s)));
    
    return this.calculateJaccardSimilarity(set1, set2);
  }

  /**
   * Determine match type based on similarity scores
   */
  private getMatchType(
    titleSim: number,
    companySim: number,
    skillsSim: number
  ): string {
    if (titleSim > 0.8 && companySim > 0.8) return 'Strong match';
    if (titleSim > 0.7 || skillsSim > 0.7) return 'Similar role';
    if (companySim > 0.9) return 'Same company';
    return 'Related job';
  }
}