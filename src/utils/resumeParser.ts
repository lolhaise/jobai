interface ParsedResume {
  fullText: string;
  sections: {
    contact?: string;
    summary?: string;
    experience?: string[];
    education?: string[];
    skills?: string[];
    certifications?: string[];
    projects?: string[];
  };
  metadata: {
    wordCount: number;
    lineCount: number;
    hasEmail: boolean;
    hasPhone: boolean;
    hasLinkedIn: boolean;
    hasGitHub: boolean;
  };
}

export class ResumeParser {
  private sectionHeaders = {
    contact: /^(contact|personal information|details)/i,
    summary: /^(summary|objective|profile|about me|professional summary)/i,
    experience: /^(experience|employment|work history|professional experience|career)/i,
    education: /^(education|academic|qualifications|degrees)/i,
    skills: /^(skills|competencies|technical skills|expertise|technologies)/i,
    certifications: /^(certifications|certificates|licenses|credentials)/i,
    projects: /^(projects|portfolio|achievements|accomplishments)/i
  };

  parseResume(resumeText: string): ParsedResume {
    const lines = resumeText.split('\n');
    const sections = this.extractSections(lines);
    const metadata = this.extractMetadata(resumeText);

    return {
      fullText: resumeText,
      sections,
      metadata
    };
  }

  private extractSections(lines: string[]): ParsedResume['sections'] {
    const sections: ParsedResume['sections'] = {};
    let currentSection: keyof ParsedResume['sections'] | null = null;
    let sectionContent: string[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Check if line is a section header
      const newSection = this.identifySection(trimmedLine);
      
      if (newSection) {
        // Save previous section content
        if (currentSection && sectionContent.length > 0) {
          this.saveSectionContent(sections, currentSection, sectionContent);
        }
        
        currentSection = newSection;
        sectionContent = [];
      } else if (currentSection && trimmedLine) {
        sectionContent.push(trimmedLine);
      } else if (index < 5 && !currentSection) {
        // First few lines might be contact info
        if (!sections.contact) {
          sections.contact = trimmedLine;
        } else {
          sections.contact += '\n' + trimmedLine;
        }
      }
    });

    // Save last section
    if (currentSection && sectionContent.length > 0) {
      this.saveSectionContent(sections, currentSection, sectionContent);
    }

    return sections;
  }

  private identifySection(line: string): keyof ParsedResume['sections'] | null {
    for (const [section, pattern] of Object.entries(this.sectionHeaders)) {
      if (pattern.test(line)) {
        return section as keyof ParsedResume['sections'];
      }
    }
    return null;
  }

  private saveSectionContent(
    sections: ParsedResume['sections'],
    sectionName: keyof ParsedResume['sections'],
    content: string[]
  ): void {
    if (sectionName === 'experience' || 
        sectionName === 'education' || 
        sectionName === 'skills' || 
        sectionName === 'certifications' || 
        sectionName === 'projects') {
      sections[sectionName] = this.parseListSection(content);
    } else {
      sections[sectionName] = content.join('\n');
    }
  }

  private parseListSection(content: string[]): string[] {
    const items: string[] = [];
    let currentItem = '';

    content.forEach(line => {
      // Check if line starts a new item (bullet point, number, or date)
      if (this.isNewItem(line)) {
        if (currentItem) {
          items.push(currentItem);
        }
        currentItem = line;
      } else {
        currentItem += ' ' + line;
      }
    });

    if (currentItem) {
      items.push(currentItem);
    }

    return items;
  }

  private isNewItem(line: string): boolean {
    // Check for bullet points, numbers, or date patterns
    const patterns = [
      /^[\-\*\•]\s+/,           // Bullet points
      /^\d+\.\s+/,              // Numbered lists
      /^\d{4}/,                 // Years (for experience/education)
      /^[A-Z][a-z]+\s+\d{4}/   // Month Year format
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  private extractMetadata(resumeText: string): ParsedResume['metadata'] {
    const words = resumeText.split(/\s+/);
    const lines = resumeText.split('\n');
    
    return {
      wordCount: words.length,
      lineCount: lines.length,
      hasEmail: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(resumeText),
      hasPhone: /[\d\s\-\(\)\+]{10,}/.test(resumeText),
      hasLinkedIn: /linkedin\.com\/in\/[a-zA-Z0-9\-]+/i.test(resumeText),
      hasGitHub: /github\.com\/[a-zA-Z0-9\-]+/i.test(resumeText)
    };
  }

  extractContactInfo(resumeText: string): {
    email?: string;
    phone?: string;
    linkedIn?: string;
    github?: string;
    name?: string;
  } {
    const contact: any = {};
    
    // Extract email
    const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      contact.email = emailMatch[0];
    }
    
    // Extract phone
    const phoneMatch = resumeText.match(/[\d\s\-\(\)\+]{10,}/);
    if (phoneMatch) {
      contact.phone = phoneMatch[0].trim();
    }
    
    // Extract LinkedIn
    const linkedInMatch = resumeText.match(/linkedin\.com\/in\/([a-zA-Z0-9\-]+)/i);
    if (linkedInMatch) {
      contact.linkedIn = `https://linkedin.com/in/${linkedInMatch[1]}`;
    }
    
    // Extract GitHub
    const githubMatch = resumeText.match(/github\.com\/([a-zA-Z0-9\-]+)/i);
    if (githubMatch) {
      contact.github = `https://github.com/${githubMatch[1]}`;
    }
    
    // Try to extract name (usually in first few lines)
    const lines = resumeText.split('\n').slice(0, 5);
    for (const line of lines) {
      const trimmed = line.trim();
      // Look for lines that might be names (2-4 words, title case)
      if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,3}$/.test(trimmed)) {
        contact.name = trimmed;
        break;
      }
    }
    
    return contact;
  }

  extractExperienceYears(resumeText: string): number {
    const yearMatches = resumeText.match(/\b(19|20)\d{2}\b/g);
    
    if (yearMatches && yearMatches.length >= 2) {
      const years = yearMatches.map(y => parseInt(y)).sort();
      const earliestYear = years[0];
      const currentYear = new Date().getFullYear();
      
      return Math.min(currentYear - earliestYear, 50); // Cap at 50 years
    }
    
    // Look for explicit experience mentions
    const expMatch = resumeText.match(/(\d+)\+?\s*years?\s*(of\s*)?experience/i);
    if (expMatch) {
      return parseInt(expMatch[1]);
    }
    
    return 0;
  }

  extractEducation(resumeText: string): Array<{
    degree?: string;
    field?: string;
    institution?: string;
    year?: string;
  }> {
    const education: Array<any> = [];
    const educationSection = this.findSection(resumeText, 'education');
    
    if (educationSection) {
      const degreePatterns = [
        /Bachelor'?s?\s+(?:of\s+)?([\w\s]+)/i,
        /Master'?s?\s+(?:of\s+)?([\w\s]+)/i,
        /PhD\s+(?:in\s+)?([\w\s]+)/i,
        /B\.[A-Z]\.\s+(?:in\s+)?([\w\s]+)/i,
        /M\.[A-Z]\.\s+(?:in\s+)?([\w\s]+)/i
      ];
      
      degreePatterns.forEach(pattern => {
        const matches = educationSection.match(pattern);
        if (matches) {
          education.push({
            degree: matches[0],
            field: matches[1]?.trim()
          });
        }
      });
    }
    
    return education;
  }

  private findSection(text: string, sectionName: string): string | null {
    const pattern = new RegExp(
      `(${sectionName}|${sectionName.toUpperCase()})[\\s\\S]{0,1000}`,
      'i'
    );
    const match = text.match(pattern);
    return match ? match[0] : null;
  }

  extractSkillsDetailed(resumeText: string): {
    technical: string[];
    soft: string[];
    languages: string[];
    frameworks: string[];
    tools: string[];
  } {
    const skills = {
      technical: [] as string[],
      soft: [] as string[],
      languages: [] as string[],
      frameworks: [] as string[],
      tools: [] as string[]
    };
    
    const normalizedText = resumeText.toLowerCase();
    
    // Programming languages
    const programmingLanguages = [
      'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust',
      'typescript', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab'
    ];
    
    programmingLanguages.forEach(lang => {
      if (normalizedText.includes(lang)) {
        skills.languages.push(lang);
      }
    });
    
    // Frameworks
    const frameworks = [
      'react', 'angular', 'vue', 'django', 'flask', 'spring', 'express',
      'rails', 'laravel', '.net', 'tensorflow', 'pytorch', 'nextjs'
    ];
    
    frameworks.forEach(framework => {
      if (normalizedText.includes(framework)) {
        skills.frameworks.push(framework);
      }
    });
    
    // Tools
    const tools = [
      'git', 'docker', 'kubernetes', 'jenkins', 'aws', 'azure', 'gcp',
      'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'jira'
    ];
    
    tools.forEach(tool => {
      if (normalizedText.includes(tool)) {
        skills.tools.push(tool);
      }
    });
    
    // Soft skills
    const softSkills = [
      'leadership', 'communication', 'teamwork', 'problem solving',
      'critical thinking', 'creativity', 'adaptability', 'time management'
    ];
    
    softSkills.forEach(skill => {
      if (normalizedText.includes(skill)) {
        skills.soft.push(skill);
      }
    });
    
    // General technical skills
    skills.technical = [
      ...skills.languages,
      ...skills.frameworks,
      ...skills.tools
    ];
    
    return skills;
  }
}