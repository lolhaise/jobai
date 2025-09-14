import { 
  Controller, 
  Post, 
  Get, 
  Put,
  Body, 
  Param, 
  UseGuards,
  Request,
  Query
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ATSScoringService } from '../services/ats-scoring.service';
import { ReadabilityCheckerService } from '../services/readability-checker.service';
import { GrammarValidationService } from '../services/grammar-validation.service';
import { ApprovalWorkflowService } from '../services/approval-workflow.service';

// DTOs
class ATSScoringDto {
  resumeContent: string;
  jobDescription?: string;
}

class ReadabilityCheckDto {
  text: string;
  targetRole?: string;
}

class GrammarCheckDto {
  text: string;
  documentType?: string;
}

class CreateWorkflowDto {
  documentId: string;
  documentType: 'resume' | 'cover_letter';
  originalContent: string;
  modifiedContent: string;
  changes: Array<{
    type: 'addition' | 'deletion' | 'modification' | 'reorder';
    category: string;
    original: string;
    suggested: string;
    reason: string;
    impact: 'high' | 'medium' | 'low';
    position: {
      start: number;
      end: number;
      section?: string;
    };
    confidence: number;
  }>;
}

class ApprovalDecisionDto {
  decisions: Array<{
    changeId: string;
    approved: boolean;
    userNote?: string;
  }>;
  userFeedback?: string;
}

class CompareResumesDto {
  originalContent: string;
  optimizedContent: string;
  jobDescription?: string;
}

class SimplifyTextDto {
  text: string;
  targetGradeLevel?: number;
}

class AutoCorrectDto {
  text: string;
}

class CreateABTestDto {
  documentId: string;
  variants: Array<{
    name: string;
    content: string;
    isControl: boolean;
  }>;
}

class RecordTestResultDto {
  variantId: string;
  approved: boolean;
  timeToDecision: number;
}

@Controller('quality')
export class QualityController {
  constructor(
    private readonly atsService: ATSScoringService,
    private readonly readabilityService: ReadabilityCheckerService,
    private readonly grammarService: GrammarValidationService,
    private readonly workflowService: ApprovalWorkflowService
  ) {}

  // ATS Scoring endpoint
  @Post('ats-score')
  @UseGuards(JwtAuthGuard)
  async scoreResume(@Body() dto: ATSScoringDto) {
    return await this.atsService.scoreResume(
      dto.resumeContent,
      dto.jobDescription
    );
  }

  // Compare two resumes
  @Post('ats-compare')
  @UseGuards(JwtAuthGuard)
  async compareResumes(@Body() dto: CompareResumesDto) {
    return await this.atsService.compareResumes(
      dto.originalContent,
      dto.optimizedContent,
      dto.jobDescription
    );
  }

  // Check readability
  @Post('readability')
  @UseGuards(JwtAuthGuard)
  async checkReadability(@Body() dto: ReadabilityCheckDto) {
    return await this.readabilityService.checkReadability(
      dto.text,
      dto.targetRole
    );
  }

  // Simplify text
  @Post('simplify')
  @UseGuards(JwtAuthGuard)
  async simplifyText(@Body() dto: SimplifyTextDto) {
    return await this.readabilityService.simplifyText(
      dto.text,
      dto.targetGradeLevel || 10
    );
  }

  // Validate grammar
  @Post('grammar')
  @UseGuards(JwtAuthGuard)
  async validateGrammar(@Body() dto: GrammarCheckDto) {
    return await this.grammarService.validateGrammar(
      dto.text,
      dto.documentType || 'resume'
    );
  }

  // Auto-correct grammar
  @Post('auto-correct')
  @UseGuards(JwtAuthGuard)
  async autoCorrect(@Body() dto: AutoCorrectDto) {
    return await this.grammarService.autoCorrect(dto.text);
  }

  // Create approval workflow
  @Post('workflow')
  @UseGuards(JwtAuthGuard)
  async createWorkflow(
    @Request() req: any,
    @Body() dto: CreateWorkflowDto
  ) {
    return await this.workflowService.createWorkflow(
      req.user.id,
      dto.documentId,
      dto.documentType,
      dto.originalContent,
      dto.modifiedContent,
      dto.changes
    );
  }

  // Get workflow by ID
  @Get('workflow/:id')
  @UseGuards(JwtAuthGuard)
  async getWorkflow(@Param('id') id: string) {
    return await this.workflowService.getWorkflow(id);
  }

  // Get user's workflows
  @Get('workflows')
  @UseGuards(JwtAuthGuard)
  async getUserWorkflows(
    @Request() req: any,
    @Query('status') status?: string
  ) {
    return await this.workflowService.getUserWorkflows(req.user.id, status);
  }

  // Submit approval decisions
  @Put('workflow/:id/approve')
  @UseGuards(JwtAuthGuard)
  async submitApprovals(
    @Param('id') id: string,
    @Body() dto: ApprovalDecisionDto
  ) {
    return await this.workflowService.submitApprovals(
      id,
      dto.decisions,
      dto.userFeedback
    );
  }

  // Get workflow analytics
  @Get('workflows/analytics')
  @UseGuards(JwtAuthGuard)
  async getWorkflowAnalytics(@Request() req: any) {
    return await this.workflowService.getWorkflowAnalytics(req.user.id);
  }

  // Create A/B test
  @Post('ab-test')
  @UseGuards(JwtAuthGuard)
  async createABTest(@Body() dto: CreateABTestDto) {
    return await this.workflowService.createABTest(
      dto.documentId,
      dto.variants
    );
  }

  // Get test variant
  @Get('ab-test/:testId/variant')
  @UseGuards(JwtAuthGuard)
  async getTestVariant(@Param('testId') testId: string) {
    return await this.workflowService.getTestVariant(testId);
  }

  // Record test result
  @Post('ab-test/result')
  @UseGuards(JwtAuthGuard)
  async recordTestResult(@Body() dto: RecordTestResultDto) {
    await this.workflowService.recordTestResult(
      dto.variantId,
      dto.approved,
      dto.timeToDecision
    );
    return { success: true };
  }

  // Get test results
  @Get('ab-test/:testId/results')
  @UseGuards(JwtAuthGuard)
  async getTestResults(@Param('testId') testId: string) {
    return await this.workflowService.getTestResults(testId);
  }

  // Combined quality check (ATS + Readability + Grammar)
  @Post('full-check')
  @UseGuards(JwtAuthGuard)
  async fullQualityCheck(@Body() dto: {
    content: string;
    jobDescription?: string;
    targetRole?: string;
    documentType?: string;
  }) {
    const [atsScore, readability, grammar] = await Promise.all([
      this.atsService.scoreResume(dto.content, dto.jobDescription),
      this.readabilityService.checkReadability(dto.content, dto.targetRole),
      this.grammarService.validateGrammar(dto.content, dto.documentType || 'resume')
    ]);
    
    // Calculate combined quality score
    const combinedScore = Math.round(
      atsScore.overallScore * 0.4 +
      readability.overallScore * 0.3 +
      grammar.score * 0.3
    );
    
    return {
      combinedScore,
      passesQuality: combinedScore >= 75,
      ats: atsScore,
      readability,
      grammar,
      topIssues: this.extractTopIssues(atsScore, readability, grammar),
      recommendations: this.generateRecommendations(combinedScore, atsScore, readability, grammar)
    };
  }

  // Extract top issues from all checks
  private extractTopIssues(atsScore: any, readability: any, grammar: any) {
    const allIssues = [
      ...atsScore.issues.map((i: any) => ({ ...i, source: 'ATS' })),
      ...readability.issues.map((i: any) => ({ ...i, source: 'Readability' })),
      ...grammar.errors.map((i: any) => ({ ...i, source: 'Grammar' }))
    ];
    
    // Sort by severity/impact and return top 10
    return allIssues
      .sort((a, b) => {
        const severityOrder = { critical: 0, error: 1, major: 2, warning: 3, minor: 4, info: 5 };
        const impactOrder = { high: 0, medium: 1, low: 2 };
        
        const aSeverity = severityOrder[a.severity || a.type] || 5;
        const bSeverity = severityOrder[b.severity || b.type] || 5;
        const aImpact = impactOrder[a.impact] || 2;
        const bImpact = impactOrder[b.impact] || 2;
        
        if (aSeverity !== bSeverity) return aSeverity - bSeverity;
        return aImpact - bImpact;
      })
      .slice(0, 10);
  }

  // Generate combined recommendations
  private generateRecommendations(
    combinedScore: number,
    atsScore: any,
    readability: any,
    grammar: any
  ) {
    const recommendations: string[] = [];
    
    // Overall assessment
    if (combinedScore >= 85) {
      recommendations.push('✨ Your document is excellent and ready for submission!');
    } else if (combinedScore >= 75) {
      recommendations.push('👍 Your document is good but could benefit from minor improvements.');
    } else if (combinedScore >= 60) {
      recommendations.push('⚠️ Your document needs significant improvements before submission.');
    } else {
      recommendations.push('🚨 Your document requires major revisions to meet quality standards.');
    }
    
    // Specific area recommendations
    if (atsScore.overallScore < 70) {
      recommendations.push('📊 Focus on improving ATS compatibility - add keywords and simplify formatting');
    }
    
    if (readability.overallScore < 70) {
      recommendations.push('📝 Improve readability - use shorter sentences and simpler words');
    }
    
    if (grammar.score < 70) {
      recommendations.push('✏️ Fix grammar issues - run spell check and review sentence structure');
    }
    
    // Add top specific recommendations from each service
    const topRecommendations = [
      ...atsScore.recommendations.slice(0, 2),
      ...readability.suggestions.slice(0, 2),
      ...grammar.suggestions.slice(0, 2).map((s: any) => s.suggestion)
    ];
    
    return [...recommendations, ...topRecommendations];
  }
}