import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { JobAnalyzerService } from './job-analyzer.service';
import { PrismaService } from '../../prisma/prisma.service';

interface TailoringResult {
  // Tailored resume sections
  tailoredResume: {
    summary?: string;
    experience: Array<{
      title: string;
      company: string;
      duration: string;
      bullets: string[];
      relevanceScore: number;
    }>;
    skills: string[];
    education: any[];
    projects?: any[];
    certifications?: any[];
  };
  // Optimization metrics
  optimizations: {
    keywordsAdded: string[];
    bulletPointsReordered: number;
    skillsHighlighted: string[];
    sectionsReordered: string[];
  };
  // ATS score
  atsScore: {
    before: number;
    after: number;
    improvement: number;
  };
  // Suggestions for manual improvement
  suggestions: string[];
  // Confidence in tailoring
  confidence: number;
}

@Injectable()
export class ResumeTailoringService {
  private readonly logger = new Logger(ResumeTailoringService.name);
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private jobAnalyzer: JobAnalyzerService,
    private prisma: PrismaService
  ) {
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Tailor resume for a specific job
   */
  async tailorResume(
    resumeId: string,
    jobDescription: string,
    userId: string
  ): Promise<TailoringResult> {
    try {
      // Fetch the resume
      const resume = await this.prisma.resume.findFirst({
        where: { id: resumeId, userId },
      });

      if (!resume) {
        throw new Error('Resume not found');
      }

      // Analyze the job description
      const jobAnalysis = await this.jobAnalyzer.analyzeJobDescription(jobDescription);

      // Parse resume content
      const resumeContent = JSON.parse(resume.content as string);

      // Calculate initial ATS score
      const initialScore = this.calculateATSScore(resumeContent, jobAnalysis);

      // Tailor each section
      const tailoredSummary = await this.tailorSummary(resumeContent.summary, jobAnalysis);
      const tailoredExperience = await this.tailorExperience(resumeContent.experience, jobAnalysis);
      const tailoredSkills = await this.tailorSkills(resumeContent.skills, jobAnalysis);
      const reorderedSections = this.reorderSections(resumeContent, jobAnalysis);

      // Create tailored resume object
      const tailoredResume = {
        summary: tailoredSummary.content,
        experience: tailoredExperience.experiences,
        skills: tailoredSkills.skills,
        education: resumeContent.education || [],
        projects: resumeContent.projects || [],
        certifications: resumeContent.certifications || [],
      };

      // Calculate final ATS score
      const finalScore = this.calculateATSScore(tailoredResume, jobAnalysis);

      // Compile optimizations
      const optimizations = {
        keywordsAdded: [
          ...tailoredSummary.keywordsAdded,
          ...tailoredExperience.keywordsAdded,
        ],
        bulletPointsReordered: tailoredExperience.reorderedCount,
        skillsHighlighted: tailoredSkills.highlighted,
        sectionsReordered: reorderedSections,
      };

      // Generate suggestions
      const suggestions = await this.generateSuggestions(
        tailoredResume,
        jobAnalysis
      );

      // Save tailored version
      await this.saveTailoredVersion(
        resumeId,
        tailoredResume,
        jobAnalysis,
        userId
      );

      return {
        tailoredResume,
        optimizations,
        atsScore: {
          before: initialScore,
          after: finalScore,
          improvement: finalScore - initialScore,
        },
        suggestions,
        confidence: this.calculateConfidence(initialScore, finalScore),
      };
    } catch (error) {
      this.logger.error('Failed to tailor resume:', error);
      throw error;
    }
  }

  /**
   * Tailor resume summary/objective
   */
  private async tailorSummary(
    originalSummary: string,
    jobAnalysis: any
  ): Promise<{ content: string; keywordsAdded: string[] }> {
    if (!originalSummary) {
      // Generate a summary if none exists
      return this.generateSummary(jobAnalysis);
    }

    const prompt = `Optimize this professional summary for the following job:

Original Summary: ${originalSummary}

Target Job: ${jobAnalysis.title} at ${jobAnalysis.company}
Required Skills: ${jobAnalysis.requiredSkills.join(', ')}
Key Responsibilities: ${jobAnalysis.responsibilities.slice(0, 3).join(', ')}

Rules:
1. Keep it under 4 lines
2. Include relevant keywords naturally
3. Highlight matching experience
4. Maintain truthfulness - only reorganize/emphasize existing content
5. Start with a strong professional identity
6. Include quantifiable achievements if possible

Return JSON with:
- content: optimized summary
- keywordsAdded: array of keywords incorporated`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a professional resume writer specializing in ATS optimization.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      content: result.content || originalSummary,
      keywordsAdded: result.keywordsAdded || [],
    };
  }

  /**
   * Tailor experience section with bullet point reordering
   */
  private async tailorExperience(
    experiences: any[],
    jobAnalysis: any
  ): Promise<{ experiences: any[]; keywordsAdded: string[]; reorderedCount: number }> {
    const tailoredExperiences = [];
    const allKeywordsAdded: string[] = [];
    let reorderedCount = 0;

    for (const exp of experiences) {
      // Score each bullet point for relevance
      const scoredBullets = await this.scoreBulletPoints(exp.bullets || [], jobAnalysis);
      
      // Reorder by relevance (highest first)
      const reorderedBullets = scoredBullets
        .sort((a, b) => b.score - a.score)
        .map(b => b.content);

      if (JSON.stringify(exp.bullets) !== JSON.stringify(reorderedBullets)) {
        reorderedCount++;
      }

      // Optimize top bullets with keywords
      const optimizedBullets = await this.optimizeBullets(
        reorderedBullets.slice(0, 3),
        jobAnalysis
      );

      // Combine optimized and remaining bullets
      const finalBullets = [
        ...optimizedBullets.bullets,
        ...reorderedBullets.slice(3),
      ];

      allKeywordsAdded.push(...optimizedBullets.keywordsAdded);

      tailoredExperiences.push({
        ...exp,
        bullets: finalBullets,
        relevanceScore: this.calculateExperienceRelevance(exp, jobAnalysis),
      });
    }

    // Sort experiences by relevance
    tailoredExperiences.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      experiences: tailoredExperiences,
      keywordsAdded: allKeywordsAdded,
      reorderedCount,
    };
  }

  /**
   * Score bullet points for relevance to job
   */
  private async scoreBulletPoints(
    bullets: string[],
    jobAnalysis: any
  ): Promise<Array<{ content: string; score: number }>> {
    return bullets.map(bullet => {
      let score = 0;

      // Check for required skills
      jobAnalysis.requiredSkills.forEach((skill: string) => {
        if (bullet.toLowerCase().includes(skill.toLowerCase())) {
          score += 3; // High weight for required skills
        }
      });

      // Check for preferred skills
      jobAnalysis.preferredSkills.forEach((skill: string) => {
        if (bullet.toLowerCase().includes(skill.toLowerCase())) {
          score += 2; // Medium weight for preferred skills
        }
      });

      // Check for keywords
      jobAnalysis.keywords.forEach((keyword: string) => {
        if (bullet.toLowerCase().includes(keyword.toLowerCase())) {
          score += 1; // Lower weight for general keywords
        }
      });

      // Check for action verbs
      jobAnalysis.actionVerbs.forEach((verb: string) => {
        if (bullet.toLowerCase().startsWith(verb.toLowerCase())) {
          score += 1; // Bonus for strong action verbs
        }
      });

      // Check for quantifiable results (numbers, percentages)
      if (/\d+%|\$\d+|\d+x|\d+ (users|customers|projects|team|people)/i.test(bullet)) {
        score += 2; // Bonus for quantifiable achievements
      }

      return { content: bullet, score };
    });
  }

  /**
   * Optimize bullet points with keywords
   */
  private async optimizeBullets(
    bullets: string[],
    jobAnalysis: any
  ): Promise<{ bullets: string[]; keywordsAdded: string[] }> {
    const optimizedBullets: string[] = [];
    const keywordsAdded: string[] = [];

    for (const bullet of bullets) {
      // Find missing keywords that could be added
      const missingKeywords = jobAnalysis.atsKeywords.filter(
        (keyword: string) => !bullet.toLowerCase().includes(keyword.toLowerCase())
      );

      if (missingKeywords.length > 0) {
        // Try to naturally incorporate 1-2 keywords
        const keywordsToAdd = missingKeywords.slice(0, 2);
        const optimized = await this.incorporateKeywords(bullet, keywordsToAdd);
        
        if (optimized !== bullet) {
          optimizedBullets.push(optimized);
          keywordsAdded.push(...keywordsToAdd);
        } else {
          optimizedBullets.push(bullet);
        }
      } else {
        optimizedBullets.push(bullet);
      }
    }

    return { bullets: optimizedBullets, keywordsAdded };
  }

  /**
   * Incorporate keywords naturally into text
   */
  private async incorporateKeywords(text: string, keywords: string[]): Promise<string> {
    // For now, simple implementation - can be enhanced with AI
    let optimized = text;
    
    // Try to add keywords contextually
    keywords.forEach(keyword => {
      // Check if keyword fits naturally
      if (text.includes('technologies') && !text.includes(keyword)) {
        optimized = optimized.replace('technologies', `technologies including ${keyword}`);
      } else if (text.includes('skills') && !text.includes(keyword)) {
        optimized = optimized.replace('skills', `skills in ${keyword}`);
      }
    });

    return optimized;
  }

  /**
   * Tailor skills section
   */
  private async tailorSkills(
    originalSkills: string[],
    jobAnalysis: any
  ): Promise<{ skills: string[]; highlighted: string[] }> {
    const highlighted: string[] = [];
    const skillsSet = new Set(originalSkills);

    // Add missing required skills that user might have forgotten
    jobAnalysis.requiredSkills.forEach((skill: string) => {
      // Only suggest adding if it's a common variation
      const variations = this.getSkillVariations(skill);
      const hasVariation = variations.some(v => 
        originalSkills.some(s => s.toLowerCase().includes(v.toLowerCase()))
      );

      if (hasVariation && !skillsSet.has(skill)) {
        skillsSet.add(skill);
        highlighted.push(skill);
      }
    });

    // Reorder skills - most relevant first
    const orderedSkills = Array.from(skillsSet).sort((a, b) => {
      const aRelevance = this.getSkillRelevance(a, jobAnalysis);
      const bRelevance = this.getSkillRelevance(b, jobAnalysis);
      return bRelevance - aRelevance;
    });

    return {
      skills: orderedSkills,
      highlighted,
    };
  }

  /**
   * Get skill variations and synonyms
   */
  private getSkillVariations(skill: string): string[] {
    const variations: Record<string, string[]> = {
      'JavaScript': ['JS', 'JavaScript', 'ECMAScript', 'ES6'],
      'TypeScript': ['TS', 'TypeScript'],
      'React': ['React', 'ReactJS', 'React.js'],
      'Node.js': ['Node', 'NodeJS', 'Node.js'],
      'Python': ['Python', 'Py'],
      'Machine Learning': ['ML', 'Machine Learning', 'AI'],
      'Continuous Integration': ['CI', 'Continuous Integration'],
      'Continuous Deployment': ['CD', 'Continuous Deployment'],
    };

    return variations[skill] || [skill];
  }

  /**
   * Calculate skill relevance to job
   */
  private getSkillRelevance(skill: string, jobAnalysis: any): number {
    // Required skill = highest relevance
    if (jobAnalysis.requiredSkills.includes(skill)) return 10;
    
    // Preferred skill = high relevance
    if (jobAnalysis.preferredSkills.includes(skill)) return 7;
    
    // Keyword match = medium relevance
    if (jobAnalysis.keywords.includes(skill)) return 5;
    
    // ATS keyword = medium relevance
    if (jobAnalysis.atsKeywords.includes(skill)) return 4;
    
    // Default = low relevance
    return 1;
  }

  /**
   * Reorder resume sections based on job requirements
   */
  private reorderSections(resumeContent: any, jobAnalysis: any): string[] {
    const sections = ['summary', 'experience', 'skills', 'education', 'projects', 'certifications'];
    const reordered: string[] = [];

    // Always start with summary
    reordered.push('summary');

    // Prioritize based on job emphasis
    if (jobAnalysis.weights.experience > jobAnalysis.weights.skills) {
      reordered.push('experience', 'skills');
    } else {
      reordered.push('skills', 'experience');
    }

    // Education priority for entry-level
    if (jobAnalysis.experienceLevel === 'entry') {
      reordered.push('education', 'projects');
    } else {
      reordered.push('projects', 'education');
    }

    // Certifications if relevant
    if (jobAnalysis.certifications.length > 0) {
      reordered.push('certifications');
    }

    return reordered;
  }

  /**
   * Calculate ATS score for resume
   */
  private calculateATSScore(resumeContent: any, jobAnalysis: any): number {
    let score = 0;
    const maxScore = 100;

    // Skills match (40 points max)
    const skillsScore = this.calculateSkillsScore(resumeContent.skills || [], jobAnalysis);
    score += skillsScore * 0.4;

    // Keywords presence (30 points max)
    const keywordsScore = this.calculateKeywordsScore(resumeContent, jobAnalysis);
    score += keywordsScore * 0.3;

    // Experience relevance (20 points max)
    const experienceScore = this.calculateExperienceScore(resumeContent.experience || [], jobAnalysis);
    score += experienceScore * 0.2;

    // Format and structure (10 points max)
    const formatScore = this.calculateFormatScore(resumeContent);
    score += formatScore * 0.1;

    return Math.round(Math.min(score, maxScore));
  }

  /**
   * Calculate skills match score
   */
  private calculateSkillsScore(skills: string[], jobAnalysis: any): number {
    const requiredMatches = jobAnalysis.requiredSkills.filter((required: string) =>
      skills.some(skill => skill.toLowerCase().includes(required.toLowerCase()))
    ).length;

    const preferredMatches = jobAnalysis.preferredSkills.filter((preferred: string) =>
      skills.some(skill => skill.toLowerCase().includes(preferred.toLowerCase()))
    ).length;

    const requiredScore = (requiredMatches / Math.max(jobAnalysis.requiredSkills.length, 1)) * 70;
    const preferredScore = (preferredMatches / Math.max(jobAnalysis.preferredSkills.length, 1)) * 30;

    return requiredScore + preferredScore;
  }

  /**
   * Calculate keywords presence score
   */
  private calculateKeywordsScore(resumeContent: any, jobAnalysis: any): number {
    const fullText = JSON.stringify(resumeContent).toLowerCase();
    const keywordMatches = jobAnalysis.keywords.filter((keyword: string) =>
      fullText.includes(keyword.toLowerCase())
    ).length;

    return (keywordMatches / Math.max(jobAnalysis.keywords.length, 1)) * 100;
  }

  /**
   * Calculate experience relevance score
   */
  private calculateExperienceScore(experiences: any[], jobAnalysis: any): number {
    if (experiences.length === 0) return 0;

    const scores = experiences.map(exp => 
      this.calculateExperienceRelevance(exp, jobAnalysis)
    );

    return Math.max(...scores);
  }

  /**
   * Calculate single experience relevance
   */
  private calculateExperienceRelevance(experience: any, jobAnalysis: any): number {
    let score = 0;

    // Title similarity
    if (experience.title && jobAnalysis.title) {
      const titleWords = jobAnalysis.title.toLowerCase().split(' ');
      const expWords = experience.title.toLowerCase().split(' ');
      const matches = titleWords.filter((word: string) => expWords.includes(word)).length;
      score += (matches / titleWords.length) * 30;
    }

    // Industry/domain match
    if (experience.industry === jobAnalysis.industry) {
      score += 20;
    }

    // Skills used in experience
    const bullets = experience.bullets?.join(' ').toLowerCase() || '';
    const skillMatches = jobAnalysis.requiredSkills.filter((skill: string) =>
      bullets.includes(skill.toLowerCase())
    ).length;
    score += (skillMatches / Math.max(jobAnalysis.requiredSkills.length, 1)) * 50;

    return score;
  }

  /**
   * Calculate format score
   */
  private calculateFormatScore(resumeContent: any): number {
    let score = 100;

    // Deduct points for formatting issues
    if (!resumeContent.summary) score -= 10;
    if (!resumeContent.skills || resumeContent.skills.length === 0) score -= 20;
    if (!resumeContent.experience || resumeContent.experience.length === 0) score -= 30;
    
    // Check for good practices
    const hasQuantifiableResults = JSON.stringify(resumeContent).match(/\d+%|\$\d+/g);
    if (!hasQuantifiableResults) score -= 10;

    // Check for action verbs
    const hasActionVerbs = /^(led|managed|developed|created|implemented|designed)/im.test(
      JSON.stringify(resumeContent.experience)
    );
    if (!hasActionVerbs) score -= 10;

    return Math.max(score, 0);
  }

  /**
   * Generate summary if none exists
   */
  private async generateSummary(jobAnalysis: any): Promise<{ content: string; keywordsAdded: string[] }> {
    const prompt = `Generate a professional summary for a ${jobAnalysis.title} position.
Include: ${jobAnalysis.experienceLevel} level, key skills: ${jobAnalysis.requiredSkills.slice(0, 5).join(', ')}
Keep it under 3 lines and ATS-optimized.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Generate a concise professional summary.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return {
      content: response.choices[0].message.content || '',
      keywordsAdded: jobAnalysis.requiredSkills.slice(0, 3),
    };
  }

  /**
   * Generate improvement suggestions
   */
  private async generateSuggestions(
    tailoredResume: any,
    jobAnalysis: any
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Check for missing sections
    if (!tailoredResume.summary) {
      suggestions.push('Add a professional summary to introduce yourself');
    }

    // Check for quantifiable achievements
    const hasMetrics = JSON.stringify(tailoredResume).match(/\d+%|\$\d+|\d+x/g);
    if (!hasMetrics || hasMetrics.length < 3) {
      suggestions.push('Add more quantifiable achievements (percentages, dollar amounts, metrics)');
    }

    // Check for certifications
    if (jobAnalysis.certifications.length > 0 && (!tailoredResume.certifications || tailoredResume.certifications.length === 0)) {
      suggestions.push(`Consider adding relevant certifications: ${jobAnalysis.certifications.join(', ')}`);
    }

    // Check experience level alignment
    if (jobAnalysis.experienceLevel === 'senior' && tailoredResume.experience.length < 3) {
      suggestions.push('Consider adding more relevant experience for senior-level position');
    }

    // Check for missing required skills
    const missingSkills = jobAnalysis.requiredSkills.filter((skill: string) =>
      !tailoredResume.skills.some((s: string) => s.toLowerCase().includes(skill.toLowerCase()))
    );
    if (missingSkills.length > 0) {
      suggestions.push(`Add these required skills if you have them: ${missingSkills.slice(0, 3).join(', ')}`);
    }

    return suggestions;
  }

  /**
   * Calculate confidence in tailoring quality
   */
  private calculateConfidence(beforeScore: number, afterScore: number): number {
    const improvement = afterScore - beforeScore;
    
    // Higher improvement = higher confidence
    if (improvement > 20) return 95;
    if (improvement > 15) return 85;
    if (improvement > 10) return 75;
    if (improvement > 5) return 65;
    
    // If already high score, high confidence
    if (afterScore > 85) return 90;
    if (afterScore > 70) return 75;
    
    return 60;
  }

  /**
   * Save tailored version to database
   */
  private async saveTailoredVersion(
    originalResumeId: string,
    tailoredContent: any,
    jobAnalysis: any,
    userId: string
  ): Promise<void> {
    await this.prisma.resumeTailoring.create({
      data: {
        resumeId: originalResumeId,
        jobTitle: jobAnalysis.title,
        jobCompany: jobAnalysis.company,
        jobDescription: JSON.stringify(jobAnalysis),
        tailoredContent: JSON.stringify(tailoredContent),
        atsScore: this.calculateATSScore(tailoredContent, jobAnalysis),
        appliedAt: null, // Will be set when actually applied
      },
    });
  }
}