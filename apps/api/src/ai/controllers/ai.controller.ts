import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResumeTailoringService } from '../services/resume-tailoring.service';
import { JobAnalyzerService } from '../services/job-analyzer.service';
import {
  TailorResumeDto,
  AnalyzeJobDto,
  OptimizeBulletsDto,
  GenerateCoverLetterDto,
  ATSScoreDto,
  KeywordExtractionDto,
} from '../dto/tailoring.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(
    private readonly tailoringService: ResumeTailoringService,
    private readonly jobAnalyzer: JobAnalyzerService,
  ) {}

  /**
   * Tailor a resume for a specific job
   */
  @Post('tailor-resume')
  async tailorResume(@Body() dto: TailorResumeDto, @Request() req: any) {
    // Tailor the resume
    const result = await this.tailoringService.tailorResume(
      dto.resumeId,
      dto.jobDescription,
      req.user.id
    );

    return {
      success: true,
      data: result,
      message: `Resume tailored successfully. ATS score improved by ${result.atsScore.improvement} points.`,
    };
  }

  /**
   * Analyze a job description
   */
  @Post('analyze-job')
  async analyzeJob(@Body() dto: AnalyzeJobDto) {
    // Analyze the job description
    const analysis = await this.jobAnalyzer.analyzeJobDescription(
      dto.jobDescription
    );

    return {
      success: true,
      data: analysis,
      message: 'Job description analyzed successfully',
    };
  }

  /**
   * Extract keywords from text
   */
  @Post('extract-keywords')
  async extractKeywords(@Body() dto: KeywordExtractionDto) {
    // Extract keywords
    const keywords = await this.jobAnalyzer.extractKeywords(dto.text);

    return {
      success: true,
      data: {
        keywords: dto.maxKeywords ? keywords.slice(0, dto.maxKeywords) : keywords,
        total: keywords.length,
      },
      message: `Extracted ${keywords.length} keywords`,
    };
  }

  /**
   * Get tailored resume history
   */
  @Get('tailored-resumes/:resumeId')
  async getTailoredHistory(
    @Param('resumeId') resumeId: string,
    @Request() req: any
  ) {
    // This would fetch from database - placeholder for now
    return {
      success: true,
      data: {
        resumeId,
        tailoredVersions: [],
      },
      message: 'Tailored resume history retrieved',
    };
  }

  /**
   * Match resume with job requirements
   */
  @Post('match-requirements')
  async matchRequirements(
    @Body() body: { resumeId: string; jobDescription: string },
    @Request() req: any
  ) {
    // Get resume content (simplified for now)
    const resumeContent = {
      skills: ['JavaScript', 'React', 'Node.js', 'Python'],
      experience: [],
    };

    // Analyze job
    const jobAnalysis = await this.jobAnalyzer.analyzeJobDescription(
      body.jobDescription
    );

    // Match requirements
    const match = await this.jobAnalyzer.matchRequirements(
      jobAnalysis,
      resumeContent
    );

    return {
      success: true,
      data: match,
      message: `Resume matches ${match.matchScore}% of job requirements`,
    };
  }

  /**
   * Get AI usage statistics
   */
  @Get('usage-stats')
  async getUsageStats(@Request() req: any) {
    // Placeholder for usage tracking
    return {
      success: true,
      data: {
        tailoringsThisMonth: 0,
        remainingCredits: 100,
        averageATSImprovement: 15,
        successRate: 78,
      },
      message: 'AI usage statistics retrieved',
    };
  }
}