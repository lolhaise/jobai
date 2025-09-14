import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResumeStorageService } from '../services/resume-storage.service';
import {
  CreateResumeVersionDto,
  UpdateResumeTagsDto,
  ShareResumeDto,
  SearchResumesDto,
  CompareVersionsDto,
  MergeVersionsDto,
  CreateTemplateDto,
  ApplyTemplateDto
} from '../dto/resume-storage.dto';

@Controller('resumes/storage')
export class ResumeStorageController {
  constructor(private readonly storageService: ResumeStorageService) {}

  /**
   * Create a new resume version
   */
  @Post('versions')
  @UseGuards(JwtAuthGuard)
  async createVersion(@Request() req, @Body() dto: CreateResumeVersionDto) {
    return this.storageService.createVersion(req.user.userId, dto);
  }

  /**
   * Get resume version history
   */
  @Get(':id/versions')
  @UseGuards(JwtAuthGuard)
  async getVersionHistory(@Request() req, @Param('id') resumeId: string) {
    return this.storageService.getVersionHistory(req.user.userId, resumeId);
  }

  /**
   * Compare two resume versions
   */
  @Post('compare')
  @UseGuards(JwtAuthGuard)
  async compareVersions(@Request() req, @Body() dto: CompareVersionsDto) {
    return this.storageService.compareVersions(req.user.userId, dto);
  }

  /**
   * Merge multiple resume versions
   */
  @Post('merge')
  @UseGuards(JwtAuthGuard)
  async mergeVersions(@Request() req, @Body() dto: MergeVersionsDto) {
    return this.storageService.mergeVersions(req.user.userId, dto);
  }

  /**
   * Update resume tags
   */
  @Patch(':id/tags')
  @UseGuards(JwtAuthGuard)
  async updateTags(
    @Request() req,
    @Param('id') resumeId: string,
    @Body() dto: UpdateResumeTagsDto
  ) {
    return this.storageService.updateTags(req.user.userId, resumeId, dto);
  }

  /**
   * Search resumes
   */
  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchResumes(@Request() req, @Query() dto: SearchResumesDto) {
    return this.storageService.searchResumes(req.user.userId, dto);
  }

  /**
   * Archive a resume
   */
  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard)
  async archiveResume(@Request() req, @Param('id') resumeId: string) {
    return this.storageService.archiveResume(req.user.userId, resumeId, true);
  }

  /**
   * Unarchive a resume
   */
  @Patch(':id/unarchive')
  @UseGuards(JwtAuthGuard)
  async unarchiveResume(@Request() req, @Param('id') resumeId: string) {
    return this.storageService.archiveResume(req.user.userId, resumeId, false);
  }

  /**
   * Share a resume
   */
  @Post(':id/share')
  @UseGuards(JwtAuthGuard)
  async shareResume(
    @Request() req,
    @Param('id') resumeId: string,
    @Body() dto: ShareResumeDto
  ) {
    return this.storageService.shareResume(req.user.userId, resumeId, dto);
  }

  /**
   * Get shared resume (public endpoint)
   */
  @Get('shared/:token')
  async getSharedResume(
    @Param('token') shareToken: string,
    @Query('share') shareId?: string
  ) {
    return this.storageService.getSharedResume(shareToken, shareId);
  }

  /**
   * Get user's tags
   */
  @Get('tags')
  @UseGuards(JwtAuthGuard)
  async getUserTags(@Request() req) {
    return this.storageService.getUserTags(req.user.userId);
  }

  /**
   * Get available templates
   */
  @Get('templates')
  async getTemplates(@Query('category') category?: string) {
    return this.storageService.getTemplates(category);
  }

  /**
   * Create a new template (admin only)
   */
  @Post('templates')
  @UseGuards(JwtAuthGuard)
  async createTemplate(@Body() dto: CreateTemplateDto) {
    // TODO: Add admin guard
    return this.storageService.createTemplate(dto);
  }

  /**
   * Apply template to resume
   */
  @Post('templates/apply')
  @UseGuards(JwtAuthGuard)
  async applyTemplate(@Request() req, @Body() dto: ApplyTemplateDto) {
    return this.storageService.applyTemplate(req.user.userId, dto);
  }
}