import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '@/prisma/prisma.module';
import { GoogleCalendarService } from './services/google-calendar.service';
import { OutlookCalendarService } from './services/outlook-calendar.service';
import { CalendarSyncService } from './services/calendar-sync.service';
import { CalendarController } from './controllers/calendar.controller';

@Module({
  imports: [
    ConfigModule, // For environment variables
    PrismaModule, // For database access
    ScheduleModule.forRoot(), // For cron jobs
    EventEmitterModule.forRoot(), // For event-driven communication
  ],
  controllers: [
    CalendarController, // REST API endpoints
  ],
  providers: [
    GoogleCalendarService, // Google Calendar integration
    OutlookCalendarService, // Outlook Calendar integration
    CalendarSyncService, // Calendar sync and conflict detection
  ],
  exports: [
    GoogleCalendarService, // Export for use in other modules
    OutlookCalendarService, // Export for use in other modules
    CalendarSyncService, // Export for use in other modules
  ],
})
export class CalendarModule {}