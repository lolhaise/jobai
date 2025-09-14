import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { PrismaService } from '../../prisma/prisma.service';
import { JobAnalyzerService } from './job-analyzer.service';
import { ResumeTailoringService } from './resume-tailoring.service';

// Cover letter tone options
export enum CoverLetterTone {
  PROFESSIONAL = 'professional',
  ENTHUSIASTIC = 'enthusiastic',
  CONFIDENT = 'confident',
  CONVERSATIONAL = 'conversational',
  FORMAL = 'formal'
}

// Cover letter length options  
export enum CoverLetterLength {
  SHORT = 'short',      // ~200 words
  MEDIUM = 'medium',    // ~350 words
  LONG = 'long'         // ~500 words
}

// Cover letter template structure
interface CoverLetterTemplate {
  id: string;
  name: string;
  description: string;
  structure: {
    opening: string;
    body: string[];
    closing: string;
  };
  tone: CoverLetterTone;
  industry?: string;
}

// Company research data
interface CompanyResearch {
  name: string;
  industry?: string;
  mission?: string;
  values?: string[];
  recentNews?: string[];
  culture?: string;
  products?: string[];
  competitors?: string[];
}

// Cover letter generation options
interface GenerationOptions {
  tone: CoverLetterTone;
  length: CoverLetterLength;
  template?: string;
  emphasizeSkills?: string[];
  includeAchievements?: boolean;
  companyResearch?: CompanyResearch;
}

@Injectable()
export class CoverLetterService {
  private openai: OpenAI;
  
  // Pre-built templates for different scenarios
  private templates: CoverLetterTemplate[] = [
    {
      id: 'standard',
      name: 'Standard Professional',
      description: 'Classic cover letter format suitable for most positions',
      structure: {
        opening: 'Express interest in position and how you learned about it',
        body: [
          'Highlight relevant experience and achievements',
          'Demonstrate knowledge of company and alignment with values',
          'Show enthusiasm and cultural fit'
        ],
        closing: 'Reiterate interest and next steps'
      },
      tone: CoverLetterTone.PROFESSIONAL,
    },
    {
      id: 'career-change',
      name: 'Career Change',
      description: 'For transitioning to a new field or industry',
      structure: {
        opening: 'Explain motivation for career change',
        body: [
          'Highlight transferable skills',
          'Show passion and commitment to new field',
          'Demonstrate relevant learning and preparation'
        ],
        closing: 'Express enthusiasm for new opportunity'
      },
      tone: CoverLetterTone.ENTHUSIASTIC,
    },
    {
      id: 'technical',
      name: 'Technical Position',
      description: 'For engineering and technical roles',
      structure: {
        opening: 'Lead with technical expertise',
        body: [
          'Showcase specific technical projects and achievements',
          'Demonstrate problem-solving abilities',
          'Highlight collaboration and communication skills'
        ],
        closing: 'Express interest in technical challenges'
      },
      tone: CoverLetterTone.CONFIDENT,
      industry: 'technology'
    },
    {
      id: 'leadership',
      name: 'Leadership Role',
      description: 'For management and leadership positions',
      structure: {
        opening: 'Establish leadership credentials',
        body: [
          'Showcase team management experience',
          'Highlight strategic thinking and results',
          'Demonstrate vision and cultural alignment'
        ],
        closing: 'Express readiness to lead and drive results'
      },
      tone: CoverLetterTone.CONFIDENT,
    },
    {
      id: 'entry-level',
      name: 'Entry Level',
      description: 'For recent graduates and first-time job seekers',
      structure: {
        opening: 'Express enthusiasm and eagerness to learn',
        body: [
          'Highlight academic achievements and projects',
          'Showcase internships and relevant coursework',
          'Demonstrate soft skills and potential'
        ],
        closing: 'Express commitment to growth and contribution'
      },
      tone: CoverLetterTone.ENTHUSIASTIC,
    }
  ];

  constructor(
    private prisma: PrismaService,
    private jobAnalyzer: JobAnalyzerService,
    private resumeTailoring: ResumeTailoringService
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Generate a tailored cover letter
  async generateCoverLetter(
    resumeId: string,
    jobId: string,
    userId: string,
    options: GenerationOptions
  ) {
    try {
      // Fetch resume and job data
      const [resume, job] = await Promise.all([
        this.prisma.resume.findUnique({
          where: { id: resumeId, userId },
          include: { tailoredVersions: true }
        }),
        this.prisma.job.findUnique({ where: { id: jobId } })
      ]);

      if (!resume || !job) {
        throw new Error('Resume or job not found');
      }

      // Analyze job description
      const jobAnalysis = await this.jobAnalyzer.analyzeJobDescription(
        job.description || ''
      );

      // Get or select template
      const template = this.getTemplate(options.template);

      // Research company if needed
      const companyInfo = options.companyResearch || 
        await this.researchCompany(job.company);

      // Generate cover letter content
      const coverLetter = await this.generateContent(
        resume.content as any,
        job,
        jobAnalysis,
        template,
        options,
        companyInfo
      );

      // Calculate quality score
      const qualityScore = this.calculateQualityScore(
        coverLetter,
        jobAnalysis,
        options
      );

      // Save to database
      const saved = await this.saveCoverLetter(
        userId,
        resumeId,
        jobId,
        coverLetter,
        options,
        qualityScore
      );

      return {
        id: saved.id,
        content: coverLetter,
        qualityScore,
        template: template.name,
        tone: options.tone,
        length: this.getWordCount(coverLetter),
        suggestions: await this.generateSuggestions(coverLetter, jobAnalysis)
      };
    } catch (error) {
      console.error('Cover letter generation error:', error);
      throw error;
    }
  }

  // Generate the actual cover letter content
  private async generateContent(
    resume: any,
    job: any,
    jobAnalysis: any,
    template: CoverLetterTemplate,
    options: GenerationOptions,
    companyInfo: CompanyResearch
  ): Promise<string> {
    const prompt = this.buildPrompt(
      resume,
      job,
      jobAnalysis,
      template,
      options,
      companyInfo
    );

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert cover letter writer. Create compelling, 
                   personalized cover letters that get interviews. Never fabricate 
                   information. Use only provided resume content.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    return response.choices[0].message.content || '';
  }

  // Build AI prompt for cover letter generation
  private buildPrompt(
    resume: any,
    job: any,
    jobAnalysis: any,
    template: CoverLetterTemplate,
    options: GenerationOptions,
    companyInfo: CompanyResearch
  ): string {
    const wordTarget = this.getWordTarget(options.length);
    
    return `Create a ${options.tone} cover letter for this position:

JOB DETAILS:
- Company: ${job.company}
- Position: ${job.title}
- Key Requirements: ${jobAnalysis.requirements.join(', ')}
- Required Skills: ${jobAnalysis.skills.hard.join(', ')}

RESUME SUMMARY:
- Name: ${resume.personalInfo?.name || 'Candidate'}
- Experience: ${this.summarizeExperience(resume.experience)}
- Key Skills: ${resume.skills?.join(', ')}
- Notable Achievements: ${this.extractAchievements(resume)}

COMPANY RESEARCH:
- Industry: ${companyInfo.industry || 'Not specified'}
- Mission: ${companyInfo.mission || 'Not available'}
- Values: ${companyInfo.values?.join(', ') || 'Not available'}
- Recent News: ${companyInfo.recentNews?.[0] || 'None'}

TEMPLATE STRUCTURE:
- Opening: ${template.structure.opening}
- Body Paragraphs: ${template.structure.body.join('; ')}
- Closing: ${template.structure.closing}

REQUIREMENTS:
- Tone: ${options.tone}
- Length: Approximately ${wordTarget} words
- Emphasize: ${options.emphasizeSkills?.join(', ') || 'Most relevant skills'}
- Include quantified achievements: ${options.includeAchievements ? 'Yes' : 'No'}
- Avoid generic statements and clichés
- Be specific and use concrete examples
- Show knowledge of company without being presumptuous
- End with clear next steps

Generate a compelling cover letter that stands out.`;
  }

  // Research company information
  private async researchCompany(companyName: string): Promise<CompanyResearch> {
    try {
      const prompt = `Research ${companyName} and provide:
        1. Industry and sector
        2. Company mission statement
        3. Core values (list up to 5)
        4. Recent news or developments (last 3 months)
        5. Company culture description
        6. Main products or services
        7. Key competitors
        
        Format as JSON.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a company research analyst. Provide accurate, current information.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.choices[0].message.content || '{}';
      return JSON.parse(content);
    } catch (error) {
      console.error('Company research error:', error);
      // Return basic info if research fails
      return {
        name: companyName,
        industry: 'Technology', // Default assumption
      };
    }
  }

  // Adjust tone of existing cover letter
  async adjustTone(
    coverLetterId: string,
    newTone: CoverLetterTone,
    userId: string
  ) {
    const coverLetter = await this.prisma.coverLetter.findUnique({
      where: { id: coverLetterId, userId }
    });

    if (!coverLetter) {
      throw new Error('Cover letter not found');
    }

    const prompt = `Adjust the tone of this cover letter to be more ${newTone}:

${coverLetter.content}

Maintain all facts and information, only adjust the tone and style.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at adjusting writing tone while preserving content.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 1500
    });

    const adjusted = response.choices[0].message.content || '';
    
    // Save new version
    return this.prisma.coverLetter.create({
      data: {
        ...coverLetter,
        id: undefined,
        content: adjusted,
        metadata: {
          ...coverLetter.metadata as any,
          tone: newTone,
          adjustedFrom: coverLetterId
        }
      }
    });
  }

  // Optimize length of cover letter
  async optimizeLength(
    coverLetterId: string,
    targetLength: CoverLetterLength,
    userId: string
  ) {
    const coverLetter = await this.prisma.coverLetter.findUnique({
      where: { id: coverLetterId, userId }
    });

    if (!coverLetter) {
      throw new Error('Cover letter not found');
    }

    const currentWords = this.getWordCount(coverLetter.content);
    const targetWords = this.getWordTarget(targetLength);
    
    const action = currentWords > targetWords ? 'shorten' : 'expand';
    
    const prompt = `${action} this cover letter to approximately ${targetWords} words:

${coverLetter.content}

${action === 'shorten' 
  ? 'Remove redundancy and less important details while keeping key points.' 
  : 'Add more specific examples and details to strengthen the message.'}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at optimizing cover letter length without losing impact.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 1500
    });

    return response.choices[0].message.content || '';
  }

  // Generate improvement suggestions
  private async generateSuggestions(
    coverLetter: string,
    jobAnalysis: any
  ): Promise<string[]> {
    const prompt = `Analyze this cover letter and provide 3-5 specific suggestions for improvement:

${coverLetter}

Job Requirements: ${jobAnalysis.requirements.join(', ')}

Focus on:
1. Stronger opening hooks
2. Better keyword incorporation
3. More specific achievements
4. Clearer value proposition
5. Stronger closing

Provide actionable suggestions as a JSON array.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a cover letter optimization expert.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 500
    });

    try {
      return JSON.parse(response.choices[0].message.content || '[]');
    } catch {
      return ['Consider adding more specific examples', 'Strengthen the opening paragraph'];
    }
  }

  // Calculate quality score for cover letter
  private calculateQualityScore(
    content: string,
    jobAnalysis: any,
    options: GenerationOptions
  ): number {
    let score = 0;
    const weights = {
      length: 15,
      keywords: 25,
      structure: 20,
      personalization: 20,
      readability: 20
    };

    // Check length appropriateness
    const wordCount = this.getWordCount(content);
    const targetWords = this.getWordTarget(options.length);
    const lengthDiff = Math.abs(wordCount - targetWords) / targetWords;
    score += weights.length * (1 - Math.min(lengthDiff, 1));

    // Check keyword inclusion
    const keywordMatches = jobAnalysis.keywords.filter((kw: string) =>
      content.toLowerCase().includes(kw.toLowerCase())
    ).length;
    score += weights.keywords * (keywordMatches / Math.max(jobAnalysis.keywords.length, 1));

    // Check structure (paragraphs, sections)
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50);
    const hasGoodStructure = paragraphs.length >= 3 && paragraphs.length <= 5;
    score += weights.structure * (hasGoodStructure ? 1 : 0.5);

    // Check personalization (company mentions, specific details)
    const companyMentions = (content.match(new RegExp(options.companyResearch?.name || 'company', 'gi')) || []).length;
    const hasPersonalization = companyMentions >= 2 && content.includes(options.companyResearch?.industry || '');
    score += weights.personalization * (hasPersonalization ? 1 : 0.5);

    // Check readability (sentence variety, not too complex)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
    const goodReadability = avgSentenceLength >= 10 && avgSentenceLength <= 20;
    score += weights.readability * (goodReadability ? 1 : 0.7);

    return Math.round(score);
  }

  // Save cover letter to database
  private async saveCoverLetter(
    userId: string,
    resumeId: string,
    jobId: string,
    content: string,
    options: GenerationOptions,
    qualityScore: number
  ) {
    return this.prisma.coverLetter.create({
      data: {
        userId,
        resumeId,
        jobId,
        content,
        metadata: {
          tone: options.tone,
          length: options.length,
          template: options.template,
          qualityScore,
          generatedAt: new Date().toISOString()
        }
      }
    });
  }

  // Helper methods
  private getTemplate(templateId?: string): CoverLetterTemplate {
    return this.templates.find(t => t.id === templateId) || this.templates[0];
  }

  private getWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private getWordTarget(length: CoverLetterLength): number {
    const targets = {
      [CoverLetterLength.SHORT]: 200,
      [CoverLetterLength.MEDIUM]: 350,
      [CoverLetterLength.LONG]: 500
    };
    return targets[length];
  }

  private summarizeExperience(experience: any[]): string {
    if (!experience || experience.length === 0) return 'Entry level';
    
    const years = experience.reduce((total, exp) => {
      const start = new Date(exp.startDate);
      const end = exp.current ? new Date() : new Date(exp.endDate);
      return total + (end.getFullYear() - start.getFullYear());
    }, 0);
    
    const recentRole = experience[0];
    return `${years}+ years, most recently as ${recentRole.title} at ${recentRole.company}`;
  }

  private extractAchievements(resume: any): string {
    const achievements = [];
    
    if (resume.experience) {
      resume.experience.forEach((exp: any) => {
        if (exp.achievements) {
          achievements.push(...exp.achievements
            .filter((a: string) => a.match(/\d+|increased|decreased|improved|led|managed/i))
            .slice(0, 2)
          );
        }
      });
    }
    
    return achievements.slice(0, 3).join('; ') || 'Various professional accomplishments';
  }

  // Get all cover letters for a user
  async getUserCoverLetters(userId: string) {
    return this.prisma.coverLetter.findMany({
      where: { userId },
      include: {
        resume: { select: { title: true } },
        job: { select: { title: true, company: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Delete a cover letter
  async deleteCoverLetter(coverLetterId: string, userId: string) {
    return this.prisma.coverLetter.delete({
      where: { id: coverLetterId, userId }
    });
  }
}