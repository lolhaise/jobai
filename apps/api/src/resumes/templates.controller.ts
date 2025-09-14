import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { TemplatesService } from './templates.service';
import { ResumeBuilderInput } from '@jobai/shared';

@ApiTags('resume-templates')
@Controller('resume-templates')
@UseGuards(AuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available resume templates' })
  async getTemplates() {
    return this.templatesService.getTemplates();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific template by ID' })
  async getTemplate(@Param('id') id: string) {
    return this.templatesService.getTemplate(id);
  }

  @Post(':templateId/generate')
  @ApiOperation({ summary: 'Generate a resume from template with data' })
  async generateResume(
    @Param('templateId') templateId: string,
    @Body() resumeData: ResumeBuilderInput,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.templatesService.generateResume(userId, templateId, resumeData);
  }

  @Post(':templateId/export')
  @ApiOperation({ summary: 'Export resume to PDF or DOCX' })
  async exportResume(
    @Param('templateId') templateId: string,
    @Body() data: { resumeData: ResumeBuilderInput; format: 'PDF' | 'DOCX'; options?: any },
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.templatesService.exportResume(userId, templateId, data.resumeData, data.format, data.options);
  }
}