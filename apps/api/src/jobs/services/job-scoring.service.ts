// Job Scoring Service - Ranks and scores jobs based on relevance and quality
// Uses multiple factors to determine job match quality for users

import { Injectable, Logger } from '@nestjs/common';
import * as natural from 'natural';
import { UnifiedJob, ExperienceLevel, RemoteOption } from '../schemas/unified-job.schema';

// Interface for user preferences used in scoring
export interface UserPreferences {
  // Desired job titles
  desiredTitles: string[];
  // Required skills user has
  skills: string[];
  // Years of experience
  experienceYears: number;
  // Desired salary range
  salaryMin?: number;
  salaryMax?: number;
  // Location preferences
  preferredLocations?: string[];
  // Remote work preference
  remotePreference?: RemoteOption;
  // Company size preference
  companySizePreference?: string[];
  // Industries of interest
  preferredIndustries?: string[];
  // Must-have keywords
  requiredKeywords?: string[];
  // Deal-breaker keywords
  excludeKeywords?: string[];
}

// Interface for scoring results
export interface JobScore {
  // Overall score (0-100)
  overall: number;
  // Individual component scores
  components: {
    // Title match score (0-100)
    titleMatch: number;
    // Skills match score (0-100)
    skillsMatch: number;
    // Experience level match (0-100)
    experienceMatch: number;
    // Salary match (0-100)
    salaryMatch: number;
    // Location match (0-100)
    locationMatch: number;
    // Company match (0-100)
    companyMatch: number;
    // Job quality score (0-100)
    qualityScore: number;
    // Freshness score (0-100)
    freshnessScore: number;
  };
  // Explanation of the score
  explanation: string[];
  // Matching keywords found
  matchedKeywords: string[];
  // Missing required skills
  missingSkills: string[];
  // Reasons for bonus points
  bonusReasons: string[];
  // Reasons for penalties
  penaltyReasons: string[];
}

// Weights for different scoring components
interface ScoringWeights {
  titleMatch: number;
  skillsMatch: number;
  experienceMatch: number;
  salaryMatch: number;
  locationMatch: number;
  companyMatch: number;
  qualityScore: number;
  freshnessScore: number;
}

@Injectable()
export class JobScoringService {
  private readonly logger = new Logger(JobScoringService.name);
  
  // TF-IDF instance for text analysis
  private tfidf: natural.TfIdf;
  
  // Default scoring weights (can be customized per user)
  private readonly defaultWeights: ScoringWeights = {
    titleMatch: 0.25,      // 25% weight for title relevance
    skillsMatch: 0.25,     // 25% weight for skills match
    experienceMatch: 0.15, // 15% weight for experience level
    salaryMatch: 0.10,     // 10% weight for salary match
    locationMatch: 0.10,   // 10% weight for location
    companyMatch: 0.05,    // 5% weight for company preferences
    qualityScore: 0.05,    // 5% weight for job quality
    freshnessScore: 0.05,  // 5% weight for how recent the job is
  };

  constructor() {
    // Initialize TF-IDF for keyword analysis
    this.tfidf = new natural.TfIdf();
  }

  /**
   * Score a job based on user preferences
   */
  async scoreJob(
    job: UnifiedJob,
    preferences: UserPreferences,
    weights?: Partial<ScoringWeights>
  ): Promise<JobScore> {
    // Merge custom weights with defaults
    const scoringWeights = { ...this.defaultWeights, ...weights };
    
    // Calculate individual component scores
    const components = {
      titleMatch: this.scoreTitleMatch(job, preferences),
      skillsMatch: this.scoreSkillsMatch(job, preferences),
      experienceMatch: this.scoreExperienceMatch(job, preferences),
      salaryMatch: this.scoreSalaryMatch(job, preferences),
      locationMatch: this.scoreLocationMatch(job, preferences),
      companyMatch: this.scoreCompanyMatch(job, preferences),
      qualityScore: this.calculateQualityScore(job),
      freshnessScore: this.calculateFreshnessScore(job),
    };

    // Calculate weighted overall score
    const overall = this.calculateOverallScore(components, scoringWeights);

    // Generate detailed explanation
    const explanation = this.generateExplanation(job, preferences, components);

    // Find matched keywords
    const matchedKeywords = this.findMatchedKeywords(job, preferences);

    // Identify missing skills
    const missingSkills = this.findMissingSkills(job, preferences);

    // Determine bonuses and penalties
    const { bonusReasons, penaltyReasons } = this.calculateBonusesAndPenalties(job, preferences);

    return {
      overall: Math.round(overall),
      components,
      explanation,
      matchedKeywords,
      missingSkills,
      bonusReasons,
      penaltyReasons,
    };
  }

  /**
   * Score title match between job and user preferences
   */
  private scoreTitleMatch(job: UnifiedJob, preferences: UserPreferences): number {
    if (preferences.desiredTitles.length === 0) {
      // No title preferences, give neutral score
      return 50;
    }

    // Tokenize and stem job title
    const jobTitleTokens = this.tokenizeAndStem(job.normalizedTitle);
    
    let maxScore = 0;

    // Check each desired title
    for (const desiredTitle of preferences.desiredTitles) {
      const desiredTokens = this.tokenizeAndStem(desiredTitle.toLowerCase());
      
      // Calculate token overlap
      const overlap = this.calculateTokenOverlap(jobTitleTokens, desiredTokens);
      
      // Also check for semantic similarity
      const semanticSimilarity = this.calculateSemanticSimilarity(
        job.normalizedTitle,
        desiredTitle
      );

      // Combine both scores
      const score = (overlap * 0.6 + semanticSimilarity * 0.4) * 100;
      maxScore = Math.max(maxScore, score);
    }

    return Math.round(maxScore);
  }

  /**
   * Score skills match between job requirements and user skills
   */
  private scoreSkillsMatch(job: UnifiedJob, preferences: UserPreferences): number {
    if (job.requiredSkills.length === 0) {
      // No skills specified, give neutral score
      return 60;
    }

    // Normalize skills for comparison
    const userSkills = new Set(
      preferences.skills.map(s => this.normalizeSkill(s))
    );
    
    const requiredSkills = job.requiredSkills.map(s => this.normalizeSkill(s));
    const preferredSkills = job.preferredSkills.map(s => this.normalizeSkill(s));

    // Count matches
    let requiredMatches = 0;
    let preferredMatches = 0;

    // Check required skills
    for (const skill of requiredSkills) {
      if (userSkills.has(skill) || this.hasRelatedSkill(skill, userSkills)) {
        requiredMatches++;
      }
    }

    // Check preferred skills
    for (const skill of preferredSkills) {
      if (userSkills.has(skill) || this.hasRelatedSkill(skill, userSkills)) {
        preferredMatches++;
      }
    }

    // Calculate score
    const requiredScore = requiredSkills.length > 0 
      ? (requiredMatches / requiredSkills.length) * 70
      : 70;
    
    const preferredScore = preferredSkills.length > 0
      ? (preferredMatches / preferredSkills.length) * 30
      : 0;

    return Math.round(requiredScore + preferredScore);
  }

  /**
   * Score experience level match
   */
  private scoreExperienceMatch(job: UnifiedJob, preferences: UserPreferences): number {
    const userExperience = preferences.experienceYears;
    const jobLevel = job.experienceLevel;

    // Map experience levels to year ranges
    const experienceMap: Record<ExperienceLevel, { min: number; max: number }> = {
      [ExperienceLevel.ENTRY]: { min: 0, max: 2 },
      [ExperienceLevel.JUNIOR]: { min: 1, max: 3 },
      [ExperienceLevel.MID]: { min: 3, max: 6 },
      [ExperienceLevel.SENIOR]: { min: 6, max: 10 },
      [ExperienceLevel.LEAD]: { min: 8, max: 15 },
      [ExperienceLevel.EXECUTIVE]: { min: 10, max: 30 },
    };

    const range = experienceMap[jobLevel];
    
    // Check if user experience falls within range
    if (userExperience >= range.min && userExperience <= range.max) {
      // Perfect match
      return 100;
    } else if (userExperience < range.min) {
      // Under-qualified: penalize based on gap
      const gap = range.min - userExperience;
      return Math.max(0, 100 - gap * 20);
    } else {
      // Over-qualified: slight penalty
      const gap = userExperience - range.max;
      return Math.max(50, 100 - gap * 10);
    }
  }

  /**
   * Score salary match
   */
  private scoreSalaryMatch(job: UnifiedJob, preferences: UserPreferences): number {
    // If no salary preferences or job salary not specified
    if (!preferences.salaryMin || !job.salary) {
      return 70; // Neutral score
    }

    const userMin = preferences.salaryMin;
    const userMax = preferences.salaryMax || userMin * 1.5;
    const jobMin = job.salary.min || 0;
    const jobMax = job.salary.max || jobMin;

    // Check overlap between ranges
    if (jobMax < userMin) {
      // Job pays less than minimum
      const gap = userMin - jobMax;
      const percentage = (gap / userMin) * 100;
      return Math.max(0, 100 - percentage * 2);
    } else if (jobMin > userMax) {
      // Job pays more than expected (might be out of reach)
      return 80; // Still good but maybe unrealistic
    } else {
      // Ranges overlap - calculate overlap percentage
      const overlapMin = Math.max(userMin, jobMin);
      const overlapMax = Math.min(userMax, jobMax);
      const overlapRange = overlapMax - overlapMin;
      const userRange = userMax - userMin;
      const overlapPercentage = overlapRange / userRange;
      return Math.round(50 + overlapPercentage * 50);
    }
  }

  /**
   * Score location match
   */
  private scoreLocationMatch(job: UnifiedJob, preferences: UserPreferences): number {
    // Check remote preference first
    if (preferences.remotePreference === RemoteOption.REMOTE) {
      if (job.remoteOption === RemoteOption.REMOTE) {
        return 100;
      } else if (job.remoteOption === RemoteOption.HYBRID) {
        return 80;
      } else if (job.remoteOption === RemoteOption.FLEXIBLE) {
        return 70;
      }
    }

    // Check specific location preferences
    if (preferences.preferredLocations && preferences.preferredLocations.length > 0) {
      const jobLocation = `${job.location.city} ${job.location.state} ${job.location.country}`.toLowerCase();
      
      for (const preferred of preferences.preferredLocations) {
        if (jobLocation.includes(preferred.toLowerCase())) {
          return 100;
        }
      }
      
      // Not in preferred locations
      if (job.remoteOption === RemoteOption.REMOTE) {
        return 70; // Remote is acceptable alternative
      }
      return 30; // Location mismatch
    }

    // No location preferences specified
    return 70;
  }

  /**
   * Score company match based on preferences
   */
  private scoreCompanyMatch(job: UnifiedJob, preferences: UserPreferences): number {
    let score = 70; // Base score

    // Check company size preference
    if (preferences.companySizePreference && job.company.size) {
      if (preferences.companySizePreference.includes(job.company.size)) {
        score += 15;
      } else {
        score -= 10;
      }
    }

    // Check industry preference
    if (preferences.preferredIndustries && job.company.industry) {
      const industryMatch = preferences.preferredIndustries.some(
        ind => job.company.industry?.toLowerCase().includes(ind.toLowerCase())
      );
      if (industryMatch) {
        score += 15;
      }
    }

    // Factor in company rating if available
    if (job.company.rating) {
      if (job.company.rating >= 4.0) {
        score += 10;
      } else if (job.company.rating < 3.0) {
        score -= 10;
      }
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate job quality score
   */
  private calculateQualityScore(job: UnifiedJob): number {
    let score = 50; // Base score

    // Check for comprehensive job description
    if (job.description.length > 500) {
      score += 10;
    }
    if (job.description.length > 1000) {
      score += 10;
    }

    // Check for salary information
    if (job.salary) {
      score += 15;
    }

    // Check for benefits information
    if (job.benefits) {
      score += 10;
    }

    // Check for clear application process
    if (job.application.instructions) {
      score += 5;
    }

    // Check for company information completeness
    if (job.company.website) {
      score += 5;
    }
    if (job.company.description) {
      score += 5;
    }

    // Penalize if missing crucial information
    if (job.requiredSkills.length === 0) {
      score -= 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate freshness score based on posting date
   */
  private calculateFreshnessScore(job: UnifiedJob): number {
    const now = new Date();
    const posted = new Date(job.postedAt);
    const daysOld = Math.floor((now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOld <= 1) {
      return 100; // Posted today or yesterday
    } else if (daysOld <= 3) {
      return 90; // Posted within 3 days
    } else if (daysOld <= 7) {
      return 80; // Posted within a week
    } else if (daysOld <= 14) {
      return 70; // Posted within 2 weeks
    } else if (daysOld <= 30) {
      return 50; // Posted within a month
    } else if (daysOld <= 60) {
      return 30; // Posted within 2 months
    } else {
      return 10; // Old posting
    }
  }

  /**
   * Calculate overall weighted score
   */
  private calculateOverallScore(
    components: JobScore['components'],
    weights: ScoringWeights
  ): number {
    let weightedSum = 0;
    let totalWeight = 0;

    // Calculate weighted sum
    for (const [component, score] of Object.entries(components)) {
      const weight = weights[component as keyof ScoringWeights];
      weightedSum += score * weight;
      totalWeight += weight;
    }

    // Normalize to 0-100 scale
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Generate human-readable explanation of the score
   */
  private generateExplanation(
    job: UnifiedJob,
    preferences: UserPreferences,
    components: JobScore['components']
  ): string[] {
    const explanations: string[] = [];

    // Explain title match
    if (components.titleMatch >= 80) {
      explanations.push('Excellent title match with your desired roles');
    } else if (components.titleMatch >= 60) {
      explanations.push('Good title alignment with your preferences');
    } else if (components.titleMatch < 40) {
      explanations.push('Title differs from your desired positions');
    }

    // Explain skills match
    if (components.skillsMatch >= 80) {
      explanations.push('Your skills strongly match the requirements');
    } else if (components.skillsMatch >= 60) {
      explanations.push('Good skill alignment with some gaps');
    } else if (components.skillsMatch < 40) {
      explanations.push('Significant skill gaps for this position');
    }

    // Explain experience match
    if (components.experienceMatch >= 90) {
      explanations.push('Perfect experience level match');
    } else if (components.experienceMatch < 50) {
      explanations.push('Experience level mismatch');
    }

    // Explain salary match
    if (components.salaryMatch >= 80 && job.salary) {
      explanations.push('Salary range meets your expectations');
    } else if (components.salaryMatch < 50 && job.salary) {
      explanations.push('Salary may not meet your requirements');
    }

    // Explain freshness
    if (components.freshnessScore >= 90) {
      explanations.push('Recently posted job (high response likelihood)');
    } else if (components.freshnessScore < 30) {
      explanations.push('Older posting (may have many applicants)');
    }

    return explanations;
  }

  /**
   * Find keywords that match between job and preferences
   */
  private findMatchedKeywords(job: UnifiedJob, preferences: UserPreferences): string[] {
    const matched: string[] = [];
    const jobText = `${job.title} ${job.description}`.toLowerCase();

    // Check required keywords
    if (preferences.requiredKeywords) {
      for (const keyword of preferences.requiredKeywords) {
        if (jobText.includes(keyword.toLowerCase())) {
          matched.push(keyword);
        }
      }
    }

    // Check skills
    for (const skill of preferences.skills) {
      if (jobText.includes(skill.toLowerCase())) {
        matched.push(skill);
      }
    }

    return [...new Set(matched)]; // Remove duplicates
  }

  /**
   * Identify missing required skills
   */
  private findMissingSkills(job: UnifiedJob, preferences: UserPreferences): string[] {
    const userSkills = new Set(
      preferences.skills.map(s => this.normalizeSkill(s))
    );
    
    const missing: string[] = [];

    for (const required of job.requiredSkills) {
      const normalized = this.normalizeSkill(required);
      if (!userSkills.has(normalized) && !this.hasRelatedSkill(normalized, userSkills)) {
        missing.push(required);
      }
    }

    return missing;
  }

  /**
   * Calculate bonuses and penalties
   */
  private calculateBonusesAndPenalties(
    job: UnifiedJob,
    preferences: UserPreferences
  ): { bonusReasons: string[]; penaltyReasons: string[] } {
    const bonusReasons: string[] = [];
    const penaltyReasons: string[] = [];

    // Check for exclude keywords
    if (preferences.excludeKeywords) {
      const jobText = `${job.title} ${job.description}`.toLowerCase();
      for (const exclude of preferences.excludeKeywords) {
        if (jobText.includes(exclude.toLowerCase())) {
          penaltyReasons.push(`Contains excluded keyword: ${exclude}`);
        }
      }
    }

    // Bonus for featured jobs
    if (job.isFeatured) {
      bonusReasons.push('Featured/promoted position');
    }

    // Bonus for easy apply
    if (job.application.easyApply) {
      bonusReasons.push('Easy application process');
    }

    // Bonus for comprehensive benefits
    if (job.benefits?.health && job.benefits?.retirement) {
      bonusReasons.push('Comprehensive benefits package');
    }

    // Penalty for high applicant count
    if (job.applicantCount && job.applicantCount > 100) {
      penaltyReasons.push('High competition (many applicants)');
    }

    return { bonusReasons, penaltyReasons };
  }

  // Helper methods

  /**
   * Tokenize and stem text for comparison
   */
  private tokenizeAndStem(text: string): string[] {
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text.toLowerCase());
    return tokens.map(token => natural.PorterStemmer.stem(token));
  }

  /**
   * Calculate token overlap between two token arrays
   */
  private calculateTokenOverlap(tokens1: string[], tokens2: string[]): number {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate semantic similarity between two strings
   */
  private calculateSemanticSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const distance = natural.LevenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength > 0 ? 1 - distance / maxLength : 0;
  }

  /**
   * Normalize skill name for comparison
   */
  private normalizeSkill(skill: string): string {
    return skill
      .toLowerCase()
      .replace(/\.js$/, '')
      .replace(/js$/, 'javascript')
      .replace(/^react$/, 'reactjs')
      .replace(/[^a-z0-9]/g, '');
  }

  /**
   * Check if user has related skill
   */
  private hasRelatedSkill(skill: string, userSkills: Set<string>): boolean {
    // Define skill relationships
    const relatedSkills: Record<string, string[]> = {
      'typescript': ['javascript'],
      'react': ['javascript', 'frontend'],
      'angular': ['javascript', 'typescript', 'frontend'],
      'vue': ['javascript', 'frontend'],
      'nodejs': ['javascript', 'backend'],
      'express': ['nodejs', 'javascript'],
      'mongodb': ['database', 'nosql'],
      'postgresql': ['database', 'sql'],
      'mysql': ['database', 'sql'],
    };

    // Check if user has any related skills
    const related = relatedSkills[skill] || [];
    return related.some(r => userSkills.has(this.normalizeSkill(r)));
  }
}