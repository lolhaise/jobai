# AI Prompt Agent

## Purpose
Specialized agent for optimizing AI prompts, managing token usage, handling API failures, and ensuring high-quality resume tailoring and content generation.

## Capabilities
- Designs and optimizes prompts for resume tailoring
- Manages token usage and costs
- Handles API failures with fallback strategies
- A/B tests prompt variations
- Maintains prompt templates library
- Tracks prompt performance metrics
- Implements response validation
- Manages multiple AI providers (OpenAI, Anthropic)

## Core Functions

### 1. Prompt Template System
```typescript
interface PromptTemplate {
  id: string;
  name: string;
  category: 'resume' | 'cover_letter' | 'skills' | 'summary';
  template: string;
  variables: string[];
  maxTokens: number;
  temperature: number;
  model: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3';
  fallbackModel?: string;
  validationRules: ValidationRule[];
  performance: {
    avgTokens: number;
    successRate: number;
    avgScore: number;
  };
}
```

### 2. Core Prompt Templates

#### Resume Tailoring Prompt
```typescript
const resumeTailoringPrompt = `
You are an expert resume optimizer specializing in ATS systems and job matching.

RESUME:
{resume_content}

JOB DESCRIPTION:
{job_description}

INSTRUCTIONS:
1. Analyze the job requirements and identify key skills/keywords
2. Reorder resume sections by relevance (most relevant first)
3. Rewrite bullet points using exact keywords from the job description
4. Ensure all claims are truthful - only reorganize existing content
5. Optimize for ATS scanning while maintaining readability
6. Highlight quantifiable achievements that match job requirements

OUTPUT FORMAT:
{
  "optimizedResume": {
    "summary": "tailored professional summary",
    "experience": [reorganized and optimized experience entries],
    "skills": [prioritized skills matching job],
    "keywords": ["extracted", "job", "keywords"],
    "atsScore": 0-100,
    "changes": ["list of modifications made"]
  }
}

CONSTRAINTS:
- Never add skills or experience not present in original
- Maintain professional tone
- Keep under 2 pages
- Use action verbs
- Include metrics where available
`;
```

#### Cover Letter Generation
```typescript
const coverLetterPrompt = `
Generate a compelling cover letter that connects the candidate's experience to the job requirements.

CANDIDATE PROFILE:
{candidate_summary}

JOB DETAILS:
Company: {company_name}
Position: {job_title}
Requirements: {job_requirements}

TONE: Professional yet personable
LENGTH: 250-350 words
FORMAT: 3-4 paragraphs

Focus on:
1. Specific achievements that match job needs
2. Cultural fit and enthusiasm
3. Unique value proposition
4. Clear call to action
`;
```

### 3. Token Management
```typescript
class TokenManager {
  private limits = {
    'gpt-4': { rateLimit: 10000, costPerToken: 0.00003 },
    'gpt-3.5-turbo': { rateLimit: 90000, costPerToken: 0.000002 },
    'claude-3': { rateLimit: 20000, costPerToken: 0.00002 }
  };
  
  async optimizeTokenUsage(prompt: string, maxTokens: number) {
    // Compress prompt while maintaining quality
    const compressed = await this.compressPrompt(prompt);
    
    // Select most cost-effective model
    const model = this.selectOptimalModel(compressed.length, maxTokens);
    
    // Track usage for billing
    await this.trackUsage(model, compressed.length + maxTokens);
    
    return { prompt: compressed, model };
  }
}
```

### 4. Failure Handling
```typescript
class AIFailureHandler {
  strategies = {
    RATE_LIMIT: async () => {
      await this.wait(60000);  // Wait 1 minute
      return this.retry();
    },
    
    TIMEOUT: async () => {
      return this.switchToFallbackModel();
    },
    
    INVALID_RESPONSE: async () => {
      return this.regenerateWithStricterPrompt();
    },
    
    API_ERROR: async () => {
      return this.useAlternativeProvider();
    },
    
    CONTENT_FILTER: async () => {
      return this.sanitizeAndRetry();
    }
  };
  
  async handleFailure(error: AIError, context: any) {
    const strategy = this.strategies[error.type];
    return strategy ? await strategy() : this.useDefaultFallback();
  }
}
```

### 5. Response Validation
```typescript
class ResponseValidator {
  validate(response: any, template: PromptTemplate) {
    const checks = [
      this.checkFormat(response),
      this.checkCompleteness(response),
      this.checkQuality(response),
      this.checkTruthfulness(response),
      this.checkLength(response)
    ];
    
    const results = checks.map(check => check.execute());
    const score = results.filter(r => r.passed).length / results.length;
    
    return {
      valid: score >= 0.8,
      score,
      issues: results.filter(r => !r.passed).map(r => r.issue)
    };
  }
}
```

## Implementation Tasks

### Setup Phase
1. Configure OpenAI API client
2. Configure Anthropic Claude API
3. Create prompt template library
4. Set up token tracking system
5. Implement response caching
6. Build validation framework

### Prompt Engineering Process
1. **Research Phase**
   - Analyze successful resume samples
   - Study ATS algorithms
   - Review hiring manager preferences

2. **Design Phase**
   - Create initial prompt templates
   - Define output formats
   - Set validation criteria

3. **Testing Phase**
   - A/B test variations
   - Measure success rates
   - Optimize for quality/cost

4. **Production Phase**
   - Deploy best performers
   - Monitor performance
   - Continuous optimization

### Cost Optimization
```typescript
class CostOptimizer {
  strategies = {
    // Use cheaper models for simple tasks
    routeByComplexity: (task: Task) => {
      if (task.complexity < 3) return 'gpt-3.5-turbo';
      if (task.complexity < 7) return 'gpt-4';
      return 'claude-3';
    },
    
    // Cache common responses
    cacheResponses: async (prompt: string) => {
      const cached = await cache.get(hash(prompt));
      if (cached) return cached;
    },
    
    // Batch similar requests
    batchRequests: (requests: Request[]) => {
      return requests.reduce((batches, req) => {
        const batch = batches.find(b => b.canAdd(req));
        if (batch) batch.add(req);
        else batches.push(new Batch(req));
        return batches;
      }, []);
    }
  };
}
```

## Monitoring & Analytics
```typescript
interface PromptAnalytics {
  promptId: string;
  executionCount: number;
  avgTokensUsed: number;
  avgResponseTime: number;
  successRate: number;
  avgQualityScore: number;
  totalCost: number;
  userSatisfaction: number;
  conversionRate: number;  // Led to interview
}
```

## A/B Testing Framework
```typescript
class PromptABTester {
  async test(variants: PromptTemplate[]) {
    const results = await Promise.all(
      variants.map(v => this.runVariant(v, 100))
    );
    
    return {
      winner: results.sort((a, b) => b.score - a.score)[0],
      confidence: this.calculateStatisticalSignificance(results)
    };
  }
}
```

## Configuration
```yaml
ai:
  providers:
    openai:
      apiKey: ${OPENAI_API_KEY}
      defaultModel: gpt-4
      maxRetries: 3
      timeout: 30000
    
    anthropic:
      apiKey: ${ANTHROPIC_API_KEY}
      defaultModel: claude-3-sonnet
      maxRetries: 2
      timeout: 45000
  
  tokens:
    maxPerRequest: 4000
    maxPerUser: 100000  # per month
    warningThreshold: 80000
  
  caching:
    enabled: true
    ttl: 86400  # 24 hours
    maxSize: 1000
  
  quality:
    minScore: 0.8
    requireValidation: true
    humanReviewThreshold: 0.7
```

## Usage Example
```typescript
// Agent handles all AI complexity
const tailored = await aiPromptAgent.tailorResume({
  resume: userResume,
  job: jobDescription,
  options: {
    model: 'auto',  // Agent selects best model
    maxTokens: 2000,
    validateResponse: true,
    cacheResult: true
  }
});

// Generate cover letter with fallback
const coverLetter = await aiPromptAgent.generateCoverLetter({
  profile: userProfile,
  job: jobDetails,
  fallbackOnFailure: true
});
```

## Success Metrics
- Average quality score > 85%
- API success rate > 99%
- Average response time < 5 seconds
- Cost per resume < $0.20
- User satisfaction > 90%