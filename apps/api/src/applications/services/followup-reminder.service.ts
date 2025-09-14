// Follow-up Reminder Service
// Manages automated follow-up reminders for job applications

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from '@/notifications/email.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApplicationStatus } from '@prisma/client';
import { differenceInDays, format, addDays } from 'date-fns';

// Follow-up reminder types
export enum FollowUpType {
  THANK_YOU = 'thank_you',
  STATUS_CHECK = 'status_check',
  DOCUMENT_SUBMISSION = 'document',
  OFFER_RESPONSE = 'offer_response',
  REJECTION_FOLLOWUP = 'rejection_followup',
  GENERAL = 'general'
}

// Follow-up reminder configuration
export interface FollowUpConfig {
  type: FollowUpType;
  daysAfter: number;
  enabled: boolean;
  template: string;
}

// Follow-up reminder DTO
export class CreateFollowUpDto {
  applicationId: string;
  type: FollowUpType;
  dueDate: Date;
  message?: string;
  sendEmail?: boolean;
}

// Follow-up status
export interface FollowUpStatus {
  id: string;
  applicationId: string;
  type: FollowUpType;
  dueDate: Date;
  completed: boolean;
  completedAt?: Date;
  message?: string;
}

@Injectable()
export class FollowUpReminderService {
  private followUpConfigs: FollowUpConfig[] = [
    {
      type: FollowUpType.THANK_YOU,
      daysAfter: 1,
      enabled: true,
      template: 'thank_you_reminder'
    },
    {
      type: FollowUpType.STATUS_CHECK,
      daysAfter: 7,
      enabled: true,
      template: 'status_check_reminder'
    },
    {
      type: FollowUpType.OFFER_RESPONSE,
      daysAfter: 2,
      enabled: true,
      template: 'offer_response_reminder'
    }
  ];

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) {}

  // Create a follow-up reminder
  async createFollowUp(userId: string, dto: CreateFollowUpDto): Promise<FollowUpStatus> {
    // Verify application belongs to user
    const application = await this.prisma.application.findFirst({
      where: {
        id: dto.applicationId,
        userId
      },
      include: {
        job: true
      }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Create follow-up note
    const followUpNote = await this.prisma.applicationNote.create({
      data: {
        applicationId: dto.applicationId,
        type: 'FOLLOWUP',
        content: JSON.stringify({
          type: dto.type,
          dueDate: dto.dueDate,
          completed: false,
          message: dto.message
        })
      }
    });

    // Add activity
    await this.prisma.applicationActivity.create({
      data: {
        applicationId: dto.applicationId,
        action: 'Follow-up Scheduled',
        description: `${dto.type} follow-up scheduled for ${format(dto.dueDate, 'PP')}`
      }
    });

    // Send email reminder if requested
    if (dto.sendEmail) {
      await this.scheduleEmailReminder(application, dto);
    }

    return {
      id: followUpNote.id,
      applicationId: dto.applicationId,
      type: dto.type,
      dueDate: dto.dueDate,
      completed: false,
      message: dto.message
    };
  }

  // Schedule email reminder
  private async scheduleEmailReminder(application: any, dto: CreateFollowUpDto) {
    // In production, use a job queue to schedule the email
    // For now, we'll send immediately if due date is today
    const daysUntilDue = differenceInDays(dto.dueDate, new Date());
    
    if (daysUntilDue <= 0) {
      await this.sendFollowUpReminder(
        application.user.email,
        application.user.name || 'User',
        {
          company: application.company,
          position: application.job?.title || 'Position',
          type: dto.type,
          message: dto.message
        }
      );
    }
  }

  // Send follow-up reminder email
  private async sendFollowUpReminder(to: string, name: string, details: any) {
    const typeMessages = {
      [FollowUpType.THANK_YOU]: 'send a thank you note',
      [FollowUpType.STATUS_CHECK]: 'check on your application status',
      [FollowUpType.DOCUMENT_SUBMISSION]: 'submit requested documents',
      [FollowUpType.OFFER_RESPONSE]: 'respond to the job offer',
      [FollowUpType.REJECTION_FOLLOWUP]: 'follow up after rejection',
      [FollowUpType.GENERAL]: 'follow up on your application'
    };

    const subject = `Reminder: Follow up with ${details.company}`;
    const html = `
      <h2>Follow-up Reminder</h2>
      <p>Hi ${name},</p>
      <p>This is a reminder to ${typeMessages[details.type]} for your application at <strong>${details.company}</strong> for the <strong>${details.position}</strong> position.</p>
      ${details.message ? `<p><em>${details.message}</em></p>` : ''}
      <p>Taking timely action can improve your chances of success!</p>
    `;

    await this.emailService.sendEmail(to, subject, html);
  }

  // Mark follow-up as completed
  async completeFollowUp(userId: string, followUpId: string) {
    const followUpNote = await this.prisma.applicationNote.findFirst({
      where: {
        id: followUpId,
        type: 'FOLLOWUP',
        application: {
          userId
        }
      }
    });

    if (!followUpNote) {
      throw new Error('Follow-up not found');
    }

    const followUpData = JSON.parse(followUpNote.content);
    followUpData.completed = true;
    followUpData.completedAt = new Date();

    // Update the note
    await this.prisma.applicationNote.update({
      where: { id: followUpId },
      data: {
        content: JSON.stringify(followUpData)
      }
    });

    // Add activity
    await this.prisma.applicationActivity.create({
      data: {
        applicationId: followUpNote.applicationId,
        action: 'Follow-up Completed',
        description: `${followUpData.type} follow-up marked as complete`
      }
    });

    return { success: true };
  }

  // Get pending follow-ups for a user
  async getPendingFollowUps(userId: string): Promise<FollowUpStatus[]> {
    const followUpNotes = await this.prisma.applicationNote.findMany({
      where: {
        type: 'FOLLOWUP',
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

    const pendingFollowUps: FollowUpStatus[] = [];

    for (const note of followUpNotes) {
      try {
        const data = JSON.parse(note.content);
        if (!data.completed) {
          pendingFollowUps.push({
            id: note.id,
            applicationId: note.applicationId,
            type: data.type,
            dueDate: new Date(data.dueDate),
            completed: false,
            message: data.message
          });
        }
      } catch (e) {
        continue;
      }
    }

    return pendingFollowUps.sort(
      (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
    );
  }

  // Get overdue follow-ups
  async getOverdueFollowUps(userId: string): Promise<FollowUpStatus[]> {
    const pendingFollowUps = await this.getPendingFollowUps(userId);
    const now = new Date();

    return pendingFollowUps.filter(followUp => followUp.dueDate < now);
  }

  // Automatically create follow-ups based on application status changes
  async createAutomaticFollowUps(applicationId: string, newStatus: ApplicationStatus) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        user: true,
        job: true
      }
    });

    if (!application) return;

    // Determine which follow-up to create based on status
    let followUpType: FollowUpType | null = null;
    let daysAfter = 0;

    switch (newStatus) {
      case 'INTERVIEWING':
        followUpType = FollowUpType.THANK_YOU;
        daysAfter = 1;
        break;
      case 'OFFERED':
        followUpType = FollowUpType.OFFER_RESPONSE;
        daysAfter = 2;
        break;
      case 'REJECTED':
        followUpType = FollowUpType.REJECTION_FOLLOWUP;
        daysAfter = 3;
        break;
      case 'APPLIED':
        followUpType = FollowUpType.STATUS_CHECK;
        daysAfter = 7;
        break;
    }

    if (followUpType) {
      const config = this.followUpConfigs.find(c => c.type === followUpType);
      if (config?.enabled) {
        await this.createFollowUp(application.userId, {
          applicationId,
          type: followUpType,
          dueDate: addDays(new Date(), daysAfter),
          sendEmail: true
        });
      }
    }
  }

  // Daily cron job to send follow-up reminders
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDailyFollowUpReminders() {
    console.log('Running daily follow-up reminder job...');

    // Get all pending follow-ups due today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = addDays(today, 1);

    const dueFollowUps = await this.prisma.applicationNote.findMany({
      where: {
        type: 'FOLLOWUP'
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

    for (const note of dueFollowUps) {
      try {
        const data = JSON.parse(note.content);
        const dueDate = new Date(data.dueDate);
        
        if (!data.completed && dueDate >= today && dueDate < tomorrow) {
          // Send reminder email
          if (note.application.user.email) {
            await this.sendFollowUpReminder(
              note.application.user.email,
              note.application.user.name || 'User',
              {
                company: note.application.company,
                position: note.application.job?.title || 'Position',
                type: data.type,
                message: data.message
              }
            );
          }
        }
      } catch (e) {
        console.error('Error processing follow-up:', e);
      }
    }
  }

  // Get follow-up statistics
  async getFollowUpStatistics(userId: string) {
    const followUpNotes = await this.prisma.applicationNote.findMany({
      where: {
        type: 'FOLLOWUP',
        application: {
          userId
        }
      }
    });

    const stats = {
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
      byType: {} as Record<FollowUpType, number>,
      completionRate: 0
    };

    const now = new Date();

    for (const note of followUpNotes) {
      try {
        const data = JSON.parse(note.content);
        stats.total++;

        if (data.completed) {
          stats.completed++;
        } else {
          stats.pending++;
          if (new Date(data.dueDate) < now) {
            stats.overdue++;
          }
        }

        stats.byType[data.type] = (stats.byType[data.type] || 0) + 1;
      } catch (e) {
        continue;
      }
    }

    stats.completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

    return stats;
  }

  // Snooze a follow-up reminder
  async snoozeFollowUp(userId: string, followUpId: string, newDueDate: Date) {
    const followUpNote = await this.prisma.applicationNote.findFirst({
      where: {
        id: followUpId,
        type: 'FOLLOWUP',
        application: {
          userId
        }
      }
    });

    if (!followUpNote) {
      throw new Error('Follow-up not found');
    }

    const followUpData = JSON.parse(followUpNote.content);
    const oldDueDate = followUpData.dueDate;
    followUpData.dueDate = newDueDate;
    followUpData.snoozed = true;
    followUpData.snoozedFrom = oldDueDate;

    // Update the note
    await this.prisma.applicationNote.update({
      where: { id: followUpId },
      data: {
        content: JSON.stringify(followUpData)
      }
    });

    // Add activity
    await this.prisma.applicationActivity.create({
      data: {
        applicationId: followUpNote.applicationId,
        action: 'Follow-up Snoozed',
        description: `Follow-up moved from ${format(new Date(oldDueDate), 'PP')} to ${format(newDueDate, 'PP')}`
      }
    });

    return { success: true };
  }

  // Get follow-up templates
  getFollowUpTemplates(type: FollowUpType): string[] {
    const templates = {
      [FollowUpType.THANK_YOU]: [
        'Thank you for taking the time to meet with me today. I enjoyed our conversation about [specific topic] and am very interested in the opportunity.',
        'I wanted to express my gratitude for our interview yesterday. Your insights about [company aspect] were particularly inspiring.',
        'Thank you for the opportunity to learn more about the role. I\'m excited about the possibility of contributing to [specific project/goal].'
      ],
      [FollowUpType.STATUS_CHECK]: [
        'I wanted to follow up on my application submitted on [date]. I remain very interested in the position and would love to discuss how I can contribute.',
        'I hope this finds you well. I\'m following up on my application for [position]. Please let me know if you need any additional information.',
        'I\'m writing to express my continued interest in the [position] role. I\'d be happy to provide any additional materials you might need.'
      ],
      [FollowUpType.OFFER_RESPONSE]: [
        'Thank you for the offer! I\'m excited about the opportunity and would like to discuss [specific aspect] before making my decision.',
        'I\'m thrilled to receive your offer. I have a few questions about [benefits/start date/etc] that I\'d like to clarify.',
        'Thank you for this wonderful opportunity. I\'m reviewing the offer details and will get back to you by [date].'
      ],
      [FollowUpType.DOCUMENT_SUBMISSION]: [
        'As requested, I\'m submitting [document type]. Please let me know if you need anything else.',
        'Please find attached the [documents] you requested. I\'m happy to provide any additional information.',
        'I\'ve completed and attached the requested [documents]. Looking forward to the next steps.'
      ],
      [FollowUpType.REJECTION_FOLLOWUP]: [
        'Thank you for considering my application. I\'d appreciate any feedback that could help me in future applications.',
        'While disappointed, I appreciate the opportunity to interview. I remain interested in future opportunities with [company].',
        'Thank you for your time and consideration. Please keep me in mind for future positions that match my skills.'
      ],
      [FollowUpType.GENERAL]: [
        'I wanted to touch base regarding my application. Please let me know if there\'s anything else you need from me.',
        'Following up on our recent communication. I\'m available for any additional discussions or interviews.',
        'I hope this finds you well. I remain very interested in the opportunity and am available at your convenience.'
      ]
    };

    return templates[type] || [];
  }
}