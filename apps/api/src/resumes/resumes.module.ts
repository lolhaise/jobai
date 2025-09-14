import { Module } from '@nestjs/common';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';
import { ResumeParserService } from './resume-parser.service';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { ResumeStorageController } from './controllers/resume-storage.controller';
import { ResumeStorageService } from './services/resume-storage.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ResumesController, TemplatesController, ResumeStorageController],
  providers: [ResumesService, ResumeParserService, TemplatesService, ResumeStorageService],
  exports: [ResumesService, ResumeParserService, TemplatesService, ResumeStorageService],
})
export class ResumesModule {}