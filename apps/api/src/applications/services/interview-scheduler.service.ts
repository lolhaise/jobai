// Interview Scheduling Service
// Manages interview scheduling, calendar integration, and reminders

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from '@/notifications/email.service';
import { addMinutes, format, isBefore, isAfter } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// Interview scheduling DTO
export class ScheduleInterviewDto {
  applicationId: string;
  scheduledAt: Date;
  duration: number; // in minutes
  type: 'phone' | 'video' | 'onsite';
  location?: string;
  meetingLink?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  notes?: string;
  sendReminders?: boolean;
}

// Interview reminder settings
export interface ReminderSettings {
  enabled: boolean;
  daysBefore: number[];
  hoursBefore: number[];
}

// Calendar event interface
export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: string[];
  reminders: number[]; // minutes before
}

@Injectable()
export class InterviewSchedulerService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) {}

  // Schedule an interview
  async scheduleInterview(userId: string, dto: ScheduleInterviewDto) {
    // Verify application belongs to user
    const application = await this.prisma.application.findFirst({
      where: {
        id: dto.applicationId,
        userId
      },
      include: {
        job: true,
        user: true
      }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Check for conflicts
    const hasConflict = await this.checkScheduleConflict(userId, dto.scheduledAt, dto.duration);
    if (hasConflict) {
      throw new Error('Schedule conflict detected');
    }

    // Create interview record (stored in notes for now - in production, use dedicated model)
    const interviewId = uuidv4();
    const interviewData = {
      id: interviewId,
      scheduledAt: dto.scheduledAt,
      duration: dto.duration,
      type: dto.type,
      location: dto.location,
      meetingLink: dto.meetingLink,
      interviewerName: dto.interviewerName,
      interviewerEmail: dto.interviewerEmail,
      status: 'scheduled'
    };

    // Update application status and add interview note
    const [updatedApplication, interviewNote] = await Promise.all([
      this.prisma.application.update({
        where: { id: dto.applicationId },
        data: {
          status: 'INTERVIEWING',
          activities: {
            create: {
              action: 'Interview Scheduled',
              description: `${dto.type} interview scheduled for ${format(dto.scheduledAt, 'PPpp')}`
            }
          }
        }
      }),
      this.prisma.applicationNote.create({
        data: {
          applicationId: dto.applicationId,
          content: JSON.stringify(interviewData),
          type: 'INTERVIEW'
        }
      })
    ]);

    // Send confirmation email
    if (application.user.email) {
      await this.sendInterviewConfirmation(
        application.user.email,
        application.user.name || 'Candidate',
        {
          company: application.company,
          position: application.job?.title || 'Position',
          ...dto
        }
      );
    }

    // Schedule reminders
    if (dto.sendReminders) {
      await this.scheduleReminders(interviewId, dto.scheduledAt, application.user.email!);
    }

    // Generate calendar event
    const calendarEvent = this.generateCalendarEvent(application, dto);

    return {
      interview: interviewData,
      calendarEvent,
      confirmationSent: true
    };
  }

  // Check for schedule conflicts
  private async checkScheduleConflict(
    userId: string,
    scheduledAt: Date,
    duration: number
  ): Promise<boolean> {
    const endTime = addMinutes(scheduledAt, duration);

    // Get all interviews for the user
    const existingInterviews = await this.prisma.applicationNote.findMany({
      where: {
        application: {
          userId
        },
        type: 'INTERVIEW'
      }
    });

    // Check for conflicts
    for (const interview of existingInterviews) {
      try {
        const data = JSON.parse(interview.content);
        const existingStart = new Date(data.scheduledAt);
        const existingEnd = addMinutes(existingStart, data.duration);

        // Check if times overlap
        if (
          (isAfter(scheduledAt, existingStart) && isBefore(scheduledAt, existingEnd)) ||
          (isAfter(endTime, existingStart) && isBefore(endTime, existingEnd)) ||
          (isBefore(scheduledAt, existingStart) && isAfter(endTime, existingEnd))
        ) {
          return true;
        }
      } catch (e) {
        // Invalid interview data, skip
        continue;
      }
    }

    return false;
  }

  // Send interview confirmation email
  private async sendInterviewConfirmation(
    to: string,
    name: string,
    details: any
  ) {
    const subject = `Interview Confirmation - ${details.company}`;
    const html = `
      <h2>Interview Confirmed!</h2>
      <p>Hi ${name},</p>
      <p>Your interview has been scheduled with the following details:</p>
      <ul>
        <li><strong>Company:</strong> ${details.company}</li>
        <li><strong>Position:</strong> ${details.position}</li>
        <li><strong>Date & Time:</strong> ${format(details.scheduledAt, 'PPpp')}</li>
        <li><strong>Duration:</strong> ${details.duration} minutes</li>
        <li><strong>Type:</strong> ${details.type}</li>
        ${details.location ? `<li><strong>Location:</strong> ${details.location}</li>` : ''}
        ${details.meetingLink ? `<li><strong>Meeting Link:</strong> <a href="${details.meetingLink}">${details.meetingLink}</a></li>` : ''}
        ${details.interviewerName ? `<li><strong>Interviewer:</strong> ${details.interviewerName}</li>` : ''}
      </ul>
      ${details.notes ? `<p><strong>Notes:</strong> ${details.notes}</p>` : ''}
      <p>Good luck!</p>
    `;

    await this.emailService.sendEmail(to, subject, html);
  }

  // Schedule interview reminders
  private async scheduleReminders(
    interviewId: string,
    scheduledAt: Date,
    email: string
  ) {
    const reminders = [
      { days: 1, hours: 0 }, // 1 day before
      { days: 0, hours: 2 }  // 2 hours before
    ];

    for (const reminder of reminders) {
      const reminderTime = new Date(scheduledAt);
      reminderTime.setDate(reminderTime.getDate() - reminder.days);
      reminderTime.setHours(reminderTime.getHours() - reminder.hours);

      // In production, use a job queue like Bull to schedule the actual reminder
      // For now, we'll just log it
      console.log(`Reminder scheduled for ${reminderTime} for interview ${interviewId}`);
    }
  }

  // Generate calendar event
  private generateCalendarEvent(application: any, dto: ScheduleInterviewDto): CalendarEvent {
    const endTime = addMinutes(dto.scheduledAt, dto.duration);

    return {
      id: uuidv4(),
      title: `Interview with ${application.company}`,
      description: `${dto.type} interview for ${application.job?.title || 'Position'}\n\n${dto.notes || ''}`,
      startTime: dto.scheduledAt,
      endTime,
      location: dto.location || dto.meetingLink,
      attendees: [
        application.user.email,
        ...(dto.interviewerEmail ? [dto.interviewerEmail] : [])
      ],
      reminders: [15, 60] // 15 and 60 minutes before
    };
  }

  // Reschedule an interview
  async rescheduleInterview(
    userId: string,
    interviewId: string,
    newScheduledAt: Date
  ) {
    // Find the interview note
    const interviewNote = await this.prisma.applicationNote.findFirst({
      where: {
        id: interviewId,
        type: 'INTERVIEW',
        application: {
          userId
        }
      },
      include: {
        application: {
          include: {
            user: true,
            job: true
          }
        }
      }
    });

    if (!interviewNote) {
      throw new Error('Interview not found');
    }

    const interviewData = JSON.parse(interviewNote.content);
    const oldScheduledAt = new Date(interviewData.scheduledAt);

    // Check for conflicts with new time
    const hasConflict = await this.checkScheduleConflict(
      userId,
      newScheduledAt,
      interviewData.duration
    );

    if (hasConflict) {
      throw new Error('Schedule conflict with new time');
    }

    // Update interview data
    interviewData.scheduledAt = newScheduledAt;
    interviewData.rescheduled = true;
    interviewData.previousScheduledAt = oldScheduledAt;

    // Update the note
    await this.prisma.applicationNote.update({
      where: { id: interviewId },
      data: {
        content: JSON.stringify(interviewData)
      }
    });

    // Add activity
    await this.prisma.applicationActivity.create({
      data: {
        applicationId: interviewNote.applicationId,
        action: 'Interview Rescheduled',
        description: `Interview moved from ${format(oldScheduledAt, 'PPpp')} to ${format(newScheduledAt, 'PPpp')}`
      }
    });

    // Send rescheduling notification
    if (interviewNote.application.user.email) {
      await this.sendRescheduleNotification(
        interviewNote.application.user.email,
        interviewNote.application.user.name || 'Candidate',
        {
          company: interviewNote.application.company,
          position: interviewNote.application.job?.title || 'Position',
          oldScheduledAt,
          newScheduledAt,
          ...interviewData
        }
      );
    }

    return {
      success: true,
      interview: interviewData
    };
  }

  // Send reschedule notification
  private async sendRescheduleNotification(
    to: string,
    name: string,
    details: any
  ) {
    const subject = `Interview Rescheduled - ${details.company}`;
    const html = `
      <h2>Interview Rescheduled</h2>
      <p>Hi ${name},</p>
      <p>Your interview with ${details.company} has been rescheduled.</p>
      <p><strong>Previous Time:</strong> ${format(details.oldScheduledAt, 'PPpp')}</p>
      <p><strong>New Time:</strong> ${format(details.newScheduledAt, 'PPpp')}</p>
      <p>All other details remain the same.</p>
    `;

    await this.emailService.sendEmail(to, subject, html);
  }

  // Cancel an interview
  async cancelInterview(
    userId: string,
    interviewId: string,
    reason?: string
  ) {
    const interviewNote = await this.prisma.applicationNote.findFirst({
      where: {
        id: interviewId,
        type: 'INTERVIEW',
        application: {
          userId
        }
      },
      include: {
        application: {
          include: {
            user: true
          }
        }
      }
    });

    if (!interviewNote) {
      throw new Error('Interview not found');
    }

    const interviewData = JSON.parse(interviewNote.content);
    interviewData.status = 'cancelled';
    interviewData.cancelledAt = new Date();
    interviewData.cancellationReason = reason;

    // Update the note
    await this.prisma.applicationNote.update({
      where: { id: interviewId },
      data: {
        content: JSON.stringify(interviewData)
      }
    });

    // Add activity
    await this.prisma.applicationActivity.create({
      data: {
        applicationId: interviewNote.applicationId,
        action: 'Interview Cancelled',
        description: reason || 'Interview cancelled'
      }
    });

    // Send cancellation notification
    if (interviewNote.application.user.email) {
      await this.sendCancellationNotification(
        interviewNote.application.user.email,
        interviewNote.application.user.name || 'Candidate',
        {
          company: interviewNote.application.company,
          scheduledAt: new Date(interviewData.scheduledAt),
          reason
        }
      );
    }

    return { success: true };
  }

  // Send cancellation notification
  private async sendCancellationNotification(
    to: string,
    name: string,
    details: any
  ) {
    const subject = `Interview Cancelled - ${details.company}`;
    const html = `
      <h2>Interview Cancelled</h2>
      <p>Hi ${name},</p>
      <p>Your interview with ${details.company} scheduled for ${format(details.scheduledAt, 'PPpp')} has been cancelled.</p>
      ${details.reason ? `<p><strong>Reason:</strong> ${details.reason}</p>` : ''}
      <p>We'll keep you updated on next steps.</p>
    `;

    await this.emailService.sendEmail(to, subject, html);
  }

  // Get upcoming interviews for a user
  async getUpcomingInterviews(userId: string) {
    const interviewNotes = await this.prisma.applicationNote.findMany({
      where: {
        type: 'INTERVIEW',
        application: {
          userId
        }
      },
      include: {
        application: {
          include: {
            job: true
          }
        }
      }
    });

    const now = new Date();
    const upcomingInterviews = [];

    for (const note of interviewNotes) {
      try {
        const data = JSON.parse(note.content);
        if (
          data.status === 'scheduled' &&
          new Date(data.scheduledAt) > now
        ) {
          upcomingInterviews.push({
            id: note.id,
            applicationId: note.applicationId,
            company: note.application.company,
            position: note.application.job?.title || 'Position',
            ...data
          });
        }
      } catch (e) {
        continue;
      }
    }

    return upcomingInterviews.sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  }

  // Generate ICS file for calendar import
  generateICSFile(event: CalendarEvent): string {
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//JobAI//Interview Calendar//EN
BEGIN:VEVENT
UID:${event.id}@jobai.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(event.startTime)}
DTEND:${formatDate(event.endTime)}
SUMMARY:${event.title}
DESCRIPTION:${event.description.replace(/\n/g, '\\n')}
${event.location ? `LOCATION:${event.location}` : ''}
${event.attendees.map(email => `ATTENDEE:mailto:${email}`).join('\n')}
${event.reminders.map(minutes => `BEGIN:VALARM\nTRIGGER:-PT${minutes}M\nACTION:DISPLAY\nDESCRIPTION:Interview Reminder\nEND:VALARM`).join('\n')}
END:VEVENT
END:VCALENDAR`;

    return ics;
  }
}