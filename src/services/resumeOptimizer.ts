import { JobDetails } from '../types/job';
import { calculateMatchScore } from '../utils/matching';

interface ResumeAnalysis {
  atsScore: number;
  keywords: {
    found: string[];
    missing: string[];
    frequency: Map<string, number>;
  };
  sections: {
    hasExperience: boolean;
    hasEducation: boolean;
    hasSkills: boolean;
    hasSummary: boolean;
    hasContact: boolean;
  };
  suggestions: string[];
  matchScore: number;
  formatting: {
    isParseable: boolean;
    hasProperStructure: boolean;
    usesStandardFonts: boolean;
    avoidsTables: boolean;
    avoidsImages: boolean;
  };
}

interface OptimizationSuggestion {
  category: 'keyword' | 'formatting' | 'content' | 'structure';
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  impact: string;
}

export class ResumeOptimizer {
  private commonATSKeywords = new Set([
    'experience', 'education', 'skills', 'achievements', 'responsibilities',
    'managed', 'developed', 'implemented', 'analyzed', 'improved',
    'created', 'designed', 'led', 'collaborated', 'coordinated'
  ]);

  private technicalKeywords = new Set([
    'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'aws',
    'docker', 'kubernetes', 'git', 'agile', 'scrum', 'api', 'database',
    'cloud', 'devops', 'ci/cd', 'microservices', 'rest', 'graphql'
  ]);

  analyzeResume(resumeText: string, jobDetails?: JobDetails): ResumeAnalysis {
    const normalizedResume = resumeText.toLowerCase();
    
    // Extract keywords
    const keywords = this.extractKeywords(resumeText, jobDetails);
    
    // Check sections
    const sections = this.analyzeSections(normalizedResume);
    
    // Calculate ATS score
    const atsScore = this.calculateATSScore(resumeText, sections, keywords);
    
    // Check formatting
    const formatting = this.analyzeFormatting(resumeText);
    
    // Generate suggestions
    const suggestions = this.generateSuggestions(
      sections,
      keywords,
      formatting,
      atsScore
    );
    
    // Calculate match score if job details provided
    const matchScore = jobDetails 
      ? this.calculateJobMatchScore(resumeText, jobDetails)
      : 0;
    
    return {
      atsScore,
      keywords,
      sections,
      suggestions,
      matchScore,
      formatting
    };
  }

  private extractKeywords(
    resumeText: string, 
    jobDetails?: JobDetails
  ): ResumeAnalysis['keywords'] {
    const normalizedText = resumeText.toLowerCase();
    const words = normalizedText.split(/\s+/);
    const frequency = new Map<string, number>();
    const found: string[] = [];
    const missing: string[] = [];

    // Count word frequencies
    words.forEach(word => {
      const cleanWord = word.replace(/[^a-z0-9\-\.]/g, '');
      if (cleanWord.length > 2) {
        frequency.set(cleanWord, (frequency.get(cleanWord) || 0) + 1);
      }
    });

    // Check for important keywords
    const importantKeywords = jobDetails 
      ? this.extractJobKeywords(jobDetails)
      : [...this.commonATSKeywords, ...this.technicalKeywords];

    importantKeywords.forEach(keyword => {
      if (normalizedText.includes(keyword.toLowerCase())) {
        found.push(keyword);
      } else {
        missing.push(keyword);
      }
    });

    return { found, missing, frequency };
  }

  private extractJobKeywords(jobDetails: JobDetails): string[] {
    const keywords: string[] = [];
    
    // Extract from job title
    if (jobDetails.title) {
      keywords.push(...jobDetails.title.split(/\s+/));
    }
    
    // Extract from description
    if (jobDetails.description) {
      const importantWords = jobDetails.description
        .split(/\s+/)
        .filter(word => word.length > 4)
        .slice(0, 20);
      keywords.push(...importantWords);
    }
    
    // Add skills if available
    if ('skills' in jobDetails && Array.isArray(jobDetails.skills)) {
      keywords.push(...jobDetails.skills);
    }
    
    return [...new Set(keywords)];
  }

  private analyzeSections(resumeText: string): ResumeAnalysis['sections'] {
    return {
      hasExperience: /experience|employment|work history/i.test(resumeText),
      hasEducation: /education|academic|university|college|degree/i.test(resumeText),
      hasSkills: /skills|competencies|technologies|expertise/i.test(resumeText),
      hasSummary: /summary|objective|profile|about/i.test(resumeText),
      hasContact: /email|phone|address|linkedin/i.test(resumeText)
    };
  }

  private analyzeFormatting(resumeText: string): ResumeAnalysis['formatting'] {
    return {
      isParseable: !this.containsSpecialCharacters(resumeText),
      hasProperStructure: this.hasProperStructure(resumeText),
      usesStandardFonts: !this.containsFontTags(resumeText),
      avoidsTables: !this.containsTableStructure(resumeText),
      avoidsImages: !this.containsImages(resumeText)
    };
  }

  private containsSpecialCharacters(text: string): boolean {
    const specialChars = /[\u2022\u2023\u25AA\u25CF\u25CB\u25BA]/g;
    return specialChars.test(text);
  }

  private hasProperStructure(text: string): boolean {
    const lines = text.split('\n');
    const hasHeaders = lines.some(line => 
      /^(EXPERIENCE|EDUCATION|SKILLS|SUMMARY)/i.test(line.trim())
    );
    const hasBulletPoints = lines.some(line => 
      /^[\-\*\•]\s+/.test(line.trim())
    );
    return hasHeaders || hasBulletPoints;
  }

  private containsFontTags(text: string): boolean {
    return /<font|font-family|@font-face/i.test(text);
  }

  private containsTableStructure(text: string): boolean {
    return /<table|<tr|<td|\|.*\|.*\|/i.test(text);
  }

  private containsImages(text: string): boolean {
    return /<img|\.jpg|\.png|\.gif|image\//i.test(text);
  }

  private calculateATSScore(
    resumeText: string,
    sections: ResumeAnalysis['sections'],
    keywords: ResumeAnalysis['keywords']
  ): number {
    let score = 0;
    const maxScore = 100;

    // Section scoring (40 points)
    if (sections.hasContact) score += 10;
    if (sections.hasSummary) score += 5;
    if (sections.hasExperience) score += 10;
    if (sections.hasEducation) score += 10;
    if (sections.hasSkills) score += 5;

    // Keyword scoring (30 points)
    const keywordRatio = keywords.found.length / 
      (keywords.found.length + keywords.missing.length || 1);
    score += Math.round(keywordRatio * 30);

    // Length scoring (10 points)
    const wordCount = resumeText.split(/\s+/).length;
    if (wordCount >= 300 && wordCount <= 800) {
      score += 10;
    } else if (wordCount >= 200 && wordCount <= 1000) {
      score += 5;
    }

    // Formatting scoring (20 points)
    const lines = resumeText.split('\n');
    const hasGoodFormatting = lines.length > 10 && lines.length < 100;
    if (hasGoodFormatting) score += 10;
    
    const hasActionVerbs = /managed|developed|created|implemented|improved/i.test(resumeText);
    if (hasActionVerbs) score += 10;

    return Math.min(score, maxScore);
  }

  private calculateJobMatchScore(
    resumeText: string,
    jobDetails: JobDetails
  ): number {
    const resumeSkills = this.extractSkillsFromResume(resumeText);
    const jobSkills = 'skills' in jobDetails && Array.isArray(jobDetails.skills) 
      ? jobDetails.skills 
      : [];
    
    return calculateMatchScore(resumeSkills, jobSkills);
  }

  private extractSkillsFromResume(resumeText: string): string[] {
    const skills: string[] = [];
    const normalizedText = resumeText.toLowerCase();
    
    // Extract technical skills
    this.technicalKeywords.forEach(skill => {
      if (normalizedText.includes(skill)) {
        skills.push(skill);
      }
    });
    
    // Extract from skills section if exists
    const skillsMatch = normalizedText.match(/skills[\s\S]{0,500}/);
    if (skillsMatch) {
      const skillsSection = skillsMatch[0];
      const extractedSkills = skillsSection
        .split(/[,;\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 2 && s.length < 30);
      skills.push(...extractedSkills);
    }
    
    return [...new Set(skills)];
  }

  generateSuggestions(
    sections: ResumeAnalysis['sections'],
    keywords: ResumeAnalysis['keywords'],
    formatting: ResumeAnalysis['formatting'],
    atsScore: number
  ): string[] {
    const suggestions: string[] = [];

    // Section suggestions
    if (!sections.hasContact) {
      suggestions.push('Add clear contact information including email and phone number');
    }
    if (!sections.hasSummary) {
      suggestions.push('Include a professional summary or objective statement');
    }
    if (!sections.hasExperience) {
      suggestions.push('Add a work experience section with relevant positions');
    }
    if (!sections.hasEducation) {
      suggestions.push('Include education details with degrees and institutions');
    }
    if (!sections.hasSkills) {
      suggestions.push('Add a skills section highlighting technical and soft skills');
    }

    // Keyword suggestions
    if (keywords.missing.length > 0) {
      const topMissing = keywords.missing.slice(0, 5).join(', ');
      suggestions.push(`Consider incorporating these keywords: ${topMissing}`);
    }

    // Formatting suggestions
    if (!formatting.isParseable) {
      suggestions.push('Avoid special characters and use standard bullet points');
    }
    if (!formatting.hasProperStructure) {
      suggestions.push('Use clear section headers and bullet points for better readability');
    }
    if (!formatting.avoidsTables) {
      suggestions.push('Avoid using tables as they may not parse well in ATS systems');
    }
    if (!formatting.avoidsImages) {
      suggestions.push('Remove images and graphics as ATS cannot read them');
    }

    // Score-based suggestions
    if (atsScore < 60) {
      suggestions.push('Focus on adding more relevant keywords and improving structure');
    } else if (atsScore < 80) {
      suggestions.push('Fine-tune keyword usage and ensure all sections are complete');
    }

    return suggestions;
  }

  optimizeForJob(resumeText: string, jobDetails: JobDetails): {
    optimizedResume: string;
    changes: string[];
    newScore: number;
  } {
    const analysis = this.analyzeResume(resumeText, jobDetails);
    let optimizedResume = resumeText;
    const changes: string[] = [];

    // Add missing keywords naturally
    if (analysis.keywords.missing.length > 0) {
      const keywordsToAdd = analysis.keywords.missing.slice(0, 5);
      
      // Add to skills section if exists
      if (analysis.sections.hasSkills) {
        const skillsRegex = /(skills|competencies)([\s\S]{0,500})/i;
        optimizedResume = optimizedResume.replace(skillsRegex, (match, header, content) => {
          const addedSkills = keywordsToAdd.join(', ');
          changes.push(`Added keywords to skills section: ${addedSkills}`);
          return `${header}${content}\n${addedSkills}`;
        });
      }
    }

    // Improve formatting
    if (!analysis.formatting.hasProperStructure) {
      optimizedResume = this.improveStructure(optimizedResume);
      changes.push('Improved document structure with clear sections');
    }

    // Calculate new score
    const newAnalysis = this.analyzeResume(optimizedResume, jobDetails);
    
    return {
      optimizedResume,
      changes,
      newScore: newAnalysis.atsScore
    };
  }

  private improveStructure(resumeText: string): string {
    let improved = resumeText;
    
    // Add section headers if missing
    const sections = [
      { pattern: /experience/i, header: '\nEXPERIENCE\n' },
      { pattern: /education/i, header: '\nEDUCATION\n' },
      { pattern: /skills/i, header: '\nSKILLS\n' }
    ];
    
    sections.forEach(({ pattern, header }) => {
      if (!pattern.test(improved)) {
        improved += header;
      }
    });
    
    return improved;
  }

  generateOptimizationReport(analysis: ResumeAnalysis): string {
    const report: string[] = [];
    
    report.push('=== RESUME OPTIMIZATION REPORT ===\n');
    report.push(`ATS Score: ${analysis.atsScore}/100\n`);
    
    if (analysis.matchScore > 0) {
      report.push(`Job Match Score: ${analysis.matchScore}%\n`);
    }
    
    report.push('\n--- SECTIONS ANALYSIS ---');
    Object.entries(analysis.sections).forEach(([section, exists]) => {
      const status = exists ? '✓' : '✗';
      const sectionName = section.replace(/^has/, '');
      report.push(`${status} ${sectionName}`);
    });
    
    report.push('\n--- KEYWORDS ANALYSIS ---');
    report.push(`Found: ${analysis.keywords.found.length} important keywords`);
    report.push(`Missing: ${analysis.keywords.missing.length} keywords`);
    
    if (analysis.keywords.missing.length > 0) {
      report.push('\nTop missing keywords:');
      analysis.keywords.missing.slice(0, 10).forEach(keyword => {
        report.push(`  - ${keyword}`);
      });
    }
    
    report.push('\n--- FORMATTING CHECK ---');
    Object.entries(analysis.formatting).forEach(([check, passes]) => {
      const status = passes ? '✓' : '✗';
      const checkName = check.replace(/([A-Z])/g, ' $1').toLowerCase();
      report.push(`${status} ${checkName}`);
    });
    
    report.push('\n--- RECOMMENDATIONS ---');
    analysis.suggestions.forEach((suggestion, index) => {
      report.push(`${index + 1}. ${suggestion}`);
    });
    
    return report.join('\n');
  }
}