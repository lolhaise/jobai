import { Injectable } from '@nestjs/common';

// Interface for readability analysis result
interface ReadabilityScore {
  overallScore: number; // 0-100
  gradeLevel: number; // Reading grade level
  metrics: {
    fleschReadingEase: number; // 0-100 (higher is easier)
    fleschKincaidGrade: number; // Grade level
    gunningFog: number; // Years of education needed
    smogIndex: number; // Years of education needed
    automatedReadabilityIndex: number; // Grade level
    colemanLiauIndex: number; // Grade level
  };
  analysis: {
    totalWords: number;
    totalSentences: number;
    totalSyllables: number;
    averageWordsPerSentence: number;
    averageSyllablesPerWord: number;
    complexWords: number; // Words with 3+ syllables
    longSentences: number; // Sentences with 20+ words
  };
  issues: ReadabilityIssue[];
  suggestions: string[];
  targetAudience: string;
}

// Interface for readability issues
interface ReadabilityIssue {
  type: 'error' | 'warning' | 'info';
  text: string;
  issue: string;
  suggestion: string;
  location?: string;
}

@Injectable()
export class ReadabilityCheckerService {
  // Main readability checking function
  async checkReadability(text: string, targetRole?: string): Promise<ReadabilityScore> {
    // Clean and prepare text
    const cleanText = this.cleanText(text);
    
    // Calculate basic metrics
    const analysis = this.analyzeText(cleanText);
    
    // Calculate readability scores
    const metrics = this.calculateReadabilityMetrics(analysis);
    
    // Determine overall score and grade level
    const overallScore = this.calculateOverallScore(metrics);
    const gradeLevel = this.determineGradeLevel(metrics);
    
    // Find readability issues
    const issues = this.findReadabilityIssues(cleanText, analysis);
    
    // Generate suggestions based on role and metrics
    const suggestions = this.generateSuggestions(metrics, analysis, targetRole);
    
    // Determine target audience suitability
    const targetAudience = this.determineTargetAudience(gradeLevel, targetRole);
    
    return {
      overallScore,
      gradeLevel,
      metrics,
      analysis,
      issues,
      suggestions,
      targetAudience
    };
  }

  // Clean text for analysis
  private cleanText(text: string): string {
    return text
      .replace(/[•·▪▫◦‣⁃]/g, '') // Remove bullet points
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/[\w._%+-]+@[\w.-]+\.[A-Z]{2,}/gi, '') // Remove emails
      .replace(/\d{3}-\d{3}-\d{4}/g, '') // Remove phone numbers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Analyze text for basic metrics
  private analyzeText(text: string) {
    // Count sentences (period, exclamation, question mark)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const totalSentences = sentences.length || 1;
    
    // Count words
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length || 1;
    
    // Count syllables and complex words
    let totalSyllables = 0;
    let complexWords = 0;
    
    for (const word of words) {
      const syllables = this.countSyllables(word);
      totalSyllables += syllables;
      if (syllables >= 3 && !this.isCommonWord(word)) {
        complexWords++;
      }
    }
    
    // Count long sentences
    const longSentences = sentences.filter(s => 
      s.split(/\s+/).length >= 20
    ).length;
    
    return {
      totalWords,
      totalSentences,
      totalSyllables,
      averageWordsPerSentence: totalWords / totalSentences,
      averageSyllablesPerWord: totalSyllables / totalWords,
      complexWords,
      longSentences
    };
  }

  // Count syllables in a word
  private countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    
    // Count vowel groups
    let syllables = 0;
    let previousWasVowel = false;
    const vowels = 'aeiouy';
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        syllables++;
      }
      previousWasVowel = isVowel;
    }
    
    // Adjustments
    if (word.endsWith('e')) syllables--;
    if (word.endsWith('le') && word.length > 2) syllables++;
    if (syllables === 0) syllables = 1;
    
    return syllables;
  }

  // Check if word is common (shouldn't count as complex)
  private isCommonWord(word: string): boolean {
    const commonWords = [
      'experience', 'management', 'development', 'professional',
      'responsible', 'successful', 'implement', 'coordinate',
      'communicate', 'collaborate', 'organize', 'analyze'
    ];
    return commonWords.includes(word.toLowerCase());
  }

  // Calculate various readability metrics
  private calculateReadabilityMetrics(analysis: typeof ReadabilityCheckerService.prototype.analyzeText.prototype) {
    const { 
      totalWords, 
      totalSentences, 
      totalSyllables, 
      averageWordsPerSentence,
      averageSyllablesPerWord,
      complexWords 
    } = analysis;
    
    // Flesch Reading Ease
    // 206.835 - 1.015 * (total words / total sentences) - 84.6 * (total syllables / total words)
    const fleschReadingEase = Math.max(0, Math.min(100,
      206.835 - 1.015 * averageWordsPerSentence - 84.6 * averageSyllablesPerWord
    ));
    
    // Flesch-Kincaid Grade Level
    // 0.39 * (total words / total sentences) + 11.8 * (total syllables / total words) - 15.59
    const fleschKincaidGrade = Math.max(0,
      0.39 * averageWordsPerSentence + 11.8 * averageSyllablesPerWord - 15.59
    );
    
    // Gunning Fog Index
    // 0.4 * [(words/sentences) + 100 * (complex words / words)]
    const gunningFog = 0.4 * (averageWordsPerSentence + 100 * (complexWords / totalWords));
    
    // SMOG Index
    // 1.043 * sqrt(complex words * 30 / sentences) + 3.1291
    const smogIndex = totalSentences >= 30
      ? 1.043 * Math.sqrt(complexWords * 30 / totalSentences) + 3.1291
      : gunningFog; // Fallback for short texts
    
    // Automated Readability Index
    // 4.71 * (characters / words) + 0.5 * (words / sentences) - 21.43
    const avgCharsPerWord = analysis.totalWords > 0 
      ? analysis.totalSyllables * 2.5 / analysis.totalWords // Approximation
      : 5;
    const automatedReadabilityIndex = Math.max(0,
      4.71 * avgCharsPerWord + 0.5 * averageWordsPerSentence - 21.43
    );
    
    // Coleman-Liau Index
    // 0.0588 * L - 0.296 * S - 15.8
    // L = average number of letters per 100 words
    // S = average number of sentences per 100 words
    const L = avgCharsPerWord * 100;
    const S = totalWords > 0 ? (totalSentences / totalWords) * 100 : 1;
    const colemanLiauIndex = Math.max(0,
      0.0588 * L - 0.296 * S - 15.8
    );
    
    return {
      fleschReadingEase,
      fleschKincaidGrade,
      gunningFog,
      smogIndex,
      automatedReadabilityIndex,
      colemanLiauIndex
    };
  }

  // Calculate overall readability score
  private calculateOverallScore(metrics: ReturnType<typeof this.calculateReadabilityMetrics>): number {
    // Target: Grade 8-12 reading level for professional documents
    // Flesch Reading Ease: 60-70 is ideal for business
    // Grade levels: 8-12 is ideal
    
    let score = 100;
    
    // Flesch Reading Ease scoring
    if (metrics.fleschReadingEase < 30) {
      score -= 30; // Very difficult
    } else if (metrics.fleschReadingEase < 50) {
      score -= 15; // Difficult
    } else if (metrics.fleschReadingEase > 80) {
      score -= 10; // Too simple
    }
    
    // Grade level scoring (average of grade metrics)
    const avgGrade = (
      metrics.fleschKincaidGrade +
      metrics.gunningFog +
      metrics.automatedReadabilityIndex +
      metrics.colemanLiauIndex
    ) / 4;
    
    if (avgGrade > 16) {
      score -= 25; // Graduate level - too complex
    } else if (avgGrade > 12) {
      score -= 10; // College level - slightly complex
    } else if (avgGrade < 8) {
      score -= 15; // Too simple for professional
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // Determine grade level
  private determineGradeLevel(metrics: ReturnType<typeof this.calculateReadabilityMetrics>): number {
    // Average of all grade-level metrics
    const grades = [
      metrics.fleschKincaidGrade,
      metrics.gunningFog,
      metrics.smogIndex,
      metrics.automatedReadabilityIndex,
      metrics.colemanLiauIndex
    ];
    
    return Math.round(grades.reduce((a, b) => a + b, 0) / grades.length);
  }

  // Find specific readability issues
  private findReadabilityIssues(text: string, analysis: any): ReadabilityIssue[] {
    const issues: ReadabilityIssue[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Check for overly long sentences
    sentences.forEach((sentence, index) => {
      const wordCount = sentence.split(/\s+/).length;
      if (wordCount > 30) {
        issues.push({
          type: 'error',
          text: sentence.substring(0, 50) + '...',
          issue: `Sentence is too long (${wordCount} words)`,
          suggestion: 'Break this into 2-3 shorter sentences',
          location: `Sentence ${index + 1}`
        });
      } else if (wordCount > 20) {
        issues.push({
          type: 'warning',
          text: sentence.substring(0, 50) + '...',
          issue: `Sentence is lengthy (${wordCount} words)`,
          suggestion: 'Consider breaking this into shorter sentences',
          location: `Sentence ${index + 1}`
        });
      }
    });
    
    // Check for complex words usage
    const words = text.split(/\s+/);
    const complexWordsList: string[] = [];
    
    for (const word of words) {
      if (this.countSyllables(word) >= 4 && !this.isCommonWord(word)) {
        complexWordsList.push(word);
      }
    }
    
    if (complexWordsList.length > 10) {
      issues.push({
        type: 'warning',
        text: complexWordsList.slice(0, 5).join(', '),
        issue: 'Too many complex words',
        suggestion: 'Replace complex words with simpler alternatives where possible'
      });
    }
    
    // Check for passive voice
    const passivePatterns = [
      /\bwas\s+\w+ed\b/gi,
      /\bwere\s+\w+ed\b/gi,
      /\bbeen\s+\w+ed\b/gi,
      /\bbeing\s+\w+ed\b/gi,
      /\bis\s+being\s+\w+ed\b/gi
    ];
    
    let passiveCount = 0;
    for (const pattern of passivePatterns) {
      const matches = text.match(pattern);
      if (matches) passiveCount += matches.length;
    }
    
    if (passiveCount > 5) {
      issues.push({
        type: 'info',
        text: 'Multiple instances of passive voice',
        issue: `Found ${passiveCount} instances of passive voice`,
        suggestion: 'Use active voice to make your writing more direct and engaging'
      });
    }
    
    // Check for jargon and buzzwords
    const jargonWords = [
      'synergy', 'leverage', 'paradigm', 'holistic', 'robust',
      'cutting-edge', 'revolutionary', 'disruptive', 'innovative'
    ];
    
    const foundJargon = jargonWords.filter(word => 
      text.toLowerCase().includes(word)
    );
    
    if (foundJargon.length > 3) {
      issues.push({
        type: 'info',
        text: foundJargon.join(', '),
        issue: 'Overuse of business jargon',
        suggestion: 'Replace jargon with clear, specific language'
      });
    }
    
    // Check for redundant phrases
    const redundantPhrases = [
      'in order to', 'due to the fact that', 'at this point in time',
      'each and every', 'first and foremost', 'basic fundamentals'
    ];
    
    const foundRedundant = redundantPhrases.filter(phrase => 
      text.toLowerCase().includes(phrase)
    );
    
    if (foundRedundant.length > 0) {
      issues.push({
        type: 'info',
        text: foundRedundant.join(', '),
        issue: 'Redundant phrases detected',
        suggestion: 'Simplify: "in order to" → "to", "due to the fact that" → "because"'
      });
    }
    
    return issues;
  }

  // Generate suggestions based on analysis
  private generateSuggestions(
    metrics: ReturnType<typeof this.calculateReadabilityMetrics>,
    analysis: any,
    targetRole?: string
  ): string[] {
    const suggestions: string[] = [];
    
    // Overall readability suggestions
    if (metrics.fleschReadingEase < 30) {
      suggestions.push('📝 Simplify your writing - it\'s currently very difficult to read');
      suggestions.push('• Use shorter sentences (aim for 15-20 words)');
      suggestions.push('• Replace complex words with simpler alternatives');
    } else if (metrics.fleschReadingEase < 50) {
      suggestions.push('📊 Your writing is fairly complex - consider simplifying');
      suggestions.push('• Break long sentences into shorter ones');
      suggestions.push('• Use more common words where possible');
    } else if (metrics.fleschReadingEase > 80) {
      suggestions.push('⚡ Your writing might be too simple for professional context');
      suggestions.push('• Add more professional terminology where appropriate');
      suggestions.push('• Combine some short sentences for better flow');
    } else {
      suggestions.push('✅ Your writing has good readability for professional documents');
    }
    
    // Sentence length suggestions
    if (analysis.averageWordsPerSentence > 20) {
      suggestions.push(`📏 Average sentence length is ${Math.round(analysis.averageWordsPerSentence)} words - aim for 15-18`);
    }
    
    // Complex words suggestions
    const complexWordPercentage = (analysis.complexWords / analysis.totalWords) * 100;
    if (complexWordPercentage > 15) {
      suggestions.push(`🎓 ${Math.round(complexWordPercentage)}% of words are complex - try to reduce to under 10%`);
    }
    
    // Role-specific suggestions
    if (targetRole) {
      const roleLower = targetRole.toLowerCase();
      
      if (roleLower.includes('executive') || roleLower.includes('senior')) {
        if (metrics.fleschKincaidGrade < 10) {
          suggestions.push('💼 For executive roles, use more sophisticated language while maintaining clarity');
        }
      } else if (roleLower.includes('technical') || roleLower.includes('engineer')) {
        suggestions.push('🔧 Include technical terms relevant to the role, but explain complex concepts clearly');
      } else if (roleLower.includes('sales') || roleLower.includes('marketing')) {
        suggestions.push('🎯 Use persuasive, action-oriented language that\'s easy to scan');
      }
    }
    
    // Specific improvement suggestions
    if (analysis.longSentences > 5) {
      suggestions.push(`✂️ You have ${analysis.longSentences} long sentences - break them up for better readability`);
    }
    
    // Add examples of improvements
    if (metrics.fleschReadingEase < 60) {
      suggestions.push('💡 Example improvements:');
      suggestions.push('  Before: "Utilized comprehensive analytical methodologies"');
      suggestions.push('  After: "Used detailed analysis methods"');
    }
    
    return suggestions;
  }

  // Determine target audience suitability
  private determineTargetAudience(gradeLevel: number, targetRole?: string): string {
    let audience = '';
    
    if (gradeLevel <= 8) {
      audience = 'General audience (very accessible)';
    } else if (gradeLevel <= 10) {
      audience = 'High school level (good for most positions)';
    } else if (gradeLevel <= 12) {
      audience = 'High school graduate (ideal for professional roles)';
    } else if (gradeLevel <= 14) {
      audience = 'College level (suitable for technical/professional roles)';
    } else if (gradeLevel <= 16) {
      audience = 'College graduate (appropriate for senior/technical roles)';
    } else {
      audience = 'Graduate level (may be too complex for most readers)';
    }
    
    // Adjust based on target role
    if (targetRole) {
      const roleLower = targetRole.toLowerCase();
      
      if (roleLower.includes('executive') || roleLower.includes('senior')) {
        if (gradeLevel >= 12 && gradeLevel <= 16) {
          audience += ' ✅ Well-suited for executive positions';
        }
      } else if (roleLower.includes('entry') || roleLower.includes('junior')) {
        if (gradeLevel >= 10 && gradeLevel <= 14) {
          audience += ' ✅ Appropriate for entry-level positions';
        }
      }
    }
    
    return audience;
  }

  // Simplify text while maintaining meaning
  async simplifyText(text: string, targetGradeLevel: number = 10): Promise<string> {
    // This would integrate with AI to simplify text
    // For now, we'll return suggestions for manual simplification
    
    const analysis = this.analyzeText(text);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let simplifiedText = text;
    
    // Replace complex words with simpler alternatives
    const replacements = {
      'utilize': 'use',
      'implement': 'set up',
      'facilitate': 'help',
      'demonstrate': 'show',
      'collaborate': 'work with',
      'optimize': 'improve',
      'leverage': 'use',
      'comprehensive': 'complete',
      'methodology': 'method',
      'functionality': 'function'
    };
    
    for (const [complex, simple] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      simplifiedText = simplifiedText.replace(regex, simple);
    }
    
    return simplifiedText;
  }
}