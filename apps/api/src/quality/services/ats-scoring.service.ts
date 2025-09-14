import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Interface for ATS scoring result with detailed breakdown
interface ATSScore {
  overallScore: number; // 0-100
  breakdown: {
    formatting: number;
    keywords: number;
    structure: number;
    readability: number;
    compatibility: number;
  };
  issues: ATSIssue[];
  recommendations: string[];
  passATS: boolean; // true if score > 75
}

// Interface for ATS issues found in resume
interface ATSIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  fix?: string;
}

@Injectable()
export class ATSScoringService {
  constructor(private prisma: PrismaService) {}

  // Main ATS scoring function
  async scoreResume(resumeContent: string, jobDescription?: string): Promise<ATSScore> {
    // Parse resume content
    const sections = this.parseResumeSections(resumeContent);
    
    // Initialize scoring components
    const formatting = this.scoreFormatting(resumeContent, sections);
    const keywords = jobDescription 
      ? await this.scoreKeywords(resumeContent, jobDescription)
      : { score: 80, keywords: [] };
    const structure = this.scoreStructure(sections);
    const readability = this.scoreReadability(resumeContent);
    const compatibility = this.scoreCompatibility(resumeContent);
    
    // Calculate overall score
    const overallScore = Math.round(
      formatting.score * 0.2 +
      keywords.score * 0.3 +
      structure.score * 0.2 +
      readability.score * 0.15 +
      compatibility.score * 0.15
    );
    
    // Compile all issues
    const issues: ATSIssue[] = [
      ...formatting.issues,
      ...keywords.issues,
      ...structure.issues,
      ...readability.issues,
      ...compatibility.issues,
    ];
    
    // Generate recommendations based on issues
    const recommendations = this.generateRecommendations(issues, overallScore);
    
    return {
      overallScore,
      breakdown: {
        formatting: formatting.score,
        keywords: keywords.score,
        structure: structure.score,
        readability: readability.score,
        compatibility: compatibility.score,
      },
      issues,
      recommendations,
      passATS: overallScore >= 75,
    };
  }

  // Parse resume into sections
  private parseResumeSections(content: string): Map<string, string> {
    const sections = new Map<string, string>();
    const sectionHeaders = [
      'summary', 'objective', 'experience', 'education', 
      'skills', 'projects', 'certifications', 'awards',
      'publications', 'languages', 'interests'
    ];
    
    // Simple section detection based on common headers
    const lines = content.split('\n');
    let currentSection = 'header';
    let sectionContent = '';
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const foundSection = sectionHeaders.find(header => 
        lowerLine.includes(header) && line.length < 50
      );
      
      if (foundSection) {
        if (currentSection && sectionContent) {
          sections.set(currentSection, sectionContent.trim());
        }
        currentSection = foundSection;
        sectionContent = '';
      } else {
        sectionContent += line + '\n';
      }
    }
    
    // Add last section
    if (currentSection && sectionContent) {
      sections.set(currentSection, sectionContent.trim());
    }
    
    return sections;
  }

  // Score formatting for ATS compatibility
  private scoreFormatting(content: string, sections: Map<string, string>) {
    let score = 100;
    const issues: ATSIssue[] = [];
    
    // Check for problematic formatting
    if (content.includes('│') || content.includes('┌') || content.includes('└')) {
      score -= 20;
      issues.push({
        type: 'error',
        category: 'formatting',
        message: 'Resume contains special characters or tables that ATS cannot parse',
        impact: 'high',
        fix: 'Remove all special characters and tables, use simple bullet points instead'
      });
    }
    
    // Check for images (base64 or references)
    if (content.match(/\.(jpg|jpeg|png|gif|bmp)/i) || content.includes('base64')) {
      score -= 25;
      issues.push({
        type: 'error',
        category: 'formatting',
        message: 'Resume contains images which ATS cannot read',
        impact: 'high',
        fix: 'Remove all images from the resume'
      });
    }
    
    // Check for headers and footers
    if (content.match(/page \d+ of \d+/i)) {
      score -= 10;
      issues.push({
        type: 'warning',
        category: 'formatting',
        message: 'Resume contains headers/footers that may confuse ATS',
        impact: 'medium',
        fix: 'Remove page numbers and headers/footers'
      });
    }
    
    // Check for columns (simple detection)
    const lines = content.split('\n');
    const avgSpaces = lines
      .filter(l => l.trim())
      .map(l => (l.match(/\s{5,}/g) || []).length)
      .reduce((a, b) => a + b, 0) / lines.length;
    
    if (avgSpaces > 2) {
      score -= 15;
      issues.push({
        type: 'warning',
        category: 'formatting',
        message: 'Resume appears to use multiple columns which ATS may misread',
        impact: 'high',
        fix: 'Use single-column format for better ATS compatibility'
      });
    }
    
    // Check bullet points
    const hasBullets = content.match(/[•·▪▫◦‣⁃]/g);
    const hasSimpleBullets = content.match(/^[\*\-]\s/gm);
    
    if (!hasBullets && !hasSimpleBullets) {
      score -= 10;
      issues.push({
        type: 'info',
        category: 'formatting',
        message: 'Resume lacks bullet points for better readability',
        impact: 'low',
        fix: 'Use bullet points to list achievements and responsibilities'
      });
    } else if (hasBullets && !hasSimpleBullets) {
      score -= 5;
      issues.push({
        type: 'info',
        category: 'formatting',
        message: 'Use simple dashes (-) or asterisks (*) for bullets',
        impact: 'low',
        fix: 'Replace special bullet characters with simple dashes'
      });
    }
    
    return { score: Math.max(0, score), issues };
  }

  // Score keyword matching
  private async scoreKeywords(resumeContent: string, jobDescription: string) {
    let score = 100;
    const issues: ATSIssue[] = [];
    const keywords: { keyword: string; found: boolean; count: number }[] = [];
    
    // Extract important keywords from job description
    const jobKeywords = this.extractKeywords(jobDescription);
    const resumeLower = resumeContent.toLowerCase();
    
    // Check each keyword
    let foundCount = 0;
    for (const keyword of jobKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = resumeContent.match(regex);
      const count = matches ? matches.length : 0;
      
      keywords.push({
        keyword,
        found: count > 0,
        count
      });
      
      if (count > 0) foundCount++;
    }
    
    // Calculate score based on keyword match percentage
    const matchPercentage = jobKeywords.length > 0 
      ? (foundCount / jobKeywords.length) * 100 
      : 100;
    
    score = Math.round(matchPercentage);
    
    // Add issues for missing critical keywords
    const missingKeywords = keywords
      .filter(k => !k.found)
      .map(k => k.keyword)
      .slice(0, 5); // Top 5 missing
    
    if (missingKeywords.length > 0) {
      issues.push({
        type: 'warning',
        category: 'keywords',
        message: `Missing important keywords: ${missingKeywords.join(', ')}`,
        impact: 'high',
        fix: 'Add these keywords naturally throughout your resume where relevant'
      });
    }
    
    // Check for keyword stuffing
    const overusedKeywords = keywords
      .filter(k => k.count > 5)
      .map(k => k.keyword);
    
    if (overusedKeywords.length > 0) {
      score -= 10;
      issues.push({
        type: 'warning',
        category: 'keywords',
        message: `Potential keyword stuffing detected: ${overusedKeywords.join(', ')}`,
        impact: 'medium',
        fix: 'Use keywords naturally, avoid excessive repetition'
      });
    }
    
    return { score: Math.max(0, score), issues, keywords };
  }

  // Extract keywords from text
  private extractKeywords(text: string): string[] {
    // Common tech skills and keywords to look for
    const techKeywords = [
      'javascript', 'typescript', 'react', 'angular', 'vue', 'node.js', 'nodejs',
      'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust', 'swift', 'kotlin',
      'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'ci/cd',
      'agile', 'scrum', 'kanban', 'jira', 'git', 'github', 'gitlab',
      'rest', 'api', 'graphql', 'microservices', 'serverless',
      'machine learning', 'ai', 'data science', 'analytics'
    ];
    
    // Extract skills mentioned in job description
    const words = text.toLowerCase().split(/\s+/);
    const foundKeywords = new Set<string>();
    
    // Check for tech keywords
    for (const keyword of techKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        foundKeywords.add(keyword);
      }
    }
    
    // Extract years of experience requirements
    const expMatches = text.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/gi);
    if (expMatches) {
      foundKeywords.add('years of experience');
    }
    
    // Extract degree requirements
    if (text.match(/bachelor|master|phd|degree/i)) {
      foundKeywords.add('degree');
    }
    
    // Extract action verbs
    const actionVerbs = ['manage', 'lead', 'develop', 'design', 'implement', 'optimize', 'analyze'];
    for (const verb of actionVerbs) {
      if (text.toLowerCase().includes(verb)) {
        foundKeywords.add(verb);
      }
    }
    
    return Array.from(foundKeywords);
  }

  // Score resume structure
  private scoreStructure(sections: Map<string, string>) {
    let score = 100;
    const issues: ATSIssue[] = [];
    
    // Check for essential sections
    const essentialSections = ['experience', 'education', 'skills'];
    const recommendedSections = ['summary', 'projects'];
    
    for (const section of essentialSections) {
      if (!sections.has(section) || sections.get(section)?.length < 20) {
        score -= 20;
        issues.push({
          type: 'error',
          category: 'structure',
          message: `Missing or incomplete ${section} section`,
          impact: 'high',
          fix: `Add a clear ${section} section with relevant content`
        });
      }
    }
    
    for (const section of recommendedSections) {
      if (!sections.has(section)) {
        score -= 5;
        issues.push({
          type: 'info',
          category: 'structure',
          message: `Consider adding a ${section} section`,
          impact: 'low',
          fix: `Add a ${section} section to strengthen your resume`
        });
      }
    }
    
    // Check section order
    const sectionKeys = Array.from(sections.keys());
    const idealOrder = ['header', 'summary', 'experience', 'education', 'skills'];
    
    let orderScore = 0;
    for (let i = 0; i < idealOrder.length; i++) {
      const actualIndex = sectionKeys.indexOf(idealOrder[i]);
      if (actualIndex !== -1 && Math.abs(actualIndex - i) <= 1) {
        orderScore += 20;
      }
    }
    
    if (orderScore < 60) {
      score -= 10;
      issues.push({
        type: 'info',
        category: 'structure',
        message: 'Resume sections could be better organized',
        impact: 'low',
        fix: 'Consider reordering sections: Summary → Experience → Education → Skills'
      });
    }
    
    // Check for contact information
    const header = sections.get('header') || '';
    if (!header.match(/[\w._%+-]+@[\w.-]+\.[A-Z]{2,}/i)) {
      score -= 15;
      issues.push({
        type: 'error',
        category: 'structure',
        message: 'Email address not found',
        impact: 'high',
        fix: 'Add a clear email address in the header section'
      });
    }
    
    if (!header.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)) {
      score -= 10;
      issues.push({
        type: 'warning',
        category: 'structure',
        message: 'Phone number not found',
        impact: 'medium',
        fix: 'Add a phone number for contact purposes'
      });
    }
    
    return { score: Math.max(0, score), issues };
  }

  // Score readability
  private scoreReadability(content: string) {
    let score = 100;
    const issues: ATSIssue[] = [];
    
    // Calculate average sentence length
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((acc, s) => acc + s.split(' ').length, 0) / sentences.length;
    
    if (avgSentenceLength > 25) {
      score -= 15;
      issues.push({
        type: 'warning',
        category: 'readability',
        message: 'Sentences are too long on average',
        impact: 'medium',
        fix: 'Break long sentences into shorter, clearer statements'
      });
    }
    
    // Check for passive voice
    const passivePatterns = /\b(was|were|been|being|is|are|am)\s+\w+ed\b/gi;
    const passiveMatches = content.match(passivePatterns) || [];
    
    if (passiveMatches.length > 10) {
      score -= 10;
      issues.push({
        type: 'info',
        category: 'readability',
        message: 'Excessive use of passive voice detected',
        impact: 'low',
        fix: 'Use active voice to make your achievements more impactful'
      });
    }
    
    // Check for quantified achievements
    const numbers = content.match(/\d+%?/g) || [];
    if (numbers.length < 5) {
      score -= 10;
      issues.push({
        type: 'info',
        category: 'readability',
        message: 'Lack of quantified achievements',
        impact: 'medium',
        fix: 'Add numbers, percentages, and metrics to quantify your impact'
      });
    }
    
    // Check line length
    const lines = content.split('\n');
    const longLines = lines.filter(l => l.length > 120).length;
    
    if (longLines > 5) {
      score -= 5;
      issues.push({
        type: 'info',
        category: 'readability',
        message: 'Some lines are too long',
        impact: 'low',
        fix: 'Keep lines under 120 characters for better readability'
      });
    }
    
    return { score: Math.max(0, score), issues };
  }

  // Score ATS compatibility
  private scoreCompatibility(content: string) {
    let score = 100;
    const issues: ATSIssue[] = [];
    
    // Check file format indicators
    if (content.includes('\\rtf') || content.includes('\\ansi')) {
      score -= 30;
      issues.push({
        type: 'error',
        category: 'compatibility',
        message: 'Resume appears to be in RTF format',
        impact: 'high',
        fix: 'Convert to plain text or PDF format'
      });
    }
    
    // Check for hyperlinks
    const urlPattern = /https?:\/\/[^\s]+/gi;
    const urls = content.match(urlPattern) || [];
    
    if (urls.length > 5) {
      score -= 10;
      issues.push({
        type: 'warning',
        category: 'compatibility',
        message: 'Too many hyperlinks may confuse ATS',
        impact: 'medium',
        fix: 'Limit hyperlinks to essential ones only (LinkedIn, portfolio)'
      });
    }
    
    // Check for special fonts or formatting (heuristic)
    if (content.includes('font-family') || content.includes('font-size')) {
      score -= 15;
      issues.push({
        type: 'warning',
        category: 'compatibility',
        message: 'Complex formatting detected',
        impact: 'medium',
        fix: 'Use standard fonts and simple formatting'
      });
    }
    
    // Check resume length
    const wordCount = content.split(/\s+/).length;
    if (wordCount > 1000) {
      score -= 10;
      issues.push({
        type: 'info',
        category: 'compatibility',
        message: 'Resume is quite long',
        impact: 'low',
        fix: 'Consider condensing to 2 pages or less'
      });
    }
    
    // Check for date formats
    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{2,4}/,
      /\d{4}-\d{2}-\d{2}/,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}/i
    ];
    
    const hasStandardDates = datePatterns.some(pattern => pattern.test(content));
    if (!hasStandardDates && content.toLowerCase().includes('present')) {
      score -= 5;
      issues.push({
        type: 'info',
        category: 'compatibility',
        message: 'Use standard date formats',
        impact: 'low',
        fix: 'Use formats like "Jan 2023 - Present" or "01/2023 - 12/2024"'
      });
    }
    
    return { score: Math.max(0, score), issues };
  }

  // Generate recommendations based on issues
  private generateRecommendations(issues: ATSIssue[], overallScore: number): string[] {
    const recommendations: string[] = [];
    
    // Priority recommendations based on score
    if (overallScore < 50) {
      recommendations.push('⚠️ Your resume needs significant improvements to pass ATS systems');
    } else if (overallScore < 75) {
      recommendations.push('📈 Your resume is good but needs some optimization for ATS');
    } else {
      recommendations.push('✅ Your resume is well-optimized for ATS systems');
    }
    
    // Group issues by impact
    const highImpact = issues.filter(i => i.impact === 'high');
    const mediumImpact = issues.filter(i => i.impact === 'medium');
    
    if (highImpact.length > 0) {
      recommendations.push(`Fix ${highImpact.length} critical issues first for maximum improvement`);
    }
    
    if (mediumImpact.length > 0) {
      recommendations.push(`Address ${mediumImpact.length} moderate issues to boost your score`);
    }
    
    // Specific category recommendations
    const categories = new Set(issues.map(i => i.category));
    
    if (categories.has('formatting')) {
      recommendations.push('Simplify formatting: use single column, standard fonts, and plain bullets');
    }
    
    if (categories.has('keywords')) {
      recommendations.push('Align your resume keywords with the job description');
    }
    
    if (categories.has('structure')) {
      recommendations.push('Ensure all essential sections are present and well-organized');
    }
    
    // Add top 3 specific fixes
    const topFixes = issues
      .filter(i => i.fix)
      .slice(0, 3)
      .map(i => i.fix!);
    
    recommendations.push(...topFixes);
    
    return recommendations;
  }

  // Compare two resumes and return improvement metrics
  async compareResumes(
    originalContent: string,
    optimizedContent: string,
    jobDescription?: string
  ): Promise<{
    originalScore: ATSScore;
    optimizedScore: ATSScore;
    improvement: number;
    improvementAreas: string[];
  }> {
    // Score both versions
    const originalScore = await this.scoreResume(originalContent, jobDescription);
    const optimizedScore = await this.scoreResume(optimizedContent, jobDescription);
    
    // Calculate improvement
    const improvement = optimizedScore.overallScore - originalScore.overallScore;
    
    // Identify areas of improvement
    const improvementAreas: string[] = [];
    
    for (const [category, score] of Object.entries(optimizedScore.breakdown)) {
      const originalCategoryScore = originalScore.breakdown[category as keyof typeof originalScore.breakdown];
      if (score > originalCategoryScore) {
        improvementAreas.push(`${category}: +${score - originalCategoryScore} points`);
      }
    }
    
    return {
      originalScore,
      optimizedScore,
      improvement,
      improvementAreas
    };
  }
}