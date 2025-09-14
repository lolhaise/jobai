import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { GoogleCalendarService } from './google-calendar.service';
import { OutlookCalendarService } from './outlook-calendar.service';
import { CalendarEvent, CalendarProvider, ConflictResolution, SyncStatus } from '../types/calendar.types';
import { DateTime } from 'luxon';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendar: GoogleCalendarService,
    private readonly outlookCalendar: OutlookCalendarService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Sync all calendar integrations for a user
   * @param userId - The user's ID
   * @param startDate - Start date for sync range
   * @param endDate - End date for sync range
   * @returns Sync status and results
   */
  async syncAllCalendars(
    userId: string,
    startDate: DateTime = DateTime.now(),
    endDate: DateTime = DateTime.now().plus({ months: 3 }),
  ): Promise<SyncStatus> {
    const syncStatus: SyncStatus = {
      userId,
      startTime: new Date(),
      endTime: null,
      success: true,
      providers: [],
      totalEvents: 0,
      conflicts: [],
      errors: [],
    };

    try {
      // Get all active calendar integrations for user
      const integrations = await this.prisma.calendarIntegration.findMany({
        where: {
          userId,
          isActive: true, // Only sync active integrations
        },
      });

      // Sync each calendar provider in parallel
      const syncPromises = integrations.map(async (integration) => {
        try {
          // Choose appropriate service based on provider
          const events = await this.syncProvider(
            userId,
            integration.provider as CalendarProvider,
            startDate,
            endDate,
          );

          // Track sync results for this provider
          syncStatus.providers.push({
            provider: integration.provider as CalendarProvider,
            success: true,
            eventsCount: events.length,
            lastSyncedAt: new Date(),
          });

          syncStatus.totalEvents += events.length;

          // Store synced events in database
          await this.storeEvents(userId, integration.provider as CalendarProvider, events);

          return events;
        } catch (error) {
          // Log and track provider-specific errors
          this.logger.error(
            `Failed to sync ${integration.provider} for user ${userId}: ${error.message}`,
          );
          
          syncStatus.providers.push({
            provider: integration.provider as CalendarProvider,
            success: false,
            error: error.message,
            lastSyncedAt: integration.lastSyncedAt || undefined,
          });

          syncStatus.errors.push({
            provider: integration.provider as CalendarProvider,
            message: error.message,
          });

          return [];
        }
      });

      // Wait for all syncs to complete
      const allEvents = await Promise.all(syncPromises);
      const flatEvents = allEvents.flat();

      // Check for conflicts across all calendars
      const conflicts = await this.detectConflicts(flatEvents);
      syncStatus.conflicts = conflicts;

      // Update last sync time for successful providers
      await this.updateSyncTimestamps(userId, syncStatus.providers);

      // Emit sync completed event for other services
      this.eventEmitter.emit('calendar.synced', {
        userId,
        totalEvents: syncStatus.totalEvents,
        conflicts: conflicts.length,
      });

    } catch (error) {
      syncStatus.success = false;
      syncStatus.errors.push({
        provider: 'SYSTEM',
        message: error.message,
      });
      this.logger.error(`Calendar sync failed for user ${userId}: ${error.message}`);
    } finally {
      syncStatus.endTime = new Date();
    }

    return syncStatus;
  }

  /**
   * Sync events from a specific calendar provider
   * @param userId - The user's ID
   * @param provider - The calendar provider
   * @param startDate - Start date for sync
   * @param endDate - End date for sync
   * @returns Array of synced events
   */
  private async syncProvider(
    userId: string,
    provider: CalendarProvider,
    startDate: DateTime,
    endDate: DateTime,
  ): Promise<CalendarEvent[]> {
    // Route to appropriate service based on provider
    switch (provider) {
      case CalendarProvider.GOOGLE:
        return this.googleCalendar.syncEvents(userId, startDate, endDate);
      case CalendarProvider.OUTLOOK:
        return this.outlookCalendar.syncEvents(userId, startDate, endDate);
      default:
        throw new Error(`Unsupported calendar provider: ${provider}`);
    }
  }

  /**
   * Store synced events in database
   * @param userId - The user's ID
   * @param provider - The calendar provider
   * @param events - Array of events to store
   */
  private async storeEvents(
    userId: string,
    provider: CalendarProvider,
    events: CalendarEvent[],
  ): Promise<void> {
    // Batch upsert events to database
    const upsertPromises = events.map(event => 
      this.prisma.calendarEvent.upsert({
        where: {
          externalId_provider: {
            externalId: event.externalId!, // External calendar ID
            provider, // Calendar provider
          },
        },
        update: {
          title: event.title, // Update event title
          description: event.description, // Update description
          location: event.location, // Update location
          startTime: event.startTime.toJSDate(), // Update start time
          endTime: event.endTime.toJSDate(), // Update end time
          timezone: event.timezone, // Update timezone
          lastSyncedAt: new Date(), // Update sync timestamp
        },
        create: {
          userId,
          externalId: event.externalId!, // External ID from calendar
          provider, // Calendar provider
          title: event.title, // Event title
          description: event.description, // Event description
          location: event.location, // Event location
          startTime: event.startTime.toJSDate(), // Start time
          endTime: event.endTime.toJSDate(), // End time
          timezone: event.timezone, // Timezone
          metadata: event as any, // Store full event data
          lastSyncedAt: new Date(), // Initial sync timestamp
        },
      })
    );

    await Promise.all(upsertPromises);
  }

  /**
   * Detect conflicts between calendar events
   * @param events - Array of events to check
   * @returns Array of conflict groups
   */
  async detectConflicts(events: CalendarEvent[]): Promise<any[]> {
    const conflicts: any[] = [];
    
    // Sort events by start time for efficient comparison
    const sortedEvents = events.sort((a, b) => 
      a.startTime.toMillis() - b.startTime.toMillis()
    );

    // Check each event against all subsequent events
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const currentEvent = sortedEvents[i];
      const conflictGroup = {
        baseEvent: currentEvent,
        conflictingEvents: [] as CalendarEvent[],
        severity: 'low' as 'low' | 'medium' | 'high',
        suggestions: [] as string[],
      };

      // Check for overlaps with subsequent events
      for (let j = i + 1; j < sortedEvents.length; j++) {
        const compareEvent = sortedEvents[j];
        
        // If compare event starts after current ends, no more conflicts possible
        if (compareEvent.startTime >= currentEvent.endTime) {
          break;
        }

        // Check for overlap
        if (this.eventsOverlap(currentEvent, compareEvent)) {
          conflictGroup.conflictingEvents.push(compareEvent);
        }
      }

      // If conflicts found, analyze and add to results
      if (conflictGroup.conflictingEvents.length > 0) {
        // Determine conflict severity
        conflictGroup.severity = this.calculateConflictSeverity(
          currentEvent,
          conflictGroup.conflictingEvents,
        );

        // Generate resolution suggestions
        conflictGroup.suggestions = this.generateConflictSuggestions(
          currentEvent,
          conflictGroup.conflictingEvents,
        );

        conflicts.push(conflictGroup);
      }
    }

    return conflicts;
  }

  /**
   * Check if two events overlap in time
   * @param event1 - First event
   * @param event2 - Second event
   * @returns True if events overlap
   */
  private eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
    // Events overlap if one starts before the other ends
    return event1.startTime < event2.endTime && event2.startTime < event1.endTime;
  }

  /**
   * Calculate severity of calendar conflicts
   * @param baseEvent - The base event
   * @param conflicts - Conflicting events
   * @returns Conflict severity level
   */
  private calculateConflictSeverity(
    baseEvent: CalendarEvent,
    conflicts: CalendarEvent[],
  ): 'low' | 'medium' | 'high' {
    // High severity if multiple conflicts or interview conflicts
    if (conflicts.length > 2) return 'high';
    
    // Check if any event is an interview
    const hasInterview = 
      baseEvent.title.toLowerCase().includes('interview') ||
      conflicts.some(e => e.title.toLowerCase().includes('interview'));
    
    if (hasInterview) return 'high';
    
    // Medium severity for 2 conflicts or important events
    if (conflicts.length === 2) return 'medium';
    
    // Check for important keywords
    const importantKeywords = ['meeting', 'call', 'presentation', 'review'];
    const hasImportant = importantKeywords.some(keyword =>
      baseEvent.title.toLowerCase().includes(keyword) ||
      conflicts.some(e => e.title.toLowerCase().includes(keyword))
    );
    
    return hasImportant ? 'medium' : 'low';
  }

  /**
   * Generate suggestions for resolving calendar conflicts
   * @param baseEvent - The base event
   * @param conflicts - Conflicting events
   * @returns Array of resolution suggestions
   */
  private generateConflictSuggestions(
    baseEvent: CalendarEvent,
    conflicts: CalendarEvent[],
  ): string[] {
    const suggestions: string[] = [];
    
    // Suggest rescheduling shorter events
    const durations = [baseEvent, ...conflicts].map(e => 
      e.endTime.diff(e.startTime, 'minutes').minutes
    );
    const shortestDuration = Math.min(...durations);
    const shortestEvent = [baseEvent, ...conflicts].find(e =>
      e.endTime.diff(e.startTime, 'minutes').minutes === shortestDuration
    );
    
    if (shortestEvent) {
      suggestions.push(
        `Consider rescheduling "${shortestEvent.title}" (${shortestDuration} min) as it's the shortest event`
      );
    }
    
    // Suggest making events back-to-back if possible
    if (conflicts.length === 1) {
      const conflict = conflicts[0];
      const gap = Math.abs(
        baseEvent.startTime.diff(conflict.endTime, 'minutes').minutes
      );
      
      if (gap < 30 && gap > 0) {
        suggestions.push(
          `Events are close - consider making them back-to-back to save time`
        );
      }
    }
    
    // Suggest virtual attendance if locations differ
    const locations = [baseEvent, ...conflicts]
      .map(e => e.location)
      .filter(l => l);
    
    if (locations.length > 1 && new Set(locations).size > 1) {
      suggestions.push(
        `Different locations detected - consider virtual attendance for one event`
      );
    }
    
    // Suggest delegation for non-critical events
    const nonCriticalKeywords = ['optional', 'fyi', 'update', 'sync'];
    const hasNonCritical = [baseEvent, ...conflicts].find(e =>
      nonCriticalKeywords.some(keyword => 
        e.title.toLowerCase().includes(keyword)
      )
    );
    
    if (hasNonCritical) {
      suggestions.push(
        `"${hasNonCritical.title}" might be optional - consider delegating or skipping`
      );
    }
    
    return suggestions;
  }

  /**
   * Update last sync timestamps for providers
   * @param userId - The user's ID
   * @param providers - Array of provider sync results
   */
  private async updateSyncTimestamps(
    userId: string,
    providers: any[],
  ): Promise<void> {
    // Update timestamps only for successful syncs
    const updatePromises = providers
      .filter(p => p.success)
      .map(p =>
        this.prisma.calendarIntegration.update({
          where: {
            userId_provider: {
              userId,
              provider: p.provider,
            },
          },
          data: {
            lastSyncedAt: p.lastSyncedAt, // Update last sync time
          },
        })
      );

    await Promise.all(updatePromises);
  }

  /**
   * Check for conflicts when creating a new event
   * @param userId - The user's ID
   * @param startTime - Proposed start time
   * @param endTime - Proposed end time
   * @param excludeEventId - Optional event ID to exclude (for updates)
   * @returns Conflict check results
   */
  async checkNewEventConflicts(
    userId: string,
    startTime: DateTime,
    endTime: DateTime,
    excludeEventId?: string,
  ): Promise<{
    hasConflicts: boolean;
    conflicts: CalendarEvent[];
    suggestions: string[];
  }> {
    const allConflicts: CalendarEvent[] = [];
    
    // Get user's calendar integrations
    const integrations = await this.prisma.calendarIntegration.findMany({
      where: {
        userId,
        isActive: true, // Only check active calendars
      },
    });

    // Check each connected calendar for conflicts
    for (const integration of integrations) {
      try {
        let conflicts: CalendarEvent[] = [];
        
        // Check conflicts based on provider
        switch (integration.provider as CalendarProvider) {
          case CalendarProvider.GOOGLE:
            conflicts = await this.googleCalendar.checkConflicts(
              userId,
              startTime,
              endTime,
            );
            break;
          case CalendarProvider.OUTLOOK:
            conflicts = await this.outlookCalendar.checkConflicts(
              userId,
              startTime,
              endTime,
            );
            break;
        }
        
        // Filter out the event being updated if provided
        if (excludeEventId) {
          conflicts = conflicts.filter(c => c.externalId !== excludeEventId);
        }
        
        allConflicts.push(...conflicts);
      } catch (error) {
        this.logger.error(
          `Failed to check conflicts in ${integration.provider}: ${error.message}`,
        );
      }
    }

    // Generate suggestions if conflicts exist
    const suggestions: string[] = [];
    if (allConflicts.length > 0) {
      // Find available time slots nearby
      const nearbySlots = await this.findAvailableSlots(
        userId,
        startTime,
        endTime.diff(startTime, 'minutes').minutes,
        startTime.minus({ days: 3 }),
        startTime.plus({ days: 3 }),
      );
      
      if (nearbySlots.length > 0) {
        suggestions.push(
          `Available slots nearby: ${nearbySlots.slice(0, 3).map(slot => 
            slot.start.toFormat('MMM dd, HH:mm')
          ).join(', ')}`
        );
      }
      
      // Add conflict-specific suggestions
      suggestions.push(...this.generateConflictSuggestions(
        { startTime, endTime, title: 'New Event' } as CalendarEvent,
        allConflicts,
      ));
    }

    return {
      hasConflicts: allConflicts.length > 0,
      conflicts: allConflicts,
      suggestions,
    };
  }

  /**
   * Find available time slots in calendars
   * @param userId - The user's ID
   * @param duration - Required duration in minutes
   * @param searchStart - Start of search range
   * @param searchEnd - End of search range
   * @returns Array of available time slots
   */
  async findAvailableSlots(
    userId: string,
    startTime: DateTime,
    duration: number,
    searchStart: DateTime,
    searchEnd: DateTime,
  ): Promise<{ start: DateTime; end: DateTime }[]> {
    // Get all events in search range
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: {
          gte: searchStart.toJSDate(), // Events starting after search start
        },
        endTime: {
          lte: searchEnd.toJSDate(), // Events ending before search end
        },
      },
      orderBy: {
        startTime: 'asc', // Order by start time
      },
    });

    const availableSlots: { start: DateTime; end: DateTime }[] = [];
    let currentTime = searchStart;

    // Define working hours (9 AM to 6 PM)
    const workingHoursStart = 9;
    const workingHoursEnd = 18;

    // Iterate through time to find gaps
    for (const event of events) {
      const eventStart = DateTime.fromJSDate(event.startTime);
      
      // Check if there's a gap before this event
      if (currentTime < eventStart) {
        // Check if gap is during working hours
        const gapStart = currentTime.hour < workingHoursStart
          ? currentTime.set({ hour: workingHoursStart, minute: 0 })
          : currentTime;
        
        const gapEnd = eventStart.hour > workingHoursEnd
          ? eventStart.set({ hour: workingHoursEnd, minute: 0 })
          : eventStart;
        
        // Check if gap is long enough
        const gapDuration = gapEnd.diff(gapStart, 'minutes').minutes;
        if (gapDuration >= duration) {
          availableSlots.push({
            start: gapStart,
            end: gapStart.plus({ minutes: duration }),
          });
        }
      }
      
      // Move current time to end of this event
      currentTime = DateTime.fromJSDate(event.endTime);
    }

    // Check for slot after last event
    if (currentTime < searchEnd) {
      const remainingDuration = searchEnd.diff(currentTime, 'minutes').minutes;
      if (remainingDuration >= duration) {
        availableSlots.push({
          start: currentTime,
          end: currentTime.plus({ minutes: duration }),
        });
      }
    }

    return availableSlots.slice(0, 10); // Return up to 10 slots
  }

  /**
   * Scheduled job to sync all user calendars
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledSync(): Promise<void> {
    this.logger.log('Starting scheduled calendar sync...');
    
    try {
      // Get all users with active calendar integrations
      const activeIntegrations = await this.prisma.calendarIntegration.findMany({
        where: {
          isActive: true, // Only active integrations
          OR: [
            { lastSyncedAt: null }, // Never synced
            {
              lastSyncedAt: {
                lte: DateTime.now().minus({ hours: 1 }).toJSDate(), // Last synced over an hour ago
              },
            },
          ],
        },
        select: {
          userId: true, // Only need user IDs
        },
        distinct: ['userId'], // Unique users only
      });

      // Sync each user's calendars
      for (const { userId } of activeIntegrations) {
        try {
          await this.syncAllCalendars(userId);
          this.logger.log(`Synced calendars for user ${userId}`);
        } catch (error) {
          this.logger.error(
            `Failed to sync calendars for user ${userId}: ${error.message}`,
          );
        }
      }

      this.logger.log('Scheduled calendar sync completed');
    } catch (error) {
      this.logger.error(`Scheduled sync failed: ${error.message}`);
    }
  }
}