# Resume Parser Agent

## Purpose
Specialized agent for parsing various resume formats, extracting structured data, handling edge cases, and validating information accuracy.

## Capabilities
- Parses multiple file formats (PDF, DOCX, TXT, RTF, HTML)
- Extracts structured data with high accuracy
- Handles various resume layouts and templates
- Validates extracted information
- Detects and corrects common parsing errors
- Enriches data with additional context
- Maintains parsing confidence scores
- Handles multilingual resumes

## Core Functions

### 1. Multi-Format Parser
```typescript
interface ResumeParser {
  supportedFormats: ['pdf', 'docx', 'txt', 'rtf', 'html'];
  
  async parse(file: Buffer, format: string): Promise<ParsedResume> {
    switch(format) {
      case 'pdf': return this.parsePDF(file);
      case 'docx': return this.parseDOCX(file);
      case 'txt': return this.parseTXT(file);
      default: return this.parseWithFallback(file);
    }
  }
}
```

### 2. Structured Data Extraction
```typescript
interface ParsedResume {
  // Personal Information
  personal: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  
  // Professional Summary
  summary?: string;
  
  // Work Experience
  experience: Array<{
    company: string;
    title: string;
    startDate: Date;
    endDate?: Date;
    current: boolean;
    description: string;
    achievements: string[];
    technologies?: string[];
  }>;
  
  // Education
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
    startDate?: Date;
    endDate?: Date;
    gpa?: number;
  }>;
  
  // Skills
  skills: {
    technical: string[];
    soft: string[];
    languages: Array<{
      name: string;
      proficiency: string;
    }>;
  };
  
  // Certifications
  certifications: Array<{
    name: string;
    issuer: string;
    date?: Date;
    expiry?: Date;
    credentialId?: string;
  }>;
  
  // Projects
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
    role?: string;
  }>;
  
  // Metadata
  metadata: {
    parseConfidence: number;  // 0-100
    detectedFormat: string;
    pageCount: number;
    wordCount: number;
    parseWarnings: string[];
  };
}
```

### 3. Parsing Strategies

#### PDF Parsing
```typescript
class PDFParser {
  async parse(buffer: Buffer) {
    // Try multiple extraction methods
    const methods = [
      this.extractWithPDFJS,      // JavaScript PDF parser
      this.extractWithTesseract,   // OCR for scanned PDFs
      this.extractWithPopplerUtils // Command line tools
    ];
    
    for (const method of methods) {
      try {
        const result = await method(buffer);
        if (result.confidence > 0.7) return result;
      } catch (error) {
        continue;
      }
    }
  }
}
```

#### Pattern Recognition
```typescript
const patterns = {
  email: /[\w._%+-]+@[\w.-]+\.[A-Z|a-z]{2,}/gi,
  phone: /[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/g,
  linkedin: /linkedin\.com\/in\/[\w-]+/gi,
  github: /github\.com\/[\w-]+/gi,
  
  // Date patterns
  dateRange: /(\w+\s+\d{4})\s*[-–]\s*(\w+\s+\d{4}|Present|Current)/gi,
  
  // Section headers
  sections: {
    experience: /^(work\s+)?experience|employment|career|professional\s+background/i,
    education: /^education|academic|qualification|degree/i,
    skills: /^skills|expertise|competencies|technologies/i,
    projects: /^projects|portfolio/i,
    certifications: /^certifications?|licenses?|credentials?/i
  }
};
```

### 4. Edge Case Handling

#### Common Issues & Solutions
1. **Multi-column layouts**
   - Detect column boundaries
   - Read in correct order
   - Merge related content

2. **Scanned/Image PDFs**
   - Apply OCR preprocessing
   - Enhance image quality
   - Correct OCR errors

3. **Non-standard sections**
   - Publications
   - Awards
   - Volunteer work
   - Speaking engagements

4. **International formats**
   - European date formats
   - Non-US phone numbers
   - Various address formats

5. **ATS-unfriendly elements**
   - Tables
   - Graphics
   - Headers/footers
   - Text boxes

## Implementation Tasks

### Setup Phase
1. Install parsing libraries
   - pdf-parse for PDFs
   - mammoth for DOCX
   - node-tesseract-ocr for OCR
2. Create parsing pipeline
3. Set up validation rules
4. Build error recovery system
5. Create test dataset
6. Implement confidence scoring

### Parsing Pipeline
```typescript
class ResumePipeline {
  async process(file: Buffer) {
    // 1. Detect file format
    const format = await this.detectFormat(file);
    
    // 2. Extract raw text
    const rawText = await this.extractText(file, format);
    
    // 3. Segment into sections
    const sections = await this.segmentSections(rawText);
    
    // 4. Parse each section
    const parsed = await this.parseSections(sections);
    
    // 5. Validate and clean
    const validated = await this.validate(parsed);
    
    // 6. Calculate confidence
    const confidence = await this.calculateConfidence(validated);
    
    // 7. Enrich with additional data
    const enriched = await this.enrich(validated);
    
    return enriched;
  }
}
```

### Validation Rules
```typescript
class ResumeValidator {
  rules = {
    email: (email: string) => isValidEmail(email),
    phone: (phone: string) => isValidPhone(phone),
    dates: (start: Date, end?: Date) => !end || start <= end,
    experience: (exp: Experience[]) => exp.length > 0,
    requiredFields: ['name', 'email'],
    
    // Sanity checks
    maxExperienceYears: 50,
    minAge: 16,
    maxEducationEntries: 10,
    maxSkills: 100
  };
}
```

## Error Recovery
```typescript
class ErrorRecovery {
  strategies = {
    MISSING_NAME: () => this.extractFromEmail(),
    INVALID_DATES: () => this.inferFromContext(),
    GARBLED_TEXT: () => this.applyOCRCorrection(),
    MISSING_SECTIONS: () => this.useAlternativePatterns(),
    LOW_CONFIDENCE: () => this.requestManualReview()
  };
}
```

## Testing Data
- 100+ resume samples in various formats
- Edge cases collection
- International resume formats
- ATS-friendly and unfriendly samples
- Various industries and roles

## Configuration
```yaml
parser:
  confidence:
    minimum: 0.7
    target: 0.9
  
  ocr:
    enabled: true
    language: eng
    dpi: 300
  
  validation:
    strict: false
    requireEmail: true
    requirePhone: false
  
  enrichment:
    skillsDatabase: true
    companyDatabase: true
    locationGeocoding: true
```

## Usage Example
```typescript
// Agent handles all parsing complexity
const parsed = await resumeParserAgent.parse({
  file: resumeBuffer,
  format: 'pdf',
  options: {
    ocr: true,
    validate: true,
    enrich: true
  }
});

// Manual correction if needed
if (parsed.confidence < 0.8) {
  const corrected = await resumeParserAgent.requestCorrection(parsed);
}
```

## Success Metrics
- Parse accuracy > 95%
- Processing time < 3 seconds
- OCR success rate > 85%
- Format support coverage 100%
- Error recovery rate > 90%