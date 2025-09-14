import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

interface JobAnalysis {
  // Core job information extracted from description
  title: string;
  company: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  requirements: string[];
  keywords: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  educationRequirements: string[];
  certifications: string[];
  // ATS optimization data
  atsKeywords: string[];
  industryTerms: string[];
  actionVerbs: string[];
  // Scoring weights for different sections
  weights: {
    skills: number;
    experience: number;
    education: number;
    keywords: number;
  };
}

@Injectable()
export class JobAnalyzerService {
  private readonly logger = new Logger(JobAnalyzerService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Analyze job description and extract key information
   */
  async analyzeJobDescription(jobDescription: string): Promise<JobAnalysis> {
    try {
      // Create prompt for job analysis
      const prompt = `Analyze this job description and extract structured information.

Job Description:
${jobDescription}

Return a JSON object with:
- title: job title
- company: company name
- requiredSkills: array of required technical and soft skills
- preferredSkills: array of nice-to-have skills
- responsibilities: key job responsibilities
- requirements: job requirements
- keywords: important keywords for ATS
- experienceLevel: entry/mid/senior/executive
- educationRequirements: education requirements
- certifications: required or preferred certifications
- atsKeywords: keywords critical for ATS systems
- industryTerms: industry-specific terminology
- actionVerbs: powerful action verbs used
- weights: scoring weights for skills/experience/education/keywords (total 100)`;

      // Call OpenAI API for analysis
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert ATS system and job description analyzer. Extract structured data from job descriptions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for consistent extraction
        max_tokens: 2000,
      });

      // Parse the response
      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      // Validate and normalize the analysis
      return this.normalizeJobAnalysis(analysis);
    } catch (error) {
      this.logger.error('Failed to analyze job description:', error);
      // Return a basic analysis if AI fails
      return this.extractBasicAnalysis(jobDescription);
    }
  }

  /**
   * Extract keywords from job description using NLP techniques
   */
  async extractKeywords(jobDescription: string): Promise<string[]> {
    try {
      // Use OpenAI to extract keywords
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Extract the 20 most important keywords and phrases from this job description for ATS optimization.',
          },
          {
            role: 'user',
            content: jobDescription,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      // Parse keywords from response
      const content = response.choices[0].message.content || '';
      const keywords = content
        .split(/[,\n]/)
        .map(k => k.trim())
        .filter(k => k.length > 2);

      return keywords;
    } catch (error) {
      this.logger.error('Failed to extract keywords:', error);
      // Fallback to regex-based extraction
      return this.extractKeywordsRegex(jobDescription);
    }
  }

  /**
   * Match job requirements with resume content
   */
  async matchRequirements(
    jobAnalysis: JobAnalysis,
    resumeContent: any
  ): Promise<{
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    recommendations: string[];
  }> {
    // Extract skills from resume
    const resumeSkills = this.extractResumeSkills(resumeContent);
    
    // Calculate matches
    const matchedSkills = jobAnalysis.requiredSkills.filter(skill =>
      resumeSkills.some(rSkill => 
        this.similarityCheck(skill.toLowerCase(), rSkill.toLowerCase())
      )
    );

    const missingSkills = jobAnalysis.requiredSkills.filter(skill =>
      !matchedSkills.includes(skill)
    );

    // Calculate match score (0-100)
    const requiredMatch = matchedSkills.length / Math.max(jobAnalysis.requiredSkills.length, 1);
    const preferredMatch = jobAnalysis.preferredSkills.filter(skill =>
      resumeSkills.some(rSkill => 
        this.similarityCheck(skill.toLowerCase(), rSkill.toLowerCase())
      )
    ).length / Math.max(jobAnalysis.preferredSkills.length, 1);

    const matchScore = Math.round(
      (requiredMatch * 70 + preferredMatch * 30)
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      matchedSkills,
      missingSkills,
      jobAnalysis
    );

    return {
      matchScore,
      matchedSkills,
      missingSkills,
      recommendations,
    };
  }

  /**
   * Normalize and validate job analysis data
   */
  private normalizeJobAnalysis(analysis: any): JobAnalysis {
    return {
      title: analysis.title || 'Unknown Position',
      company: analysis.company || 'Unknown Company',
      requiredSkills: Array.isArray(analysis.requiredSkills) 
        ? analysis.requiredSkills 
        : [],
      preferredSkills: Array.isArray(analysis.preferredSkills) 
        ? analysis.preferredSkills 
        : [],
      responsibilities: Array.isArray(analysis.responsibilities) 
        ? analysis.responsibilities 
        : [],
      requirements: Array.isArray(analysis.requirements) 
        ? analysis.requirements 
        : [],
      keywords: Array.isArray(analysis.keywords) 
        ? analysis.keywords 
        : [],
      experienceLevel: analysis.experienceLevel || 'mid',
      educationRequirements: Array.isArray(analysis.educationRequirements) 
        ? analysis.educationRequirements 
        : [],
      certifications: Array.isArray(analysis.certifications) 
        ? analysis.certifications 
        : [],
      atsKeywords: Array.isArray(analysis.atsKeywords) 
        ? analysis.atsKeywords 
        : [],
      industryTerms: Array.isArray(analysis.industryTerms) 
        ? analysis.industryTerms 
        : [],
      actionVerbs: Array.isArray(analysis.actionVerbs) 
        ? analysis.actionVerbs 
        : [],
      weights: {
        skills: analysis.weights?.skills || 40,
        experience: analysis.weights?.experience || 30,
        education: analysis.weights?.education || 15,
        keywords: analysis.weights?.keywords || 15,
      },
    };
  }

  /**
   * Basic analysis fallback when AI is unavailable
   */
  private extractBasicAnalysis(jobDescription: string): JobAnalysis {
    // Extract skills using regex patterns
    const skillPatterns = [
      /\b(JavaScript|TypeScript|Python|Java|C\+\+|React|Angular|Vue|Node\.js|Django|Spring)\b/gi,
      /\b(AWS|Azure|GCP|Docker|Kubernetes|CI\/CD|DevOps)\b/gi,
      /\b(SQL|NoSQL|MongoDB|PostgreSQL|MySQL|Redis)\b/gi,
    ];

    const skills: string[] = [];
    skillPatterns.forEach(pattern => {
      const matches = jobDescription.match(pattern);
      if (matches) {
        skills.push(...matches);
      }
    });

    // Extract experience level
    let experienceLevel: 'entry' | 'mid' | 'senior' | 'executive' = 'mid';
    if (/senior|lead|principal|staff/i.test(jobDescription)) {
      experienceLevel = 'senior';
    } else if (/junior|entry|graduate|intern/i.test(jobDescription)) {
      experienceLevel = 'entry';
    } else if (/executive|director|vp|president/i.test(jobDescription)) {
      experienceLevel = 'executive';
    }

    return {
      title: 'Position',
      company: 'Company',
      requiredSkills: [...new Set(skills)],
      preferredSkills: [],
      responsibilities: [],
      requirements: [],
      keywords: [...new Set(skills)],
      experienceLevel,
      educationRequirements: [],
      certifications: [],
      atsKeywords: [...new Set(skills)],
      industryTerms: [],
      actionVerbs: ['managed', 'developed', 'implemented', 'designed', 'led'],
      weights: {
        skills: 40,
        experience: 30,
        education: 15,
        keywords: 15,
      },
    };
  }

  /**
   * Extract keywords using regex patterns
   */
  private extractKeywordsRegex(text: string): string[] {
    // Common technical keywords
    const keywords = new Set<string>();
    
    // Programming languages
    const languages = text.match(/\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|Ruby|Go|Rust|PHP|Swift|Kotlin)\b/gi);
    if (languages) languages.forEach(l => keywords.add(l));
    
    // Frameworks
    const frameworks = text.match(/\b(React|Angular|Vue|Express|Django|Flask|Spring|Laravel|Rails)\b/gi);
    if (frameworks) frameworks.forEach(f => keywords.add(f));
    
    // Databases
    const databases = text.match(/\b(SQL|NoSQL|MongoDB|PostgreSQL|MySQL|Redis|Elasticsearch)\b/gi);
    if (databases) databases.forEach(d => keywords.add(d));
    
    // Cloud and DevOps
    const cloud = text.match(/\b(AWS|Azure|GCP|Docker|Kubernetes|Jenkins|GitLab|CI\/CD)\b/gi);
    if (cloud) cloud.forEach(c => keywords.add(c));
    
    return Array.from(keywords);
  }

  /**
   * Extract skills from resume content
   */
  private extractResumeSkills(resumeContent: any): string[] {
    const skills: string[] = [];
    
    // Extract from skills section
    if (resumeContent.skills) {
      skills.push(...resumeContent.skills);
    }
    
    // Extract from experience descriptions
    if (resumeContent.experience) {
      resumeContent.experience.forEach((exp: any) => {
        if (exp.description) {
          const extractedSkills = this.extractKeywordsRegex(exp.description);
          skills.push(...extractedSkills);
        }
      });
    }
    
    // Extract from projects
    if (resumeContent.projects) {
      resumeContent.projects.forEach((project: any) => {
        if (project.technologies) {
          skills.push(...project.technologies);
        }
      });
    }
    
    return [...new Set(skills)];
  }

  /**
   * Check similarity between two strings
   */
  private similarityCheck(str1: string, str2: string): boolean {
    // Direct match
    if (str1 === str2) return true;
    
    // Contains check
    if (str1.includes(str2) || str2.includes(str1)) return true;
    
    // Common abbreviations
    const abbreviations: Record<string, string[]> = {
      'javascript': ['js', 'javascript', 'ecmascript'],
      'typescript': ['ts', 'typescript'],
      'kubernetes': ['k8s', 'kubernetes'],
      'continuous integration': ['ci', 'continuous integration'],
      'continuous deployment': ['cd', 'continuous deployment'],
    };
    
    for (const [key, values] of Object.entries(abbreviations)) {
      if (values.includes(str1) && values.includes(str2)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate recommendations for resume improvement
   */
  private generateRecommendations(
    matchedSkills: string[],
    missingSkills: string[],
    jobAnalysis: JobAnalysis
  ): string[] {
    const recommendations: string[] = [];
    
    // Missing skills recommendations with comments for each line
    if (missingSkills.length > 0) {
      recommendations.push(
        `Add these missing required skills if you have them: ${missingSkills.slice(0, 5).join(', ')}`
      );
    }
    
    // Keyword optimization with comments for each line
    if (jobAnalysis.atsKeywords.length > 0) {
      recommendations.push(
        `Include these ATS keywords throughout your resume: ${jobAnalysis.atsKeywords.slice(0, 5).join(', ')}`
      );
    }
    
    // Action verbs with comments for each line
    if (jobAnalysis.actionVerbs.length > 0) {
      recommendations.push(
        `Use these action verbs in your experience descriptions: ${jobAnalysis.actionVerbs.slice(0, 5).join(', ')}`
      );
    }
    
    // Experience level alignment with comments for each line
    recommendations.push(
      `Align your experience descriptions with ${jobAnalysis.experienceLevel}-level responsibilities`
    );
    
    return recommendations;
  }
}