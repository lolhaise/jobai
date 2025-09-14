import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// Interface for grammar check result
interface GrammarCheckResult {
  isValid: boolean;
  score: number; // 0-100
  errors: GrammarError[];
  warnings: GrammarWarning[];
  suggestions: GrammarSuggestion[];
  statistics: {
    totalWords: number;
    totalSentences: number;
    errorsFound: number;
    warningsFound: number;
    spellingErrors: number;
    grammarErrors: number;
    punctuationErrors: number;
    styleIssues: number;
  };
}

// Interface for grammar errors
interface GrammarError {
  type: 'spelling' | 'grammar' | 'punctuation' | 'style';
  severity: 'critical' | 'major' | 'minor';
  text: string;
  position: {
    start: number;
    end: number;
    line?: number;
    column?: number;
  };
  message: string;
  suggestion: string;
  replacements?: string[];
  rule?: string;
}

// Interface for grammar warnings
interface GrammarWarning {
  type: string;
  text: string;
  message: string;
  suggestion?: string;
}

// Interface for improvement suggestions
interface GrammarSuggestion {
  category: string;
  suggestion: string;
  examples?: string[];
  priority: 'high' | 'medium' | 'low';
}

@Injectable()
export class GrammarValidationService {
  private commonMisspellings: Map<string, string>;
  private grammarRules: Map<string, RegExp>;
  
  constructor(private httpService: HttpService) {
    this.initializeCommonMisspellings();
    this.initializeGrammarRules();
  }

  // Initialize common misspellings database
  private initializeCommonMisspellings() {
    this.commonMisspellings = new Map([
      ['recieve', 'receive'],
      ['occured', 'occurred'],
      ['seperate', 'separate'],
      ['definately', 'definitely'],
      ['enviroment', 'environment'],
      ['managment', 'management'],
      ['experiance', 'experience'],
      ['proffesional', 'professional'],
      ['responsibile', 'responsible'],
      ['succesful', 'successful'],
      ['acheive', 'achieve'],
      ['aquire', 'acquire'],
      ['beleive', 'believe'],
      ['calender', 'calendar'],
      ['collegue', 'colleague'],
      ['concious', 'conscious'],
      ['dissapoint', 'disappoint'],
      ['existance', 'existence'],
      ['foriegn', 'foreign'],
      ['fourty', 'forty'],
      ['goverment', 'government'],
      ['harrass', 'harass'],
      ['independant', 'independent'],
      ['knowlege', 'knowledge'],
      ['liason', 'liaison'],
      ['maintainance', 'maintenance'],
      ['neccessary', 'necessary'],
      ['noticable', 'noticeable'],
      ['occassion', 'occasion'],
      ['paralell', 'parallel'],
      ['persistant', 'persistent'],
      ['preceed', 'precede'],
      ['priviledge', 'privilege'],
      ['questionaire', 'questionnaire'],
      ['refered', 'referred'],
      ['relevent', 'relevant'],
      ['supercede', 'supersede'],
      ['tendancy', 'tendency'],
      ['unnecesary', 'unnecessary'],
      ['untill', 'until'],
      ['withold', 'withhold']
    ]);
  }

  // Initialize grammar rules
  private initializeGrammarRules() {
    this.grammarRules = new Map([
      // Subject-verb agreement
      ['singular_plural', /\b(was|were|is|are|has|have)\s+(been)?\s*\w+ing\b/gi],
      
      // Double negatives
      ['double_negative', /\b(not|no|never|neither)\s+\w*\s*(not|no|never|nothing|nowhere)\b/gi],
      
      // Incorrect apostrophes
      ['apostrophe_its', /\bit's\s+\w+\s+(is|was|has)/gi],
      ['apostrophe_plural', /\b\w+s'\s+(?!s)/gi],
      
      // Tense consistency
      ['mixed_tense', /\b(was|were)\s+\w+\s+(is|are)\b/gi],
      
      // Article usage
      ['article_an', /\ba\s+[aeiou]/gi],
      ['article_a', /\ban\s+[^aeiou]/gi],
      
      // Common confusions
      ['their_there', /\bthier\b/gi],
      ['your_youre', /\byou're\s+([\w]+(?:ing|ed|s))\b/gi],
      ['to_too', /\bto\s+(much|many|few|little)\b/gi],
      
      // Redundancy
      ['redundancy', /\b(very\s+unique|most\s+optimal|more\s+better|past\s+history|future\s+plans)\b/gi],
      
      // Sentence fragments
      ['fragment', /^[A-Z][^.!?]*\b(which|because|although|since|when|while|if)\s*$/gm],
      
      // Run-on sentences
      ['run_on', /[^.!?]{150,}/g]
    ]);
  }

  // Main grammar validation function
  async validateGrammar(text: string, documentType: string = 'resume'): Promise<GrammarCheckResult> {
    // Clean text for analysis
    const cleanedText = this.preprocessText(text);
    
    // Perform various checks
    const spellingErrors = this.checkSpelling(cleanedText);
    const grammarErrors = this.checkGrammar(cleanedText);
    const punctuationErrors = this.checkPunctuation(cleanedText);
    const styleIssues = this.checkStyle(cleanedText, documentType);
    
    // Combine all errors
    const allErrors = [
      ...spellingErrors,
      ...grammarErrors,
      ...punctuationErrors,
      ...styleIssues
    ];
    
    // Generate warnings
    const warnings = this.generateWarnings(cleanedText, documentType);
    
    // Generate suggestions
    const suggestions = this.generateGrammarSuggestions(allErrors, warnings, documentType);
    
    // Calculate statistics
    const statistics = this.calculateStatistics(cleanedText, allErrors);
    
    // Calculate overall score
    const score = this.calculateGrammarScore(allErrors, statistics);
    
    return {
      isValid: score >= 70,
      score,
      errors: allErrors,
      warnings,
      suggestions,
      statistics
    };
  }

  // Preprocess text for analysis
  private preprocessText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\t/g, ' ') // Replace tabs with spaces
      .trim();
  }

  // Check spelling errors
  private checkSpelling(text: string): GrammarError[] {
    const errors: GrammarError[] = [];
    const words = text.match(/\b[a-zA-Z]+\b/g) || [];
    
    words.forEach((word, index) => {
      const lowerWord = word.toLowerCase();
      
      // Check common misspellings
      if (this.commonMisspellings.has(lowerWord)) {
        const position = text.indexOf(word);
        errors.push({
          type: 'spelling',
          severity: 'major',
          text: word,
          position: {
            start: position,
            end: position + word.length
          },
          message: `Misspelled word: "${word}"`,
          suggestion: `Replace with "${this.commonMisspellings.get(lowerWord)}"`,
          replacements: [this.commonMisspellings.get(lowerWord)!],
          rule: 'common_misspelling'
        });
      }
      
      // Check for repeated words
      if (index > 0 && words[index - 1].toLowerCase() === lowerWord && 
          !['had', 'that', 'very', 'been'].includes(lowerWord)) {
        const position = text.indexOf(word + ' ' + word);
        if (position !== -1) {
          errors.push({
            type: 'spelling',
            severity: 'minor',
            text: `${word} ${word}`,
            position: {
              start: position,
              end: position + (word.length * 2 + 1)
            },
            message: `Repeated word: "${word}"`,
            suggestion: `Remove duplicate word`,
            replacements: [word],
            rule: 'repeated_word'
          });
        }
      }
    });
    
    return errors;
  }

  // Check grammar errors
  private checkGrammar(text: string): GrammarError[] {
    const errors: GrammarError[] = [];
    
    // Check each grammar rule
    for (const [ruleName, pattern] of this.grammarRules.entries()) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        let message = '';
        let suggestion = '';
        let severity: 'critical' | 'major' | 'minor' = 'major';
        
        switch (ruleName) {
          case 'double_negative':
            message = 'Double negative detected';
            suggestion = 'Use only one negative word in the sentence';
            severity = 'major';
            break;
          
          case 'apostrophe_its':
            message = 'Incorrect use of "it\'s" (should be "its" for possession)';
            suggestion = 'Change "it\'s" to "its"';
            severity = 'major';
            break;
          
          case 'article_an':
            message = 'Use "an" before vowel sounds';
            suggestion = 'Change "a" to "an"';
            severity = 'minor';
            break;
          
          case 'article_a':
            message = 'Use "a" before consonant sounds';
            suggestion = 'Change "an" to "a"';
            severity = 'minor';
            break;
          
          case 'redundancy':
            message = `Redundant phrase: "${match[0]}"`;
            suggestion = 'Remove redundant words';
            severity = 'minor';
            break;
          
          case 'fragment':
            message = 'Possible sentence fragment';
            suggestion = 'Ensure this is a complete sentence';
            severity = 'major';
            break;
          
          case 'run_on':
            message = 'Sentence is too long (possible run-on)';
            suggestion = 'Break into multiple sentences';
            severity = 'major';
            break;
        }
        
        if (message) {
          errors.push({
            type: 'grammar',
            severity,
            text: match[0],
            position: {
              start: match.index!,
              end: match.index! + match[0].length
            },
            message,
            suggestion,
            rule: ruleName
          });
        }
      }
    }
    
    // Additional grammar checks
    
    // Check for missing oxford comma
    const listPattern = /\b(\w+),\s+(\w+)\s+and\s+(\w+)\b/gi;
    const listMatches = Array.from(text.matchAll(listPattern));
    
    for (const match of listMatches) {
      errors.push({
        type: 'punctuation',
        severity: 'minor',
        text: match[0],
        position: {
          start: match.index!,
          end: match.index! + match[0].length
        },
        message: 'Consider using Oxford comma',
        suggestion: `Change to "${match[1]}, ${match[2]}, and ${match[3]}"`,
        replacements: [`${match[1]}, ${match[2]}, and ${match[3]}`],
        rule: 'oxford_comma'
      });
    }
    
    return errors;
  }

  // Check punctuation errors
  private checkPunctuation(text: string): GrammarError[] {
    const errors: GrammarError[] = [];
    
    // Check for missing periods
    const sentences = text.split('\n');
    sentences.forEach((sentence, lineNum) => {
      const trimmed = sentence.trim();
      if (trimmed.length > 20 && 
          !trimmed.endsWith('.') && 
          !trimmed.endsWith('!') && 
          !trimmed.endsWith('?') &&
          !trimmed.endsWith(':') &&
          !trimmed.match(/^[•\-\*]/)) { // Not a bullet point
        
        errors.push({
          type: 'punctuation',
          severity: 'major',
          text: trimmed.substring(Math.max(0, trimmed.length - 20)),
          position: {
            start: text.indexOf(trimmed) + trimmed.length - 1,
            end: text.indexOf(trimmed) + trimmed.length,
            line: lineNum + 1
          },
          message: 'Missing punctuation at end of sentence',
          suggestion: 'Add a period at the end',
          rule: 'missing_period'
        });
      }
    });
    
    // Check for multiple punctuation
    const multiPunctPattern = /[.!?]{2,}/g;
    const multiPunct = Array.from(text.matchAll(multiPunctPattern));
    
    for (const match of multiPunct) {
      errors.push({
        type: 'punctuation',
        severity: 'minor',
        text: match[0],
        position: {
          start: match.index!,
          end: match.index! + match[0].length
        },
        message: 'Multiple punctuation marks',
        suggestion: 'Use only one punctuation mark',
        replacements: [match[0][0]],
        rule: 'multiple_punctuation'
      });
    }
    
    // Check for incorrect comma usage
    const commaErrors = [
      // Comma splice
      {
        pattern: /,\s+[a-z]/g,
        message: 'Possible comma splice',
        suggestion: 'Consider using a semicolon or period'
      },
      // Missing comma after introductory phrase
      {
        pattern: /^(However|Therefore|Moreover|Furthermore|Additionally|Finally|First|Second|Third)\s+[^,]/gm,
        message: 'Missing comma after introductory word',
        suggestion: 'Add comma after the introductory word'
      }
    ];
    
    for (const { pattern, message, suggestion } of commaErrors) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        errors.push({
          type: 'punctuation',
          severity: 'minor',
          text: match[0],
          position: {
            start: match.index!,
            end: match.index! + match[0].length
          },
          message,
          suggestion,
          rule: 'comma_usage'
        });
      }
    }
    
    return errors;
  }

  // Check style issues
  private checkStyle(text: string, documentType: string): GrammarError[] {
    const errors: GrammarError[] = [];
    
    // Check for informal language in professional documents
    if (documentType === 'resume' || documentType === 'cover_letter') {
      const informalWords = [
        'awesome', 'cool', 'stuff', 'things', 'gotten', 'gonna', 'wanna',
        'kinda', 'sorta', 'yeah', 'yep', 'nope', 'ok', 'okay'
      ];
      
      for (const word of informalWords) {
        const pattern = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = Array.from(text.matchAll(pattern));
        
        for (const match of matches) {
          errors.push({
            type: 'style',
            severity: 'minor',
            text: match[0],
            position: {
              start: match.index!,
              end: match.index! + match[0].length
            },
            message: `Informal language: "${match[0]}"`,
            suggestion: 'Use more professional language',
            rule: 'informal_language'
          });
        }
      }
    }
    
    // Check for clichés
    const cliches = [
      'think outside the box',
      'go the extra mile',
      'team player',
      'hard worker',
      'results-driven',
      'self-motivated',
      'detail-oriented',
      'excellent communication skills'
    ];
    
    for (const cliche of cliches) {
      if (text.toLowerCase().includes(cliche)) {
        const index = text.toLowerCase().indexOf(cliche);
        errors.push({
          type: 'style',
          severity: 'minor',
          text: cliche,
          position: {
            start: index,
            end: index + cliche.length
          },
          message: `Overused phrase: "${cliche}"`,
          suggestion: 'Use more specific, unique language',
          rule: 'cliche'
        });
      }
    }
    
    // Check for weak verbs
    const weakVerbs = {
      'did': 'accomplished',
      'made': 'created',
      'got': 'obtained',
      'had': 'possessed',
      'was responsible for': 'managed',
      'helped': 'assisted'
    };
    
    for (const [weak, strong] of Object.entries(weakVerbs)) {
      const pattern = new RegExp(`\\b${weak}\\b`, 'gi');
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        errors.push({
          type: 'style',
          severity: 'minor',
          text: match[0],
          position: {
            start: match.index!,
            end: match.index! + match[0].length
          },
          message: `Weak verb: "${match[0]}"`,
          suggestion: `Consider using "${strong}" or similar`,
          replacements: [strong],
          rule: 'weak_verb'
        });
      }
    }
    
    return errors;
  }

  // Generate warnings
  private generateWarnings(text: string, documentType: string): GrammarWarning[] {
    const warnings: GrammarWarning[] = [];
    
    // Check for inconsistent formatting
    const hasSerialComma = text.includes(', and');
    const hasNoSerialComma = /\w+\s+and\s+\w+/.test(text);
    
    if (hasSerialComma && hasNoSerialComma) {
      warnings.push({
        type: 'consistency',
        text: 'Inconsistent comma usage',
        message: 'Be consistent with Oxford comma usage throughout',
        suggestion: 'Choose to always use or never use the Oxford comma'
      });
    }
    
    // Check for tense consistency
    const pastTense = /\b(was|were|had|did|worked|managed|led)\b/gi;
    const presentTense = /\b(is|are|have|do|work|manage|lead)\b/gi;
    
    const pastMatches = text.match(pastTense)?.length || 0;
    const presentMatches = text.match(presentTense)?.length || 0;
    
    if (pastMatches > 5 && presentMatches > 5) {
      warnings.push({
        type: 'consistency',
        text: 'Mixed tenses detected',
        message: 'Maintain consistent tense throughout the document',
        suggestion: 'Use past tense for previous roles, present for current'
      });
    }
    
    // Document-specific warnings
    if (documentType === 'resume') {
      // Check for first person pronouns
      if (/\b(I|me|my|myself)\b/i.test(text)) {
        warnings.push({
          type: 'style',
          text: 'First person pronouns',
          message: 'Avoid using "I", "me", "my" in resumes',
          suggestion: 'Start bullet points with action verbs instead'
        });
      }
      
      // Check for objective statements (outdated)
      if (/\bobjective:?\s/i.test(text)) {
        warnings.push({
          type: 'style',
          text: 'Objective section',
          message: 'Objective sections are outdated',
          suggestion: 'Replace with a professional summary'
        });
      }
    }
    
    return warnings;
  }

  // Generate grammar suggestions
  private generateGrammarSuggestions(
    errors: GrammarError[],
    warnings: GrammarWarning[],
    documentType: string
  ): GrammarSuggestion[] {
    const suggestions: GrammarSuggestion[] = [];
    
    // Analyze error patterns
    const errorTypes = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Spelling suggestions
    if (errorTypes.spelling > 3) {
      suggestions.push({
        category: 'spelling',
        suggestion: 'Run a spell checker before finalizing',
        priority: 'high',
        examples: ['Use tools like Grammarly or built-in spell check']
      });
    }
    
    // Grammar suggestions
    if (errorTypes.grammar > 2) {
      suggestions.push({
        category: 'grammar',
        suggestion: 'Review subject-verb agreement and tense consistency',
        priority: 'high',
        examples: [
          'Was → Were (plural subjects)',
          'Have → Has (singular subjects)'
        ]
      });
    }
    
    // Style suggestions for resumes
    if (documentType === 'resume') {
      suggestions.push({
        category: 'style',
        suggestion: 'Start bullet points with strong action verbs',
        priority: 'medium',
        examples: [
          'Managed a team of 10 engineers',
          'Increased revenue by 25%',
          'Developed new customer acquisition strategy'
        ]
      });
      
      suggestions.push({
        category: 'style',
        suggestion: 'Quantify achievements where possible',
        priority: 'high',
        examples: [
          'Reduced costs by $50K annually',
          'Improved efficiency by 30%',
          'Led team of 15 developers'
        ]
      });
    }
    
    // Readability suggestions
    const longSentences = errors.filter(e => e.rule === 'run_on').length;
    if (longSentences > 0) {
      suggestions.push({
        category: 'readability',
        suggestion: 'Break long sentences into shorter, clearer statements',
        priority: 'medium',
        examples: [
          'Before: Managed multiple projects simultaneously while coordinating with cross-functional teams and stakeholders to ensure timely delivery.',
          'After: Managed multiple projects simultaneously. Coordinated with cross-functional teams and stakeholders. Ensured timely delivery of all projects.'
        ]
      });
    }
    
    // Consistency suggestions based on warnings
    const consistencyWarnings = warnings.filter(w => w.type === 'consistency');
    if (consistencyWarnings.length > 0) {
      suggestions.push({
        category: 'consistency',
        suggestion: 'Maintain consistent formatting and style throughout',
        priority: 'medium',
        examples: [
          'Use the same date format everywhere',
          'Be consistent with abbreviations',
          'Maintain consistent bullet point style'
        ]
      });
    }
    
    return suggestions;
  }

  // Calculate statistics
  private calculateStatistics(text: string, errors: GrammarError[]) {
    const words = text.match(/\b\w+\b/g) || [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return {
      totalWords: words.length,
      totalSentences: sentences.length,
      errorsFound: errors.length,
      warningsFound: errors.filter(e => e.severity === 'minor').length,
      spellingErrors: errors.filter(e => e.type === 'spelling').length,
      grammarErrors: errors.filter(e => e.type === 'grammar').length,
      punctuationErrors: errors.filter(e => e.type === 'punctuation').length,
      styleIssues: errors.filter(e => e.type === 'style').length
    };
  }

  // Calculate grammar score
  private calculateGrammarScore(errors: GrammarError[], statistics: any): number {
    let score = 100;
    
    // Deduct points based on error severity
    for (const error of errors) {
      switch (error.severity) {
        case 'critical':
          score -= 10;
          break;
        case 'major':
          score -= 5;
          break;
        case 'minor':
          score -= 2;
          break;
      }
    }
    
    // Bonus points for good practices
    if (statistics.totalWords > 100 && statistics.spellingErrors === 0) {
      score += 5; // Bonus for no spelling errors
    }
    
    if (statistics.grammarErrors === 0) {
      score += 5; // Bonus for perfect grammar
    }
    
    // Error density penalty
    const errorDensity = errors.length / Math.max(1, statistics.totalWords / 100);
    if (errorDensity > 5) {
      score -= 10; // Too many errors per 100 words
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // Auto-correct common issues
  async autoCorrect(text: string): Promise<{
    correctedText: string;
    changes: Array<{ original: string; corrected: string; position: number }>;
  }> {
    let correctedText = text;
    const changes: Array<{ original: string; corrected: string; position: number }> = [];
    
    // Fix common misspellings
    for (const [wrong, right] of this.commonMisspellings.entries()) {
      const pattern = new RegExp(`\\b${wrong}\\b`, 'gi');
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        changes.push({
          original: match[0],
          corrected: right,
          position: match.index!
        });
      }
      
      correctedText = correctedText.replace(pattern, right);
    }
    
    // Fix common grammar issues
    
    // Fix "a" vs "an"
    correctedText = correctedText.replace(/\ba\s+([aeiou])/gi, 'an $1');
    correctedText = correctedText.replace(/\ban\s+([^aeiou\s])/gi, 'a $1');
    
    // Fix double spaces
    correctedText = correctedText.replace(/\s{2,}/g, ' ');
    
    // Fix missing space after punctuation
    correctedText = correctedText.replace(/([.!?])([A-Z])/g, '$1 $2');
    
    // Fix repeated words
    correctedText = correctedText.replace(/\b(\w+)\s+\1\b/gi, '$1');
    
    return {
      correctedText,
      changes
    };
  }
}