import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIController } from './controllers/ai.controller';
import { CoverLetterController } from './controllers/cover-letter.controller';
import { JobAnalyzerService } from './services/job-analyzer.service';
import { ResumeTailoringService } from './services/resume-tailoring.service';
import { CoverLetterService } from './services/cover-letter.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
  ],
  controllers: [AIController, CoverLetterController],
  providers: [
    JobAnalyzerService,
    ResumeTailoringService,
    CoverLetterService,
  ],
  exports: [
    JobAnalyzerService,
    ResumeTailoringService,
    CoverLetterService,
  ],
})
export class AIModule {}