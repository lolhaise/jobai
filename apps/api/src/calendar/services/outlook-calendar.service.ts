import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { CalendarEvent, CalendarProvider, SyncStatus } from '../types/calendar.types';
import { DateTime } from 'luxon';
import * as msal from '@azure/msal-node';

@Injectable()
export class OutlookCalendarService {
  private readonly logger = new Logger(OutlookCalendarService.name);
  private msalClient: msal.ConfidentialClientApplication;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Initialize MSAL client for Microsoft authentication
    const msalConfig = {
      auth: {
        clientId: this.configService.get('MICROSOFT_CLIENT_ID')!, // Microsoft app client ID
        authority: 'https://login.microsoftonline.com/common', // Microsoft authority URL
        clientSecret: this.configService.get('MICROSOFT_CLIENT_SECRET')!, // Microsoft app secret
      },
    };

    this.msalClient = new msal.ConfidentialClientApplication(msalConfig);
  }

  /**
   * Generate OAuth2 authorization URL for Outlook Calendar access
   * @param userId - The user's ID for state parameter
   * @returns Authorization URL to redirect user to
   */
  async getAuthUrl(userId: string): Promise<string> {
    // Define required scopes for calendar access
    const authCodeUrlParameters = {
      scopes: [
        'https://graph.microsoft.com/Calendars.ReadWrite', // Calendar read/write access
        'https://graph.microsoft.com/User.Read', // User profile read access
      ],
      redirectUri: this.configService.get('MICROSOFT_REDIRECT_URI')!, // OAuth callback URL
      state: userId, // Pass user ID in state for security
    };

    // Generate and return authorization URL
    const authUrl = await this.msalClient.getAuthCodeUrl(authCodeUrlParameters);
    return authUrl;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * @param code - Authorization code from Microsoft OAuth callback
   * @param userId - The user's ID
   */
  async handleCallback(code: string, userId: string): Promise<void> {
    try {
      // Exchange authorization code for tokens
      const tokenRequest = {
        code,
        scopes: [
          'https://graph.microsoft.com/Calendars.ReadWrite', // Calendar access scope
          'https://graph.microsoft.com/User.Read', // User profile scope
        ],
        redirectUri: this.configService.get('MICROSOFT_REDIRECT_URI')!, // Callback URL
      };

      const response = await this.msalClient.acquireTokenByCode(tokenRequest);

      // Store tokens in database for future use
      await this.prisma.calendarIntegration.upsert({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.OUTLOOK,
          },
        },
        update: {
          accessToken: response.accessToken, // Update access token
          refreshToken: response.refreshToken || '', // Update refresh token if available
          expiresAt: response.expiresOn || undefined, // Store token expiry
          isActive: true, // Mark integration as active
          lastSyncedAt: new Date(), // Update last sync timestamp
        },
        create: {
          userId,
          provider: CalendarProvider.OUTLOOK,
          accessToken: response.accessToken, // Store access token
          refreshToken: response.refreshToken || '', // Store refresh token
          expiresAt: response.expiresOn || undefined, // Store expiry date
          isActive: true, // Mark as active
        },
      });

      this.logger.log(`Outlook Calendar connected for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to handle Outlook Calendar callback: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Microsoft Graph client with user's access token
   * @param userId - The user's ID
   * @returns Authenticated Graph client
   */
  private async getGraphClient(userId: string): Promise<Client> {
    // Retrieve stored tokens from database
    const integration = await this.prisma.calendarIntegration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: CalendarProvider.OUTLOOK,
        },
      },
    });

    if (!integration || !integration.accessToken) {
      throw new Error('Outlook Calendar not connected');
    }

    // Check if token is expired and refresh if needed
    if (integration.expiresAt && integration.expiresAt < new Date()) {
      await this.refreshToken(userId, integration.refreshToken!);
      // Get updated integration after refresh
      const updated = await this.prisma.calendarIntegration.findUnique({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.OUTLOOK,
          },
        },
      });
      integration.accessToken = updated!.accessToken;
    }

    // Create and return authenticated Graph client
    return Client.init({
      authProvider: (done) => {
        done(null, integration.accessToken); // Provide access token for authentication
      },
    });
  }

  /**
   * Refresh expired access token using refresh token
   * @param userId - The user's ID
   * @param refreshToken - The refresh token
   */
  private async refreshToken(userId: string, refreshToken: string): Promise<void> {
    try {
      // Request new tokens using refresh token
      const refreshTokenRequest = {
        refreshToken,
        scopes: [
          'https://graph.microsoft.com/Calendars.ReadWrite', // Calendar scope
          'https://graph.microsoft.com/User.Read', // User scope
        ],
      };

      const response = await this.msalClient.acquireTokenByRefreshToken(refreshTokenRequest);

      // Update stored tokens in database
      await this.prisma.calendarIntegration.update({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.OUTLOOK,
          },
        },
        data: {
          accessToken: response.accessToken, // Update access token
          expiresAt: response.expiresOn || undefined, // Update expiry
        },
      });
    } catch (error) {
      this.logger.error(`Failed to refresh Outlook token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create an event in Outlook Calendar
   * @param userId - The user's ID
   * @param event - The event details to create
   * @returns Created event details
   */
  async createEvent(userId: string, event: CalendarEvent): Promise<CalendarEvent> {
    try {
      // Get authenticated Graph client
      const client = await this.getGraphClient(userId);

      // Create event object for Microsoft Graph API
      const outlookEvent = {
        subject: event.title, // Event title
        body: {
          contentType: 'HTML', // HTML content type
          content: event.description || '', // Event description
        },
        start: {
          dateTime: event.startTime.toISO(), // Start time in ISO format
          timeZone: event.timezone || 'America/New_York', // Timezone
        },
        end: {
          dateTime: event.endTime.toISO(), // End time in ISO format
          timeZone: event.timezone || 'America/New_York', // Timezone
        },
        location: {
          displayName: event.location || '', // Event location
        },
        attendees: event.attendees?.map(email => ({
          emailAddress: {
            address: email, // Attendee email
          },
          type: 'required', // Mark attendee as required
        })),
        reminderMinutesBeforeStart: event.reminders?.[0]?.minutes || 15, // Reminder time
        isReminderOn: true, // Enable reminders
        importance: 'normal', // Event importance
        showAs: 'busy', // Show as busy in calendar
      };

      // Create event in Outlook Calendar
      const response = await client
        .api('/me/events')
        .post(outlookEvent);

      // Log successful creation
      this.logger.log(`Created Outlook Calendar event: ${response.id}`);

      // Return created event with Outlook ID
      return {
        ...event,
        externalId: response.id,
        htmlLink: response.webLink,
      };
    } catch (error) {
      this.logger.error(`Failed to create Outlook Calendar event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an existing event in Outlook Calendar
   * @param userId - The user's ID
   * @param eventId - The Outlook event ID
   * @param updates - The event updates to apply
   * @returns Updated event details
   */
  async updateEvent(
    userId: string,
    eventId: string,
    updates: Partial<CalendarEvent>,
  ): Promise<CalendarEvent> {
    try {
      // Get authenticated Graph client
      const client = await this.getGraphClient(userId);

      // Build update object with only changed fields
      const outlookUpdates: any = {};
      
      if (updates.title) outlookUpdates.subject = updates.title; // Update title
      if (updates.description) {
        outlookUpdates.body = {
          contentType: 'HTML',
          content: updates.description, // Update description
        };
      }
      if (updates.location) {
        outlookUpdates.location = {
          displayName: updates.location, // Update location
        };
      }
      if (updates.startTime) {
        outlookUpdates.start = {
          dateTime: updates.startTime.toISO(), // Update start time
          timeZone: updates.timezone || 'America/New_York',
        };
      }
      if (updates.endTime) {
        outlookUpdates.end = {
          dateTime: updates.endTime.toISO(), // Update end time
          timeZone: updates.timezone || 'America/New_York',
        };
      }

      // Update event in Outlook Calendar
      const response = await client
        .api(`/me/events/${eventId}`)
        .patch(outlookUpdates);

      // Log successful update
      this.logger.log(`Updated Outlook Calendar event: ${eventId}`);

      // Return updated event
      return this.convertOutlookEvent(response);
    } catch (error) {
      this.logger.error(`Failed to update Outlook Calendar event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete an event from Outlook Calendar
   * @param userId - The user's ID
   * @param eventId - The Outlook event ID
   */
  async deleteEvent(userId: string, eventId: string): Promise<void> {
    try {
      // Get authenticated Graph client
      const client = await this.getGraphClient(userId);

      // Delete event from Outlook Calendar
      await client
        .api(`/me/events/${eventId}`)
        .delete();

      // Log successful deletion
      this.logger.log(`Deleted Outlook Calendar event: ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to delete Outlook Calendar event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync events from Outlook Calendar
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
      // Get authenticated Graph client
      const client = await this.getGraphClient(userId);

      // Build filter query for date range
      const filter = `start/dateTime ge '${startDate.toISO()}' and end/dateTime le '${endDate.toISO()}'`;

      // Fetch events from Outlook Calendar
      const response = await client
        .api('/me/calendarview')
        .query({
          startDateTime: startDate.toISO(), // Start of range
          endDateTime: endDate.toISO(), // End of range
          $orderby: 'start/dateTime', // Order by start time
          $top: 250, // Limit to 250 events
        })
        .get();

      // Convert and return Outlook events to our format
      return response.value.map((event: any) => this.convertOutlookEvent(event));
    } catch (error) {
      this.logger.error(`Failed to sync Outlook Calendar events: ${error.message}`);
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
      // Get authenticated Graph client
      const client = await this.getGraphClient(userId);

      // Query for events in the proposed time range
      const response = await client
        .api('/me/calendarview')
        .query({
          startDateTime: startTime.toISO(), // Start of check range
          endDateTime: endTime.toISO(), // End of check range
          $filter: "showAs eq 'busy'", // Only get events marked as busy
          $orderby: 'start/dateTime', // Order by start time
        })
        .get();

      // Filter for actual conflicts (overlapping time ranges)
      const conflicts = response.value.filter((event: any) => {
        // Parse event times
        const eventStart = DateTime.fromISO(event.start.dateTime);
        const eventEnd = DateTime.fromISO(event.end.dateTime);
        
        // Check if events overlap
        return eventStart < endTime && eventEnd > startTime;
      });

      // Convert and return conflicting events
      return conflicts.map((event: any) => this.convertOutlookEvent(event));
    } catch (error) {
      this.logger.error(`Failed to check Outlook Calendar conflicts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert Outlook event to our CalendarEvent format
   * @param outlookEvent - Outlook event object
   * @returns Converted CalendarEvent
   */
  private convertOutlookEvent(outlookEvent: any): CalendarEvent {
    // Convert Outlook event to our standard format
    return {
      id: outlookEvent.id, // Outlook event ID
      externalId: outlookEvent.id, // Store as external ID
      title: outlookEvent.subject || 'Untitled Event', // Event title
      description: outlookEvent.body?.content || '', // Event description
      location: outlookEvent.location?.displayName || '', // Event location
      startTime: DateTime.fromISO(outlookEvent.start.dateTime), // Start time
      endTime: DateTime.fromISO(outlookEvent.end.dateTime), // End time
      timezone: outlookEvent.start.timeZone || 'America/New_York', // Timezone
      attendees: outlookEvent.attendees?.map((a: any) => 
        a.emailAddress.address
      ) || [], // Attendee emails
      reminders: outlookEvent.isReminderOn ? [{
        method: 'popup',
        minutes: outlookEvent.reminderMinutesBeforeStart || 15, // Reminder settings
      }] : [],
      htmlLink: outlookEvent.webLink, // Link to event in Outlook
      status: outlookEvent.isCancelled ? 'cancelled' : 'confirmed', // Event status
      created: DateTime.fromISO(outlookEvent.createdDateTime), // Creation time
      updated: DateTime.fromISO(outlookEvent.lastModifiedDateTime), // Last update time
    };
  }

  /**
   * Disconnect Outlook Calendar integration
   * @param userId - The user's ID
   */
  async disconnect(userId: string): Promise<void> {
    try {
      // Mark integration as inactive in database
      await this.prisma.calendarIntegration.update({
        where: {
          userId_provider: {
            userId,
            provider: CalendarProvider.OUTLOOK,
          },
        },
        data: {
          isActive: false, // Mark as inactive
          accessToken: '', // Clear access token
          refreshToken: '', // Clear refresh token
        },
      });

      this.logger.log(`Outlook Calendar disconnected for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to disconnect Outlook Calendar: ${error.message}`);
      throw error;
    }
  }
}