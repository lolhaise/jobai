import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { GoogleCalendarService } from '../services/google-calendar.service';
import { OutlookCalendarService } from '../services/outlook-calendar.service';
import { CalendarSyncService } from '../services/calendar-sync.service';
import { CalendarProvider } from '../types/calendar.types';
import { DateTime } from 'luxon';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(
    private readonly googleCalendar: GoogleCalendarService,
    private readonly outlookCalendar: OutlookCalendarService,
    private readonly syncService: CalendarSyncService,
  ) {}

  /**
   * Get OAuth authorization URL for calendar provider
   * @param provider - Calendar provider (google or outlook)
   * @param req - Request object with user info
   * @returns Authorization URL
   */
  @Get('auth/:provider')
  async getAuthUrl(
    @Param('provider') provider: string,
    @Req() req: any,
  ): Promise<{ authUrl: string }> {
    const userId = req.user.id; // Get user ID from JWT
    let authUrl: string;

    // Generate auth URL based on provider
    switch (provider.toUpperCase()) {
      case CalendarProvider.GOOGLE:
        authUrl = await this.googleCalendar.getAuthUrl(userId);
        break;
      case CalendarProvider.OUTLOOK:
        authUrl = await this.outlookCalendar.getAuthUrl(userId);
        break;
      default:
        throw new Error(`Unsupported calendar provider: ${provider}`);
    }

    return { authUrl };
  }

  /**
   * Handle OAuth callback from calendar provider
   * @param provider - Calendar provider
   * @param code - Authorization code
   * @param state - State parameter (user ID)
   */
  @Post('callback/:provider')
  async handleCallback(
    @Param('provider') provider: string,
    @Body('code') code: string,
    @Body('state') state: string,
  ): Promise<{ success: boolean }> {
    // Handle callback based on provider
    switch (provider.toUpperCase()) {
      case CalendarProvider.GOOGLE:
        await this.googleCalendar.handleCallback(code, state);
        break;
      case CalendarProvider.OUTLOOK:
        await this.outlookCalendar.handleCallback(code, state);
        break;
      default:
        throw new Error(`Unsupported calendar provider: ${provider}`);
    }

    return { success: true };
  }

  /**
   * Sync all connected calendars for the user
   * @param req - Request object with user info
   * @param startDate - Optional start date for sync
   * @param endDate - Optional end date for sync
   */
  @Post('sync')
  async syncCalendars(
    @Req() req: any,
    @Body('startDate') startDate?: string,
    @Body('endDate') endDate?: string,
  ) {
    const userId = req.user.id;
    
    // Parse dates or use defaults
    const start = startDate ? DateTime.fromISO(startDate) : DateTime.now();
    const end = endDate ? DateTime.fromISO(endDate) : DateTime.now().plus({ months: 3 });

    // Perform sync and return status
    return await this.syncService.syncAllCalendars(userId, start, end);
  }

  /**
   * Create a calendar event
   * @param provider - Calendar provider
   * @param eventData - Event details
   * @param req - Request object with user info
   */
  @Post('events/:provider')
  async createEvent(
    @Param('provider') provider: string,
    @Body() eventData: any,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    
    // Convert dates to DateTime objects
    const event = {
      ...eventData,
      startTime: DateTime.fromISO(eventData.startTime),
      endTime: DateTime.fromISO(eventData.endTime),
    };

    // Create event based on provider
    switch (provider.toUpperCase()) {
      case CalendarProvider.GOOGLE:
        return await this.googleCalendar.createEvent(userId, event);
      case CalendarProvider.OUTLOOK:
        return await this.outlookCalendar.createEvent(userId, event);
      default:
        throw new Error(`Unsupported calendar provider: ${provider}`);
    }
  }

  /**
   * Update a calendar event
   * @param provider - Calendar provider
   * @param eventId - Event ID to update
   * @param updates - Event updates
   * @param req - Request object with user info
   */
  @Put('events/:provider/:eventId')
  async updateEvent(
    @Param('provider') provider: string,
    @Param('eventId') eventId: string,
    @Body() updates: any,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    
    // Convert dates if provided
    if (updates.startTime) {
      updates.startTime = DateTime.fromISO(updates.startTime);
    }
    if (updates.endTime) {
      updates.endTime = DateTime.fromISO(updates.endTime);
    }

    // Update event based on provider
    switch (provider.toUpperCase()) {
      case CalendarProvider.GOOGLE:
        return await this.googleCalendar.updateEvent(userId, eventId, updates);
      case CalendarProvider.OUTLOOK:
        return await this.outlookCalendar.updateEvent(userId, eventId, updates);
      default:
        throw new Error(`Unsupported calendar provider: ${provider}`);
    }
  }

  /**
   * Delete a calendar event
   * @param provider - Calendar provider
   * @param eventId - Event ID to delete
   * @param req - Request object with user info
   */
  @Delete('events/:provider/:eventId')
  async deleteEvent(
    @Param('provider') provider: string,
    @Param('eventId') eventId: string,
    @Req() req: any,
  ): Promise<{ success: boolean }> {
    const userId = req.user.id;

    // Delete event based on provider
    switch (provider.toUpperCase()) {
      case CalendarProvider.GOOGLE:
        await this.googleCalendar.deleteEvent(userId, eventId);
        break;
      case CalendarProvider.OUTLOOK:
        await this.outlookCalendar.deleteEvent(userId, eventId);
        break;
      default:
        throw new Error(`Unsupported calendar provider: ${provider}`);
    }

    return { success: true };
  }

  /**
   * Check for conflicts when scheduling a new event
   * @param req - Request object with user info
   * @param startTime - Proposed start time
   * @param endTime - Proposed end time
   * @param excludeEventId - Optional event ID to exclude
   */
  @Post('conflicts/check')
  async checkConflicts(
    @Req() req: any,
    @Body('startTime') startTime: string,
    @Body('endTime') endTime: string,
    @Body('excludeEventId') excludeEventId?: string,
  ) {
    const userId = req.user.id;
    
    // Convert times to DateTime
    const start = DateTime.fromISO(startTime);
    const end = DateTime.fromISO(endTime);

    // Check for conflicts and return results
    return await this.syncService.checkNewEventConflicts(
      userId,
      start,
      end,
      excludeEventId,
    );
  }

  /**
   * Find available time slots
   * @param req - Request object with user info
   * @param duration - Required duration in minutes
   * @param searchStart - Start of search range
   * @param searchEnd - End of search range
   */
  @Post('slots/available')
  async findAvailableSlots(
    @Req() req: any,
    @Body('duration') duration: number,
    @Body('searchStart') searchStart: string,
    @Body('searchEnd') searchEnd: string,
  ) {
    const userId = req.user.id;
    
    // Convert dates to DateTime
    const start = DateTime.fromISO(searchStart);
    const end = DateTime.fromISO(searchEnd);

    // Find and return available slots
    return await this.syncService.findAvailableSlots(
      userId,
      start,
      duration,
      start,
      end,
    );
  }

  /**
   * Disconnect a calendar integration
   * @param provider - Calendar provider to disconnect
   * @param req - Request object with user info
   */
  @Delete('disconnect/:provider')
  async disconnectCalendar(
    @Param('provider') provider: string,
    @Req() req: any,
  ): Promise<{ success: boolean }> {
    const userId = req.user.id;

    // Disconnect based on provider
    switch (provider.toUpperCase()) {
      case CalendarProvider.GOOGLE:
        await this.googleCalendar.disconnect(userId);
        break;
      case CalendarProvider.OUTLOOK:
        await this.outlookCalendar.disconnect(userId);
        break;
      default:
        throw new Error(`Unsupported calendar provider: ${provider}`);
    }

    return { success: true };
  }
}