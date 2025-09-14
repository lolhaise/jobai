// Analytics Service for Application Dashboard
// Provides comprehensive metrics and insights for job applications

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ApplicationStatus } from '@prisma/client';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

// Interface for dashboard metrics
export interface DashboardMetrics {
  totalApplications: number;
  activeApplications: number;
  successRate: number;
  averageResponseTime: number;
  interviewRate: number;
  offerRate: number;
  rejectionRate: number;
  applicationsByStatus: Record<ApplicationStatus, number>;
  recentActivity: ActivityItem[];
  upcomingInterviews: Interview[];
  pendingFollowUps: FollowUp[];
}

// Interface for time series data
export interface TimeSeriesData {
  date: string;
  applications: number;
  interviews: number;
  offers: number;
  rejections: number;
}

// Interface for activity items
export interface ActivityItem {
  id: string;
  type: 'application' | 'interview' | 'offer' | 'rejection' | 'followup';
  title: string;
  description: string;
  timestamp: Date;
  applicationId: string;
}

// Interface for interviews
export interface Interview {
  id: string;
  applicationId: string;
  company: string;
  position: string;
  scheduledAt: Date;
  duration: number;
  type: 'phone' | 'video' | 'onsite';
  notes?: string;
}

// Interface for follow-ups
export interface FollowUp {
  id: string;
  applicationId: string;
  company: string;
  position: string;
  dueDate: Date;
  type: 'thank_you' | 'status_check' | 'document' | 'other';
  notes?: string;
}

// Interface for application funnel
export interface ApplicationFunnel {
  stage: string;
  count: number;
  percentage: number;
  averageTime: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // Get comprehensive dashboard metrics
  async getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
    const [applications, interviews, offers, activity, upcomingInterviews, pendingFollowUps] = await Promise.all([
      this.getApplicationStats(userId),
      this.getInterviewStats(userId),
      this.getOfferStats(userId),
      this.getRecentActivity(userId),
      this.getUpcomingInterviews(userId),
      this.getPendingFollowUps(userId)
    ]);

    // Calculate success metrics
    const totalApplications = applications.total;
    const activeApplications = applications.active;
    const successRate = totalApplications > 0 ? (offers.count / totalApplications) * 100 : 0;
    const interviewRate = totalApplications > 0 ? (interviews.count / totalApplications) * 100 : 0;
    const offerRate = interviews.count > 0 ? (offers.count / interviews.count) * 100 : 0;
    const rejectionRate = totalApplications > 0 ? (applications.rejected / totalApplications) * 100 : 0;

    // Calculate average response time
    const averageResponseTime = await this.calculateAverageResponseTime(userId);

    return {
      totalApplications,
      activeApplications,
      successRate,
      averageResponseTime,
      interviewRate,
      offerRate,
      rejectionRate,
      applicationsByStatus: applications.byStatus,
      recentActivity: activity,
      upcomingInterviews,
      pendingFollowUps
    };
  }

  // Get application statistics
  private async getApplicationStats(userId: string) {
    const applications = await this.prisma.application.findMany({
      where: { userId },
      select: { status: true, createdAt: true }
    });

    const byStatus = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<ApplicationStatus, number>);

    const active = applications.filter(app => 
      !['REJECTED', 'ACCEPTED', 'WITHDRAWN'].includes(app.status)
    ).length;

    const rejected = byStatus.REJECTED || 0;

    return {
      total: applications.length,
      active,
      rejected,
      byStatus
    };
  }

  // Get interview statistics
  private async getInterviewStats(userId: string) {
    const interviews = await this.prisma.application.count({
      where: {
        userId,
        status: {
          in: ['INTERVIEWING', 'OFFERED', 'ACCEPTED']
        }
      }
    });

    return { count: interviews };
  }

  // Get offer statistics
  private async getOfferStats(userId: string) {
    const offers = await this.prisma.application.count({
      where: {
        userId,
        status: {
          in: ['OFFERED', 'ACCEPTED']
        }
      }
    });

    return { count: offers };
  }

  // Calculate average response time in days
  private async calculateAverageResponseTime(userId: string): Promise<number> {
    const applications = await this.prisma.application.findMany({
      where: {
        userId,
        status: {
          not: 'APPLIED'
        }
      },
      select: {
        createdAt: true,
        activities: {
          orderBy: { createdAt: 'asc' },
          take: 2
        }
      }
    });

    const responseTimes = applications
      .filter(app => app.activities.length >= 2)
      .map(app => {
        const applied = app.createdAt.getTime();
        const firstResponse = app.activities[1].createdAt.getTime();
        return (firstResponse - applied) / (1000 * 60 * 60 * 24); // Convert to days
      });

    if (responseTimes.length === 0) return 0;
    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }

  // Get recent activity
  private async getRecentActivity(userId: string): Promise<ActivityItem[]> {
    const activities = await this.prisma.applicationActivity.findMany({
      where: {
        application: { userId }
      },
      include: {
        application: {
          include: {
            job: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return activities.map(activity => ({
      id: activity.id,
      type: this.mapActivityType(activity.action),
      title: activity.action,
      description: `${activity.description} - ${activity.application.job?.title || 'Unknown Position'}`,
      timestamp: activity.createdAt,
      applicationId: activity.applicationId
    }));
  }

  // Map activity action to type
  private mapActivityType(action: string): ActivityItem['type'] {
    if (action.toLowerCase().includes('interview')) return 'interview';
    if (action.toLowerCase().includes('offer')) return 'offer';
    if (action.toLowerCase().includes('reject')) return 'rejection';
    if (action.toLowerCase().includes('follow')) return 'followup';
    return 'application';
  }

  // Get upcoming interviews
  private async getUpcomingInterviews(userId: string): Promise<Interview[]> {
    const applications = await this.prisma.application.findMany({
      where: {
        userId,
        status: 'INTERVIEWING',
        notes: {
          some: {
            content: {
              contains: 'interview'
            }
          }
        }
      },
      include: {
        job: true,
        notes: {
          where: {
            content: {
              contains: 'interview'
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // Parse interview details from notes (in a real app, we'd have a dedicated Interview model)
    return applications
      .filter(app => app.notes.length > 0)
      .map(app => {
        const note = app.notes[0];
        // Extract date from note content (simplified - in production, use structured data)
        const scheduledAt = this.extractDateFromNote(note.content);
        
        return {
          id: note.id,
          applicationId: app.id,
          company: app.company,
          position: app.job?.title || 'Unknown Position',
          scheduledAt: scheduledAt || new Date(),
          duration: 60, // Default 60 minutes
          type: this.extractInterviewType(note.content) as Interview['type'],
          notes: note.content
        };
      })
      .filter(interview => interview.scheduledAt > new Date())
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  // Extract date from note content (simplified)
  private extractDateFromNote(content: string): Date | null {
    // Simple date extraction - in production, use proper date parsing
    const dateMatch = content.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (dateMatch) {
      return new Date(dateMatch[1]);
    }
    return null;
  }

  // Extract interview type from note content
  private extractInterviewType(content: string): string {
    const lower = content.toLowerCase();
    if (lower.includes('phone')) return 'phone';
    if (lower.includes('video') || lower.includes('zoom') || lower.includes('teams')) return 'video';
    if (lower.includes('onsite') || lower.includes('in-person')) return 'onsite';
    return 'video'; // Default
  }

  // Get pending follow-ups
  private async getPendingFollowUps(userId: string): Promise<FollowUp[]> {
    const applications = await this.prisma.application.findMany({
      where: {
        userId,
        status: {
          in: ['APPLIED', 'INTERVIEWING']
        },
        updatedAt: {
          lt: subDays(new Date(), 7) // Not updated in the last 7 days
        }
      },
      include: {
        job: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    return applications.map(app => ({
      id: `followup-${app.id}`,
      applicationId: app.id,
      company: app.company,
      position: app.job?.title || 'Unknown Position',
      dueDate: new Date(app.updatedAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      type: this.determineFollowUpType(app) as FollowUp['type'],
      notes: `Last activity: ${app.activities[0]?.action || 'Application submitted'}`
    }));
  }

  // Determine follow-up type based on application status
  private determineFollowUpType(app: any): string {
    if (app.status === 'INTERVIEWING') return 'thank_you';
    if (app.activities.length === 0) return 'status_check';
    return 'other';
  }

  // Get time series data for charts
  async getTimeSeriesData(userId: string, days: number = 30): Promise<TimeSeriesData[]> {
    const startDate = subDays(new Date(), days);
    
    const applications = await this.prisma.application.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate
        }
      },
      select: {
        createdAt: true,
        status: true,
        activities: {
          select: {
            action: true,
            createdAt: true
          }
        }
      }
    });

    // Group by date
    const dataByDate = new Map<string, TimeSeriesData>();
    
    for (let i = 0; i <= days; i++) {
      const date = format(subDays(new Date(), days - i), 'yyyy-MM-dd');
      dataByDate.set(date, {
        date,
        applications: 0,
        interviews: 0,
        offers: 0,
        rejections: 0
      });
    }

    // Count applications by date
    applications.forEach(app => {
      const date = format(app.createdAt, 'yyyy-MM-dd');
      const data = dataByDate.get(date);
      if (data) {
        data.applications++;
        
        // Count status changes
        if (app.status === 'INTERVIEWING') data.interviews++;
        if (app.status === 'OFFERED' || app.status === 'ACCEPTED') data.offers++;
        if (app.status === 'REJECTED') data.rejections++;
      }
    });

    return Array.from(dataByDate.values());
  }

  // Get application funnel data
  async getApplicationFunnel(userId: string): Promise<ApplicationFunnel[]> {
    const applications = await this.prisma.application.findMany({
      where: { userId },
      include: {
        activities: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    const funnel: ApplicationFunnel[] = [
      { stage: 'Applied', count: 0, percentage: 100, averageTime: 0 },
      { stage: 'Screened', count: 0, percentage: 0, averageTime: 0 },
      { stage: 'Interviewed', count: 0, percentage: 0, averageTime: 0 },
      { stage: 'Offered', count: 0, percentage: 0, averageTime: 0 },
      { stage: 'Accepted', count: 0, percentage: 0, averageTime: 0 }
    ];

    const total = applications.length;
    if (total === 0) return funnel;

    // Count applications at each stage
    applications.forEach(app => {
      funnel[0].count++; // Applied
      
      if (['SCREENING', 'INTERVIEWING', 'OFFERED', 'ACCEPTED', 'REJECTED'].includes(app.status)) {
        funnel[1].count++; // Screened
      }
      
      if (['INTERVIEWING', 'OFFERED', 'ACCEPTED'].includes(app.status)) {
        funnel[2].count++; // Interviewed
      }
      
      if (['OFFERED', 'ACCEPTED'].includes(app.status)) {
        funnel[3].count++; // Offered
      }
      
      if (app.status === 'ACCEPTED') {
        funnel[4].count++; // Accepted
      }
    });

    // Calculate percentages and average times
    funnel.forEach(stage => {
      stage.percentage = total > 0 ? (stage.count / total) * 100 : 0;
      // Average time calculation would be more complex in production
      stage.averageTime = Math.random() * 10 + 2; // Mock data for now
    });

    return funnel;
  }

  // Export application data
  async exportApplicationData(userId: string, format: 'csv' | 'json' | 'pdf') {
    const applications = await this.prisma.application.findMany({
      where: { userId },
      include: {
        job: true,
        notes: true,
        activities: true,
        documents: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (format === 'json') {
      return applications;
    }

    if (format === 'csv') {
      const headers = ['Company', 'Position', 'Status', 'Applied Date', 'Location', 'Salary', 'Notes'];
      const rows = applications.map(app => [
        app.company,
        app.job?.title || '',
        app.status,
        app.createdAt.toISOString(),
        app.job?.location || '',
        app.job?.salary || '',
        app.notes.map(n => n.content).join('; ')
      ]);

      return {
        headers,
        rows
      };
    }

    // PDF export would require a library like pdfkit or puppeteer
    throw new Error('PDF export not yet implemented');
  }

  // Get response rate by company size
  async getResponseRateByCompanySize(userId: string) {
    const applications = await this.prisma.application.findMany({
      where: { userId },
      include: {
        job: true
      }
    });

    const bySize = {
      startup: { total: 0, responses: 0 },
      small: { total: 0, responses: 0 },
      medium: { total: 0, responses: 0 },
      large: { total: 0, responses: 0 }
    };

    applications.forEach(app => {
      const size = this.determineCompanySize(app.job?.company);
      bySize[size].total++;
      if (app.status !== 'APPLIED') {
        bySize[size].responses++;
      }
    });

    return Object.entries(bySize).map(([size, data]) => ({
      size,
      total: data.total,
      responses: data.responses,
      rate: data.total > 0 ? (data.responses / data.total) * 100 : 0
    }));
  }

  // Determine company size (simplified)
  private determineCompanySize(company: string | undefined): 'startup' | 'small' | 'medium' | 'large' {
    if (!company) return 'medium';
    
    // In production, we'd have actual company data
    const length = company.length;
    if (length < 5) return 'startup';
    if (length < 10) return 'small';
    if (length < 15) return 'medium';
    return 'large';
  }

  // Get salary statistics
  async getSalaryStatistics(userId: string) {
    const applications = await this.prisma.application.findMany({
      where: {
        userId,
        job: {
          salary: {
            not: null
          }
        }
      },
      include: {
        job: true
      }
    });

    const salaries = applications
      .map(app => this.extractSalaryNumber(app.job?.salary))
      .filter(salary => salary > 0)
      .sort((a, b) => a - b);

    if (salaries.length === 0) {
      return {
        min: 0,
        max: 0,
        median: 0,
        average: 0
      };
    }

    return {
      min: salaries[0],
      max: salaries[salaries.length - 1],
      median: salaries[Math.floor(salaries.length / 2)],
      average: salaries.reduce((sum, s) => sum + s, 0) / salaries.length
    };
  }

  // Extract salary number from string
  private extractSalaryNumber(salary: string | null | undefined): number {
    if (!salary) return 0;
    
    // Extract numbers from salary string
    const numbers = salary.match(/\d+/g);
    if (!numbers || numbers.length === 0) return 0;
    
    // Take the first number and multiply by 1000 if it looks like it's in thousands
    const num = parseInt(numbers[0]);
    return num < 1000 ? num * 1000 : num;
  }
}