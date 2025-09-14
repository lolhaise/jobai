// Import necessary NestJS decorators and modules
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

// Import our services and controllers
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { AnalyticsService } from './services/analytics.service';
import { InterviewSchedulerService } from './services/interview-scheduler.service';
import { FollowUpReminderService } from './services/followup-reminder.service';
import { DashboardController } from './controllers/dashboard.controller';

// Import database module for Prisma access
import { DatabaseModule } from '@jobai/database';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from '@/notifications/email.service';

@Module({
  imports: [
    // Import database module to access Prisma client
    DatabaseModule,
    
    // Configure multer for file uploads (documents/attachments)
    MulterModule.register({
      storage: diskStorage({
        // Set destination folder for uploaded files
        destination: './uploads/applications',
        
        // Generate unique filename with timestamp and random string
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = extname(file.originalname);
          const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      
      // File size limit: 10MB
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB in bytes
      },
      
      // File type filter for security
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'image/jpeg',
          'image/png',
          'image/gif'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('Invalid file type'), false);
        }
      },
    }),
  ],
  
  // Register the controllers that will handle HTTP requests
  controllers: [
    ApplicationsController,
    DashboardController
  ],
  
  // Register the services that contain business logic
  providers: [
    ApplicationsService,
    AnalyticsService,
    InterviewSchedulerService,
    FollowUpReminderService,
    PrismaService,
    EmailService
  ],
  
  // Export the services so other modules can use them
  exports: [
    ApplicationsService,
    AnalyticsService,
    InterviewSchedulerService,
    FollowUpReminderService
  ],
})
export class ApplicationsModule {}