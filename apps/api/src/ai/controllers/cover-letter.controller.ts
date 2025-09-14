import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Query,
  Patch
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CoverLetterService } from '../services/cover-letter.service';
import {
  GenerateCoverLetterDto,
  AdjustToneDto,
  OptimizeLengthDto,
  UpdateCoverLetterDto,
  CoverLetterResponseDto
} from '../dto/cover-letter.dto';
import { CoverLetterTone, CoverLetterLength } from '../services/cover-letter.service';

@Controller('cover-letters')
@UseGuards(JwtAuthGuard)
export class CoverLetterController {
  constructor(private readonly coverLetterService: CoverLetterService) {}

  // Generate a new cover letter
  @Post('generate')
  async generateCoverLetter(
    @Request() req: any,
    @Body() dto: GenerateCoverLetterDto
  ): Promise<CoverLetterResponseDto> {
    try {
      const userId = req.user.id;
      
      const result = await this.coverLetterService.generateCoverLetter(
        dto.resumeId,
        dto.jobId,
        userId,
        {
          tone: dto.tone,
          length: dto.length,
          template: dto.template,
          emphasizeSkills: dto.emphasizeSkills,
          includeAchievements: dto.includeAchievements,
          companyResearch: dto.companyResearch
        }
      );

      return {
        id: result.id,
        content: result.content,
        qualityScore: result.qualityScore,
        template: result.template,
        tone: result.tone,
        length: result.length,
        suggestions: result.suggestions,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Cover letter generation error:', error);
      throw new HttpException(
        'Failed to generate cover letter',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Adjust tone of existing cover letter
  @Post('adjust-tone')
  async adjustTone(
    @Request() req: any,
    @Body() dto: AdjustToneDto
  ) {
    try {
      const userId = req.user.id;
      
      const adjusted = await this.coverLetterService.adjustTone(
        dto.coverLetterId,
        dto.newTone,
        userId
      );

      return {
        success: true,
        coverLetter: adjusted,
        message: `Tone adjusted to ${dto.newTone}`
      };
    } catch (error) {
      console.error('Tone adjustment error:', error);
      throw new HttpException(
        'Failed to adjust cover letter tone',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Optimize cover letter length
  @Post('optimize-length')
  async optimizeLength(
    @Request() req: any,
    @Body() dto: OptimizeLengthDto
  ) {
    try {
      const userId = req.user.id;
      
      const optimized = await this.coverLetterService.optimizeLength(
        dto.coverLetterId,
        dto.targetLength,
        userId
      );

      return {
        success: true,
        content: optimized,
        message: `Length optimized to ${dto.targetLength}`
      };
    } catch (error) {
      console.error('Length optimization error:', error);
      throw new HttpException(
        'Failed to optimize cover letter length',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Get all user's cover letters
  @Get()
  async getUserCoverLetters(
    @Request() req: any,
    @Query('resumeId') resumeId?: string,
    @Query('jobId') jobId?: string
  ) {
    try {
      const userId = req.user.id;
      const coverLetters = await this.coverLetterService.getUserCoverLetters(userId);
      
      // Filter if specific resume or job requested
      let filtered = coverLetters;
      if (resumeId) {
        filtered = filtered.filter(cl => cl.resumeId === resumeId);
      }
      if (jobId) {
        filtered = filtered.filter(cl => cl.jobId === jobId);
      }

      return filtered.map(cl => ({
        id: cl.id,
        content: cl.content,
        metadata: cl.metadata,
        resume: cl.resume,
        job: cl.job,
        createdAt: cl.createdAt,
        updatedAt: cl.updatedAt
      }));
    } catch (error) {
      console.error('Get cover letters error:', error);
      throw new HttpException(
        'Failed to retrieve cover letters',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Get a specific cover letter
  @Get(':id')
  async getCoverLetter(
    @Request() req: any,
    @Param('id') id: string
  ) {
    try {
      const userId = req.user.id;
      const coverLetters = await this.coverLetterService.getUserCoverLetters(userId);
      const coverLetter = coverLetters.find(cl => cl.id === id);
      
      if (!coverLetter) {
        throw new HttpException(
          'Cover letter not found',
          HttpStatus.NOT_FOUND
        );
      }

      return coverLetter;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      console.error('Get cover letter error:', error);
      throw new HttpException(
        'Failed to retrieve cover letter',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Update cover letter content
  @Patch(':id')
  async updateCoverLetter(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCoverLetterDto
  ) {
    try {
      const userId = req.user.id;
      
      // Verify ownership
      const coverLetters = await this.coverLetterService.getUserCoverLetters(userId);
      const exists = coverLetters.find(cl => cl.id === id);
      
      if (!exists) {
        throw new HttpException(
          'Cover letter not found or unauthorized',
          HttpStatus.NOT_FOUND
        );
      }

      // Update in database using Prisma directly
      const prisma = (this.coverLetterService as any).prisma;
      const updated = await prisma.coverLetter.update({
        where: { id },
        data: {
          content: dto.content,
          metadata: dto.metadata,
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        coverLetter: updated,
        message: 'Cover letter updated successfully'
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      console.error('Update cover letter error:', error);
      throw new HttpException(
        'Failed to update cover letter',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Delete a cover letter
  @Delete(':id')
  async deleteCoverLetter(
    @Request() req: any,
    @Param('id') id: string
  ) {
    try {
      const userId = req.user.id;
      
      await this.coverLetterService.deleteCoverLetter(id, userId);
      
      return {
        success: true,
        message: 'Cover letter deleted successfully'
      };
    } catch (error) {
      console.error('Delete cover letter error:', error);
      throw new HttpException(
        'Failed to delete cover letter',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Get available templates
  @Get('templates/list')
  async getTemplates() {
    // Access templates from service
    const templates = (this.coverLetterService as any).templates;
    
    return templates.map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      tone: t.tone,
      industry: t.industry,
      structure: t.structure
    }));
  }

  // Get tone options
  @Get('options/tones')
  async getTones() {
    return Object.values(CoverLetterTone);
  }

  // Get length options  
  @Get('options/lengths')
  async getLengths() {
    return Object.values(CoverLetterLength);
  }
}