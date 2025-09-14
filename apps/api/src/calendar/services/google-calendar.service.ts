import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { CalendarEvent, CalendarProvider, SyncStatus } from '../types/calendar.types';
import { DateTime } from 'luxon';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private oauth2Client: OAuth2Client;
  private calendar: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Initialize Google OAuth2 client with added comments for clarity
    this.oauth2Client = new OAuth2Client(
      this.configService.get('GOOGLE_CLIENT_ID'), // Google client ID from environment
      this.configService.get('GOOGLE_CLIENT_SECRET'), // Google client secret from environment
      this.configService.get('GOOGLE_REDIRECT_URI'), // Redirect URI for OAuth callback
    );
    
    // Initialize Google Calendar API client
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Generate OAuth2 authorization URL for Google Calendar access
   * @param userId - The user's ID for state parameter
   * @returns Authorization URL to redirect user to
   */
  async getAuthUrl(userId: string): Promise<string> {
    // Generate authorization URL with required scopes
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token for persistent access
      scope: [
        'https://www.googleapis.com/auth/calendar', // Full calendar access
        'https://www.googleapis.com/auth/calendar.events', // Event management
      ],
      state: userId, // Pass user ID in state for security
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * @param code - Authorization code from Google OAuth callback
   * @param userId - The user's ID
   */
  async handleCallback(code: string, userId: string): Promise<void> {
    try {
      // Exchange authorization code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Store tokens in database for future use
      await this.prisma.calendarIntegration.upsert({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.GOOGLE,
          },
        },
        update: {
          accessToken: tokens.access_token!, // Update access token
          refreshToken: tokens.refresh_token || undefined, // Update refresh token if provided
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined, // Store expiry date
          isActive: true, // Mark integration as active
          lastSyncedAt: new Date(), // Update last sync timestamp
        },
        create: {
          userId,
          provider: CalendarProvider.GOOGLE,
          accessToken: tokens.access_token!, // Store access token
          refreshToken: tokens.refresh_token || '', // Store refresh token
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined, // Store expiry date
          isActive: true, // Mark as active
        },
      });

      this.logger.log(`Google Calendar connected for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to handle Google Calendar callback: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set OAuth2 credentials for a user from stored tokens
   * @param userId - The user's ID
   */
  private async setCredentials(userId: string): Promise<void> {
    // Retrieve stored tokens from database
    const integration = await this.prisma.calendarIntegration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: CalendarProvider.GOOGLE,
        },
      },
    });

    if (!integration || !integration.accessToken) {
      throw new Error('Google Calendar not connected');
    }

    // Check if token is expired and refresh if needed
    if (integration.expiresAt && integration.expiresAt < new Date()) {
      await this.refreshToken(userId, integration.refreshToken!);
      return;
    }

    // Set credentials for OAuth2 client
    this.oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken || undefined,
    });
  }

  /**
   * Refresh expired access token using refresh token
   * @param userId - The user's ID
   * @param refreshToken - The refresh token
   */
  private async refreshToken(userId: string, refreshToken: string): Promise<void> {
    try {
      // Set refresh token and request new access token
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      // Update stored tokens in database
      await this.prisma.calendarIntegration.update({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.GOOGLE,
          },
        },
        data: {
          accessToken: credentials.access_token!, // Update access token
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined, // Update expiry
        },
      });

      // Set new credentials for OAuth2 client
      this.oauth2Client.setCredentials(credentials);
    } catch (error) {
      this.logger.error(`Failed to refresh Google token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create an event in Google Calendar
   * @param userId - The user's ID
   * @param event - The event details to create
   * @returns Created event details
   */
  async createEvent(userId: string, event: CalendarEvent): Promise<CalendarEvent> {
    try {
      // Set user credentials for API access
      await this.setCredentials(userId);

      // Create event object for Google Calendar API
      const googleEvent = {
        summary: event.title, // Event title
        description: event.description, // Event description
        location: event.location, // Event location
        start: {
          dateTime: event.startTime.toISO(), // Start time in ISO format
          timeZone: event.timezone || 'America/New_York', // Timezone
        },
        end: {
          dateTime: event.endTime.toISO(), // End time in ISO format
          timeZone: event.timezone || 'America/New_York', // Timezone
        },
        attendees: event.attendees?.map(email => ({ email })), // Add attendees if provided
        reminders: {
          useDefault: false, // Don't use default reminders
          overrides: event.reminders || [
            { method: 'email', minutes: 24 * 60 }, // Email reminder 24 hours before
            { method: 'popup', minutes: 30 }, // Popup reminder 30 minutes before
          ],
        },
        colorId: event.color, // Event color
      };

      // Create event in Google Calendar
      const response = await this.calendar.events.insert({
        calendarId: 'primary', // Use primary calendar
        requestBody: googleEvent,
      });

      // Log successful creation
      this.logger.log(`Created Google Calendar event: ${response.data.id}`);

      // Return created event with Google Calendar ID
      return {
        ...event,
        externalId: response.data.id,
        htmlLink: response.data.htmlLink,
      };
    } catch (error) {
      this.logger.error(`Failed to create Google Calendar event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an existing event in Google Calendar
   * @param userId - The user's ID
   * @param eventId - The Google Calendar event ID
   * @param updates - The event updates to apply
   * @returns Updated event details
   */
  async updateEvent(
    userId: string,
    eventId: string,
    updates: Partial<CalendarEvent>,
  ): Promise<CalendarEvent> {
    try {
      // Set user credentials for API access
      await this.setCredentials(userId);

      // Get existing event to merge with updates
      const existing = await this.calendar.events.get({
        calendarId: 'primary',
        eventId,
      });

      // Merge updates with existing event
      const googleEvent = {
        ...existing.data,
        summary: updates.title || existing.data.summary, // Update title if provided
        description: updates.description || existing.data.description, // Update description if provided
        location: updates.location || existing.data.location, // Update location if provided
        start: updates.startTime ? {
          dateTime: updates.startTime.toISO(), // Update start time if provided
          timeZone: updates.timezone || 'America/New_York',
        } : existing.data.start,
        end: updates.endTime ? {
          dateTime: updates.endTime.toISO(), // Update end time if provided
          timeZone: updates.timezone || 'America/New_York',
        } : existing.data.end,
      };

      // Update event in Google Calendar
      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId,
        requestBody: googleEvent,
      });

      // Log successful update
      this.logger.log(`Updated Google Calendar event: ${eventId}`);

      // Return updated event
      return this.convertGoogleEvent(response.data);
    } catch (error) {
      this.logger.error(`Failed to update Google Calendar event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete an event from Google Calendar
   * @param userId - The user's ID
   * @param eventId - The Google Calendar event ID
   */
  async deleteEvent(userId: string, eventId: string): Promise<void> {
    try {
      // Set user credentials for API access
      await this.setCredentials(userId);

      // Delete event from Google Calendar
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });

      // Log successful deletion
      this.logger.log(`Deleted Google Calendar event: ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to delete Google Calendar event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync events from Google Calendar
   * @param userId - The user's ID
   * @param startDate - Start date for sync range
   * @param endDate - End date for sync range
   * @returns Array of synced events
   */
  async syncEvents(
    userId: string,
    startDate: DateTime,
    endDate: DateTime,
  ): Promise<CalendarEvent[]> {
    try {
      // Set user credentials for API access
      await this.setCredentials(userId);

      // Fetch events from Google Calendar within date range
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISO(), // Start of date range
        timeMax: endDate.toISO(), // End of date range
        singleEvents: true, // Expand recurring events
        orderBy: 'startTime', // Order by start time
        maxResults: 250, // Limit to 250 events
      });

      // Convert and return Google events to our format
      const events = response.data.items || [];
      return events.map(event => this.convertGoogleEvent(event));
    } catch (error) {
      this.logger.error(`Failed to sync Google Calendar events: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check for conflicts with existing calendar events
   * @param userId - The user's ID
   * @param startTime - Proposed start time
   * @param endTime - Proposed end time
   * @returns Array of conflicting events
   */
  async checkConflicts(
    userId: string,
    startTime: DateTime,
    endTime: DateTime,
  ): Promise<CalendarEvent[]> {
    try {
      // Set user credentials for API access
      await this.setCredentials(userId);

      // Query for events that overlap with proposed time
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startTime.toISO(), // Start of check range
        timeMax: endTime.toISO(), // End of check range
        singleEvents: true, // Expand recurring events
        orderBy: 'startTime', // Order by start time
      });

      // Filter for actual conflicts (overlapping time ranges)
      const conflicts = (response.data.items || []).filter(event => {
        // Skip all-day events as they don't block time slots
        if (event.start?.date || event.end?.date) return false;
        
        // Check for time overlap
        const eventStart = DateTime.fromISO(event.start?.dateTime!);
        const eventEnd = DateTime.fromISO(event.end?.dateTime!);
        
        // Check if events overlap
        return eventStart < endTime && eventEnd > startTime;
      });

      // Convert and return conflicting events
      return conflicts.map(event => this.convertGoogleEvent(event));
    } catch (error) {
      this.logger.error(`Failed to check Google Calendar conflicts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert Google Calendar event to our CalendarEvent format
   * @param googleEvent - Google Calendar event object
   * @returns Converted CalendarEvent
   */
  private convertGoogleEvent(googleEvent: any): CalendarEvent {
    // Convert Google event to our standard format
    return {
      id: googleEvent.id, // Google event ID
      externalId: googleEvent.id, // Store as external ID
      title: googleEvent.summary || 'Untitled Event', // Event title
      description: googleEvent.description || '', // Event description
      location: googleEvent.location || '', // Event location
      startTime: DateTime.fromISO(
        googleEvent.start?.dateTime || googleEvent.start?.date
      ), // Start time
      endTime: DateTime.fromISO(
        googleEvent.end?.dateTime || googleEvent.end?.date
      ), // End time
      timezone: googleEvent.start?.timeZone || 'America/New_York', // Timezone
      attendees: googleEvent.attendees?.map((a: any) => a.email) || [], // Attendee emails
      reminders: googleEvent.reminders?.overrides || [], // Reminder settings
      color: googleEvent.colorId, // Event color
      htmlLink: googleEvent.htmlLink, // Link to event in Google Calendar
      status: googleEvent.status, // Event status
      created: DateTime.fromISO(googleEvent.created), // Creation time
      updated: DateTime.fromISO(googleEvent.updated), // Last update time
    };
  }

  /**
   * Disconnect Google Calendar integration
   * @param userId - The user's ID
   */
  async disconnect(userId: string): Promise<void> {
    try {
      // Mark integration as inactive in database
      await this.prisma.calendarIntegration.update({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.GOOGLE,
          },
        },
        data: {
          isActive: false, // Mark as inactive
          accessToken: '', // Clear access token
          refreshToken: '', // Clear refresh token
        },
      });

      this.logger.log(`Google Calendar disconnected for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to disconnect Google Calendar: ${error.message}`);
      throw error;
    }
  }
}