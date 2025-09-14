import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { ATSScoringService } from './services/ats-scoring.service';
import { ReadabilityCheckerService } from './services/readability-checker.service';
import { GrammarValidationService } from './services/grammar-validation.service';
import { ApprovalWorkflowService } from './services/approval-workflow.service';
import { QualityController } from './controllers/quality.controller';

@Module({
  imports: [
    HttpModule,
    EventEmitterModule.forRoot()
  ],
  controllers: [QualityController],
  providers: [
    PrismaService,
    ATSScoringService,
    ReadabilityCheckerService,
    GrammarValidationService,
    ApprovalWorkflowService
  ],
  exports: [
    ATSScoringService,
    ReadabilityCheckerService,
    GrammarValidationService,
    ApprovalWorkflowService
  ]
})
export class QualityModule {}