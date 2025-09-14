import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { ResumesService } from './resumes.service';
import { ParsedResume } from './resume-parser.service';

@ApiTags('resumes')
@Controller('resumes')
@UseGuards(AuthGuard)
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new BadRequestException('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload and parse a resume' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadResume(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = req.user.sub;
    return this.resumesService.parseAndSaveResume(userId, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all resumes for the current user' })
  async getResumes(@Req() req: any) {
    const userId = req.user.sub;
    return this.resumesService.getResumes(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific resume by ID' })
  async getResume(@Param('id') id: string, @Req() req: any): Promise<any> {
    const userId = req.user.sub;
    return this.resumesService.getResumeById(userId, id);
  }

  @Put(':id/parsed-data')
  @ApiOperation({ summary: 'Update the parsed data of a resume (manual corrections)' })
  async updateParsedData(
    @Param('id') id: string,
    @Body() parsedData: Partial<ParsedResume>,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user.sub;
    return this.resumesService.updateParsedData(userId, id, parsedData);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Set a resume as the active resume' })
  async setActiveResume(@Param('id') id: string, @Req() req: any): Promise<any> {
    const userId = req.user.sub;
    return this.resumesService.setActiveResume(userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a resume' })
  async deleteResume(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.sub;
    return this.resumesService.deleteResume(userId, id);
  }

  @Get('skills/all')
  @ApiOperation({ summary: 'Extract all unique skills from all user resumes' })
  async getAllSkills(@Req() req: any) {
    const userId = req.user.sub;
    const skills = await this.resumesService.extractSkillsFromAllResumes(userId);
    return { skills };
  }
}