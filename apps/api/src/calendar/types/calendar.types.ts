import { DateTime } from 'luxon';

/**
 * Supported calendar providers
 */
export enum CalendarProvider {
  GOOGLE = 'GOOGLE', // Google Calendar
  OUTLOOK = 'OUTLOOK', // Microsoft Outlook Calendar
  APPLE = 'APPLE', // Apple Calendar (future)
}

/**
 * Calendar event structure
 */
export interface CalendarEvent {
  id?: string; // Internal ID
  externalId?: string; // External calendar provider ID
  title: string; // Event title
  description?: string; // Event description
  location?: string; // Event location
  startTime: DateTime; // Event start time
  endTime: DateTime; // Event end time
  timezone?: string; // Event timezone
  attendees?: string[]; // List of attendee emails
  reminders?: Array<{ // Reminder settings
    method: 'email' | 'popup';
    minutes: number;
  }>;
  color?: string; // Event color
  htmlLink?: string; // Link to event in external calendar
  status?: string; // Event status (confirmed, tentative, cancelled)
  created?: DateTime; // Creation timestamp
  updated?: DateTime; // Last update timestamp
  isAllDay?: boolean; // All-day event flag
  recurrence?: string; // Recurrence rule (RFC 5545)
  metadata?: Record<string, any>; // Additional provider-specific data
}

/**
 * Calendar sync status
 */
export interface SyncStatus {
  userId: string; // User ID
  startTime: Date; // Sync start time
  endTime: Date | null; // Sync end time
  success: boolean; // Overall success status
  providers: Array<{ // Per-provider status
    provider: CalendarProvider;
    success: boolean;
    eventsCount?: number;
    lastSyncedAt?: Date;
    error?: string;
  }>;
  totalEvents: number; // Total events synced
  conflicts: any[]; // Detected conflicts
  errors: Array<{ // Sync errors
    provider: CalendarProvider | 'SYSTEM';
    message: string;
  }>;
}

/**
 * Calendar conflict resolution strategies
 */
export enum ConflictResolution {
  KEEP_BOTH = 'KEEP_BOTH', // Keep both conflicting events
  KEEP_FIRST = 'KEEP_FIRST', // Keep the first event
  KEEP_SECOND = 'KEEP_SECOND', // Keep the second event
  MERGE = 'MERGE', // Merge events into one
  MANUAL = 'MANUAL', // Require manual resolution
}

/**
 * Calendar integration status
 */
export interface IntegrationStatus {
  provider: CalendarProvider; // Calendar provider
  isConnected: boolean; // Connection status
  lastSyncedAt?: Date; // Last sync timestamp
  syncEnabled: boolean; // Auto-sync enabled
  error?: string; // Last error message
}

/**
 * Calendar notification preferences
 */
export interface CalendarNotificationPrefs {
  emailReminders: boolean; // Send email reminders
  pushReminders: boolean; // Send push notifications
  defaultReminderMinutes: number; // Default reminder time
  conflictAlerts: boolean; // Alert on conflicts
  syncNotifications: boolean; // Notify on sync completion
}