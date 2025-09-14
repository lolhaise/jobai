// Import necessary NestJS decorators and utilities
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

// Import authentication guard
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Import service and DTOs
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { FilterApplicationsDto } from './dto/filter-applications.dto';

// Import Prisma types
import { ApplicationStatus } from '@prisma/client';

@Controller('applications')
@UseGuards(JwtAuthGuard) // Protect all routes with JWT authentication
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  // POST /applications - Create new application
  @Post()
  async create(@Request() req, @Body() createApplicationDto: CreateApplicationDto) {
    // Extract user ID from JWT token
    const userId = req.user.sub;
    
    // Create and return new application
    return this.applicationsService.create(userId, createApplicationDto);
  }

  // GET /applications - Get paginated list of applications with filters
  @Get()
  async findAll(@Request() req, @Query() filterDto: FilterApplicationsDto) {
    // Extract user ID from JWT token
    const userId = req.user.sub;
    
    // Return filtered and paginated applications
    return this.applicationsService.findAll(userId, filterDto);
  }

  // GET /applications/statistics - Get application statistics for dashboard
  @Get('statistics')
  async getStatistics(@Request() req) {
    // Extract user ID from JWT token
    const userId = req.user.sub;
    
    // Return application statistics
    return this.applicationsService.getStatistics(userId);
  }

  // GET /applications/kanban - Get applications grouped by status for Kanban board
  @Get('kanban')
  async getKanbanData(@Request() req) {
    // Extract user ID from JWT token
    const userId = req.user.sub;
    
    // Return Kanban board data
    return this.applicationsService.getKanbanData(userId);
  }

  // PATCH /applications/kanban/positions - Update Kanban positions after drag and drop
  @Patch('kanban/positions')
  async updateKanbanPositions(
    @Request() req,
    @Body() updates: Array<{ id: string; status: ApplicationStatus; position: number }>
  ) {
    // Extract user ID from JWT token
    const userId = req.user.sub;
    
    // Update positions and return result
    return this.applicationsService.updateKanbanPositions(userId, updates);
  }

  // GET /applications/:id - Get single application by ID
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    // Extract user ID from JWT token
    const userId = req.user.sub;
    
    // Return single application with full details
    return this.applicationsService.findOne(id, userId);
  }

  // PATCH /applications/:id - Update application
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateApplicationDto: UpdateApplicationDto
  ) {
    // Extract user ID from JWT token
    const userId = req.user.sub;
    
    // Update and return application
    return this.applicationsService.update(id, userId, updateApplicationDto);
  }

  // DELETE /applications/:id - Delete application
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    // Extract user ID from JWT token
    const userId = req.user.sub;
    
    // Delete application and return confirmation
    return this.applicationsService.remove(id, userId);
  }

  // POST /applications/:id/notes - Add note to application
  @Post(':id/notes')
  async addNote(
    @Param('id') applicationId: string,
    @Request() req,
    @Body() createNoteDto: CreateNoteDto
  ) {
    // Extract user ID from JWT token
    const userId = req.user.sub;
    
    // Add note and return it
    return this.applicationsService.addNote(applicationId, userId, createNoteDto);
  }

  // GET /applications/:id/notes - Get all notes for application
  @Get(':id/notes')
  async getNotes(@Param('id') applicationId: string, @Request() req) {
    // Extract user ID from JWT token
    const userId = req.user.sub;
    
    // Return all notes for this application
    return this.applicationsService.getNotes(applicationId, userId);
  }

  // POST /applications/:id/tags - Add tag to application
  @Post(':id/tags')
  async addTag(
    @Param('id') applicationId: string,
    @Request() req,
    @Body() createTagDto: CreateTagDto
  ) {
    // Extract user ID from JWT token
    const userId = req.user.sub;
    
    // Add tag and return it
    return this.applicationsService.addTag(applicationId, userId, createTagDto);
  }

  // DELETE /applications/:id/tags/:tagId - Remove tag from application
  @Delete(':id/tags/:tagId')
  async removeTag(
    @Param('id') applicationId: string,
    @Param('tagId') tagId: string,
    @Request() req
  ) {
    // Extract user ID from JWT token
    const userId = req.user.sub;
    
    // Remove tag and return confirmation
    return this.applicationsService.removeTag(applicationId, tagId, userId);
  }

  // POST /applications/:id/documents - Upload document/attachment
  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file')) // Handle file upload
  async uploadDocument(
    @Param('id') applicationId: string,
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // Maximum file size: 10MB
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          
          // Allowed file types
          new FileTypeValidator({
            fileType: /(pdf|doc|docx|txt|jpg|jpeg|png|gif)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('title') title?: string,
    @Body('description') description?: string,
    @Body('documentType') documentType?: string,
  ) {
    // Extract user ID from JWT token
    const userId = req.user.sub;

    // TODO: Implement document upload logic
    // This would typically involve:
    // 1. Moving file to permanent storage (S3, etc.)
    // 2. Creating database record
    // 3. Logging activity
    
    // For now, return file info
    return {
      message: 'Document upload endpoint - implementation needed',
      file: {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      },
      applicationId,
      title,
      description,
      documentType,
    };
  }
}