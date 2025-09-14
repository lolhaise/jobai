// Search Module
// Configures all search-related services and controllers

import { Module } from '@nestjs/common';
import { PrismaService } from '@jobai/database';
import { JobSearchService } from './services/job-search.service';
import { SavedSearchService } from './services/saved-search.service';
import { SearchController } from './controllers/search.controller';
import { EmailService } from '../notifications/email.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // Import AuthModule for guards
  controllers: [SearchController],
  providers: [
    JobSearchService,
    SavedSearchService,
    EmailService,
    PrismaService,
  ],
  exports: [JobSearchService, SavedSearchService], // Export for use in other modules
})
export class SearchModule {}