import { DateTime, IANAZone } from 'luxon';

/**
 * Common timezones used in the application
 */
export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' }, // US Eastern timezone
  { value: 'America/Chicago', label: 'Central Time (CT)' }, // US Central timezone
  { value: 'America/Denver', label: 'Mountain Time (MT)' }, // US Mountain timezone
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' }, // US Pacific timezone
  { value: 'America/Phoenix', label: 'Arizona Time' }, // Arizona (no DST)
  { value: 'Europe/London', label: 'London (GMT/BST)' }, // UK timezone
  { value: 'Europe/Paris', label: 'Central European Time (CET)' }, // Central Europe
  { value: 'Europe/Berlin', label: 'Berlin Time' }, // Germany timezone
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' }, // Japan timezone
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' }, // China timezone
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' }, // UAE timezone
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' }, // India timezone
  { value: 'Australia/Sydney', label: 'Sydney Time (AEDT)' }, // Australia Eastern
  { value: 'Pacific/Auckland', label: 'New Zealand Time (NZDT)' }, // New Zealand
  { value: 'UTC', label: 'UTC/GMT' }, // Coordinated Universal Time
];

/**
 * Timezone utility functions for calendar operations
 */
export class TimezoneUtils {
  /**
   * Convert a datetime from one timezone to another
   * @param dateTime - The datetime to convert
   * @param fromTimezone - Source timezone
   * @param toTimezone - Target timezone
   * @returns Converted DateTime
   */
  static convertTimezone(
    dateTime: DateTime,
    fromTimezone: string,
    toTimezone: string,
  ): DateTime {
    // Set the source timezone and convert to target
    return dateTime.setZone(fromTimezone).setZone(toTimezone);
  }

  /**
   * Get the user's local timezone from browser or system
   * @returns IANA timezone string
   */
  static getLocalTimezone(): string {
    // Try to get timezone from Intl API (browser)
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    
    // Fallback to system timezone
    return DateTime.local().zoneName || 'America/New_York';
  }

  /**
   * Get current offset from UTC for a timezone
   * @param timezone - IANA timezone string
   * @returns Offset in hours (e.g., -5 for EST)
   */
  static getTimezoneOffset(timezone: string): number {
    // Get current offset for the timezone
    const zone = IANAZone.create(timezone);
    if (!zone.isValid) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }
    
    // Return offset in hours
    return DateTime.now().setZone(timezone).offset / 60;
  }

  /**
   * Format timezone for display with offset
   * @param timezone - IANA timezone string
   * @returns Formatted string (e.g., "EST (UTC-5)")
   */
  static formatTimezoneDisplay(timezone: string): string {
    // Get current time in the timezone
    const dt = DateTime.now().setZone(timezone);
    
    // Get timezone abbreviation and offset
    const abbr = dt.toFormat('ZZZZ'); // Timezone abbreviation
    const offset = dt.toFormat('ZZ'); // Offset from UTC
    
    return `${abbr} (UTC${offset})`;
  }

  /**
   * Check if a timezone observes daylight saving time
   * @param timezone - IANA timezone string
   * @returns True if DST is observed
   */
  static observesDST(timezone: string): boolean {
    // Check offset difference between January and July
    const january = DateTime.fromObject({ month: 1, day: 1 }).setZone(timezone);
    const july = DateTime.fromObject({ month: 7, day: 1 }).setZone(timezone);
    
    // If offsets differ, timezone observes DST
    return january.offset !== july.offset;
  }

  /**
   * Get the best meeting time across multiple timezones
   * @param timezones - Array of timezones to consider
   * @param duration - Meeting duration in minutes
   * @param preferredHours - Preferred meeting hours (default 9-17)
   * @returns Suggested meeting times
   */
  static findBestMeetingTime(
    timezones: string[],
    duration: number = 60,
    preferredHours = { start: 9, end: 17 },
  ): Array<{ time: DateTime; scores: Record<string, number> }> {
    const suggestions: Array<{ time: DateTime; scores: Record<string, number> }> = [];
    
    // Start from next hour
    const baseTime = DateTime.now().plus({ hours: 1 }).startOf('hour');
    
    // Check next 48 hours for suitable times
    for (let hourOffset = 0; hourOffset < 48; hourOffset++) {
      const proposedTime = baseTime.plus({ hours: hourOffset });
      const scores: Record<string, number> = {};
      let totalScore = 0;
      
      // Score this time for each timezone
      for (const tz of timezones) {
        const localTime = proposedTime.setZone(tz);
        const hour = localTime.hour;
        
        // Calculate score based on preferred hours
        let score = 0;
        if (hour >= preferredHours.start && hour < preferredHours.end) {
          // Perfect working hours
          score = 100;
        } else if (hour >= 8 && hour < 20) {
          // Acceptable hours
          score = 70;
        } else if (hour >= 7 && hour < 22) {
          // Marginal hours
          score = 40;
        } else {
          // Poor hours (night time)
          score = 10;
        }
        
        scores[tz] = score;
        totalScore += score;
      }
      
      // Calculate average score
      const avgScore = totalScore / timezones.length;
      
      // Only suggest times with reasonable scores
      if (avgScore >= 60) {
        suggestions.push({ time: proposedTime, scores });
      }
    }
    
    // Sort by average score and return top 5
    return suggestions
      .sort((a, b) => {
        const avgA = Object.values(a.scores).reduce((sum, s) => sum + s, 0) / timezones.length;
        const avgB = Object.values(b.scores).reduce((sum, s) => sum + s, 0) / timezones.length;
        return avgB - avgA;
      })
      .slice(0, 5);
  }

  /**
   * Parse a datetime string with timezone
   * @param dateTimeStr - DateTime string
   * @param timezone - Optional timezone (defaults to local)
   * @returns Parsed DateTime object
   */
  static parseWithTimezone(
    dateTimeStr: string,
    timezone?: string,
  ): DateTime {
    // Parse the datetime string
    let dt = DateTime.fromISO(dateTimeStr);
    
    // If invalid, try other formats
    if (!dt.isValid) {
      dt = DateTime.fromRFC2822(dateTimeStr);
    }
    if (!dt.isValid) {
      dt = DateTime.fromSQL(dateTimeStr);
    }
    
    // Apply timezone if provided
    if (timezone && dt.isValid) {
      dt = dt.setZone(timezone);
    }
    
    return dt;
  }

  /**
   * Format datetime for calendar display
   * @param dateTime - DateTime to format
   * @param includeTimezone - Whether to include timezone in output
   * @returns Formatted string
   */
  static formatForCalendar(
    dateTime: DateTime,
    includeTimezone = true,
  ): string {
    // Format based on whether timezone should be included
    if (includeTimezone) {
      return dateTime.toFormat('MMM dd, yyyy HH:mm ZZZZ');
    }
    return dateTime.toFormat('MMM dd, yyyy HH:mm');
  }

  /**
   * Get working hours for a timezone
   * @param timezone - IANA timezone string
   * @param date - Optional date (defaults to today)
   * @returns Working hours in that timezone
   */
  static getWorkingHours(
    timezone: string,
    date?: DateTime,
  ): { start: DateTime; end: DateTime } {
    // Use provided date or today
    const targetDate = date || DateTime.now();
    
    // Set to the target timezone
    const localDate = targetDate.setZone(timezone).startOf('day');
    
    // Return standard working hours (9 AM - 5 PM)
    return {
      start: localDate.set({ hour: 9, minute: 0 }), // 9 AM
      end: localDate.set({ hour: 17, minute: 0 }), // 5 PM
    };
  }

  /**
   * Check if a time is within working hours
   * @param dateTime - DateTime to check
   * @param timezone - Timezone to check in
   * @returns True if within working hours
   */
  static isWorkingHours(
    dateTime: DateTime,
    timezone: string,
  ): boolean {
    // Convert to target timezone
    const localTime = dateTime.setZone(timezone);
    
    // Check if weekend
    if (localTime.weekday > 5) {
      return false; // Saturday or Sunday
    }
    
    // Check if within working hours (9 AM - 5 PM)
    const hour = localTime.hour;
    return hour >= 9 && hour < 17;
  }

  /**
   * Calculate overlap between two time ranges
   * @param start1 - Start of first range
   * @param end1 - End of first range
   * @param start2 - Start of second range
   * @param end2 - End of second range
   * @returns Overlap duration in minutes
   */
  static calculateOverlap(
    start1: DateTime,
    end1: DateTime,
    start2: DateTime,
    end2: DateTime,
  ): number {
    // Find the overlap boundaries
    const overlapStart = DateTime.max(start1, start2);
    const overlapEnd = DateTime.min(end1, end2);
    
    // Calculate overlap duration
    if (overlapStart < overlapEnd) {
      return overlapEnd.diff(overlapStart, 'minutes').minutes;
    }
    
    // No overlap
    return 0;
  }

  /**
   * Get next available slot in working hours
   * @param timezone - Timezone to use
   * @param duration - Required duration in minutes
   * @param startFrom - Optional start time (defaults to now)
   * @returns Next available DateTime slot
   */
  static getNextAvailableSlot(
    timezone: string,
    duration: number,
    startFrom?: DateTime,
  ): DateTime {
    // Start from provided time or now
    let current = (startFrom || DateTime.now()).setZone(timezone);
    
    // Round up to next 15-minute interval
    const minutes = current.minute;
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    current = current.set({ minute: roundedMinutes, second: 0, millisecond: 0 });
    
    // Keep searching for a valid slot
    while (true) {
      // Check if current time is in working hours
      if (this.isWorkingHours(current, timezone)) {
        // Check if there's enough time before end of day
        const workEnd = current.startOf('day').set({ hour: 17, minute: 0 });
        const remainingMinutes = workEnd.diff(current, 'minutes').minutes;
        
        if (remainingMinutes >= duration) {
          return current; // Found a valid slot
        }
      }
      
      // Move to next day's start of working hours
      current = current.plus({ days: 1 }).startOf('day').set({ hour: 9, minute: 0 });
      
      // Skip weekends
      while (current.weekday > 5) {
        current = current.plus({ days: 1 });
      }
    }
  }

  /**
   * Validate if a timezone string is valid
   * @param timezone - Timezone string to validate
   * @returns True if valid IANA timezone
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      // Try to create a zone and check validity
      const zone = IANAZone.create(timezone);
      return zone.isValid;
    } catch {
      return false;
    }
  }

  /**
   * Get timezone from coordinates
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns Estimated timezone (requires external API in production)
   */
  static getTimezoneFromCoordinates(
    latitude: number,
    longitude: number,
  ): string {
    // This is a simplified implementation
    // In production, use a service like Google Time Zone API
    
    // Rough estimation based on longitude
    const offsetHours = Math.round(longitude / 15);
    
    // Map to common timezones (simplified)
    if (longitude >= -180 && longitude < -150) return 'Pacific/Honolulu';
    if (longitude >= -150 && longitude < -120) return 'America/Anchorage';
    if (longitude >= -120 && longitude < -105) return 'America/Los_Angeles';
    if (longitude >= -105 && longitude < -90) return 'America/Denver';
    if (longitude >= -90 && longitude < -75) return 'America/Chicago';
    if (longitude >= -75 && longitude < -60) return 'America/New_York';
    if (longitude >= -60 && longitude < -30) return 'America/Sao_Paulo';
    if (longitude >= -30 && longitude < 0) return 'Atlantic/Azores';
    if (longitude >= 0 && longitude < 15) return 'Europe/London';
    if (longitude >= 15 && longitude < 30) return 'Europe/Paris';
    if (longitude >= 30 && longitude < 45) return 'Europe/Moscow';
    if (longitude >= 45 && longitude < 75) return 'Asia/Dubai';
    if (longitude >= 75 && longitude < 90) return 'Asia/Kolkata';
    if (longitude >= 90 && longitude < 105) return 'Asia/Bangkok';
    if (longitude >= 105 && longitude < 120) return 'Asia/Shanghai';
    if (longitude >= 120 && longitude < 135) return 'Asia/Tokyo';
    if (longitude >= 135 && longitude < 150) return 'Australia/Sydney';
    if (longitude >= 150 && longitude <= 180) return 'Pacific/Auckland';
    
    // Default fallback
    return 'UTC';
  }
}