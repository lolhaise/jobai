// Dashboard Controller
// API endpoints for application dashboard and analytics

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
  Req
} from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AnalyticsService } from '../services/analytics.service';
import { InterviewSchedulerService, ScheduleInterviewDto } from '../services/interview-scheduler.service';
import { FollowUpReminderService, CreateFollowUpDto, FollowUpType } from '../services/followup-reminder.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private analyticsService: AnalyticsService,
    private interviewService: InterviewSchedulerService,
    private followUpService: FollowUpReminderService
  ) {}

  // Get dashboard metrics
  // GET /dashboard/metrics
  @Get('metrics')
  async getDashboardMetrics(@Req() req: any) {
    return this.analyticsService.getDashboardMetrics(req.user.userId);
  }

  // Get time series data for charts
  // GET /dashboard/time-series?days=30
  @Get('time-series')
  async getTimeSeriesData(
    @Req() req: any,
    @Query('days') days?: string
  ) {
    const dayCount = days ? parseInt(days) : 30;
    return this.analyticsService.getTimeSeriesData(req.user.userId, dayCount);
  }

  // Get application funnel data
  // GET /dashboard/funnel
  @Get('funnel')
  async getApplicationFunnel(@Req() req: any) {
    return this.analyticsService.getApplicationFunnel(req.user.userId);
  }

  // Get response rate by company size
  // GET /dashboard/response-rate-by-size
  @Get('response-rate-by-size')
  async getResponseRateBySize(@Req() req: any) {
    return this.analyticsService.getResponseRateByCompanySize(req.user.userId);
  }

  // Get salary statistics
  // GET /dashboard/salary-stats
  @Get('salary-stats')
  async getSalaryStatistics(@Req() req: any) {
    return this.analyticsService.getSalaryStatistics(req.user.userId);
  }

  // Export application data
  // GET /dashboard/export?format=csv
  @Get('export')
  async exportApplicationData(
    @Req() req: any,
    @Query('format') format: 'csv' | 'json' | 'pdf' = 'json'
  ) {
    const data = await this.analyticsService.exportApplicationData(
      req.user.userId,
      format
    );

    // Set appropriate headers for download
    if (format === 'csv') {
      // In a real app, convert to CSV and set headers
      return {
        format: 'csv',
        data
      };
    }

    return data;
  }

  // === Interview Management ===

  // Schedule an interview
  // POST /dashboard/interviews/schedule
  @Post('interviews/schedule')
  async scheduleInterview(
    @Req() req: any,
    @Body() dto: ScheduleInterviewDto
  ) {
    return this.interviewService.scheduleInterview(req.user.userId, dto);
  }

  // Get upcoming interviews
  // GET /dashboard/interviews/upcoming
  @Get('interviews/upcoming')
  async getUpcomingInterviews(@Req() req: any) {
    return this.interviewService.getUpcomingInterviews(req.user.userId);
  }

  // Reschedule an interview
  // PUT /dashboard/interviews/:id/reschedule
  @Put('interviews/:id/reschedule')
  async rescheduleInterview(
    @Req() req: any,
    @Param('id') interviewId: string,
    @Body('newScheduledAt') newScheduledAt: Date
  ) {
    return this.interviewService.rescheduleInterview(
      req.user.userId,
      interviewId,
      new Date(newScheduledAt)
    );
  }

  // Cancel an interview
  // DELETE /dashboard/interviews/:id
  @Delete('interviews/:id')
  async cancelInterview(
    @Req() req: any,
    @Param('id') interviewId: string,
    @Body('reason') reason?: string
  ) {
    return this.interviewService.cancelInterview(
      req.user.userId,
      interviewId,
      reason
    );
  }

  // Generate ICS file for interview
  // GET /dashboard/interviews/:id/ics
  @Get('interviews/:id/ics')
  async getInterviewICS(
    @Req() req: any,
    @Param('id') interviewId: string
  ) {
    const interviews = await this.interviewService.getUpcomingInterviews(req.user.userId);
    const interview = interviews.find((i: any) => i.id === interviewId);
    
    if (!interview) {
      throw new Error('Interview not found');
    }

    const calendarEvent = {
      id: interview.id,
      title: `Interview with ${interview.company}`,
      description: `${interview.type} interview for ${interview.position}`,
      startTime: new Date(interview.scheduledAt),
      endTime: new Date(new Date(interview.scheduledAt).getTime() + interview.duration * 60000),
      location: interview.location || interview.meetingLink,
      attendees: [req.user.email],
      reminders: [15, 60]
    };

    const icsContent = this.interviewService.generateICSFile(calendarEvent);
    
    return {
      filename: `interview-${interview.company}.ics`,
      content: icsContent
    };
  }

  // === Follow-up Management ===

  // Create a follow-up reminder
  // POST /dashboard/followups
  @Post('followups')
  async createFollowUp(
    @Req() req: any,
    @Body() dto: CreateFollowUpDto
  ) {
    return this.followUpService.createFollowUp(req.user.userId, dto);
  }

  // Get pending follow-ups
  // GET /dashboard/followups/pending
  @Get('followups/pending')
  async getPendingFollowUps(@Req() req: any) {
    return this.followUpService.getPendingFollowUps(req.user.userId);
  }

  // Get overdue follow-ups
  // GET /dashboard/followups/overdue
  @Get('followups/overdue')
  async getOverdueFollowUps(@Req() req: any) {
    return this.followUpService.getOverdueFollowUps(req.user.userId);
  }

  // Complete a follow-up
  // PUT /dashboard/followups/:id/complete
  @Put('followups/:id/complete')
  async completeFollowUp(
    @Req() req: any,
    @Param('id') followUpId: string
  ) {
    return this.followUpService.completeFollowUp(req.user.userId, followUpId);
  }

  // Snooze a follow-up
  // PUT /dashboard/followups/:id/snooze
  @Put('followups/:id/snooze')
  async snoozeFollowUp(
    @Req() req: any,
    @Param('id') followUpId: string,
    @Body('newDueDate') newDueDate: Date
  ) {
    return this.followUpService.snoozeFollowUp(
      req.user.userId,
      followUpId,
      new Date(newDueDate)
    );
  }

  // Get follow-up statistics
  // GET /dashboard/followups/stats
  @Get('followups/stats')
  async getFollowUpStatistics(@Req() req: any) {
    return this.followUpService.getFollowUpStatistics(req.user.userId);
  }

  // Get follow-up templates
  // GET /dashboard/followups/templates?type=thank_you
  @Get('followups/templates')
  async getFollowUpTemplates(
    @Query('type') type: FollowUpType = FollowUpType.GENERAL
  ) {
    return {
      type,
      templates: this.followUpService.getFollowUpTemplates(type)
    };
  }

  // === Quick Actions ===

  // Get dashboard summary (combines multiple metrics)
  // GET /dashboard/summary
  @Get('summary')
  async getDashboardSummary(@Req() req: any) {
    const [
      metrics,
      upcomingInterviews,
      pendingFollowUps,
      recentTimeSeriesData,
      salaryStats
    ] = await Promise.all([
      this.analyticsService.getDashboardMetrics(req.user.userId),
      this.interviewService.getUpcomingInterviews(req.user.userId),
      this.followUpService.getPendingFollowUps(req.user.userId),
      this.analyticsService.getTimeSeriesData(req.user.userId, 7),
      this.analyticsService.getSalaryStatistics(req.user.userId)
    ]);

    return {
      metrics,
      upcomingInterviews: upcomingInterviews.slice(0, 5),
      pendingFollowUps: pendingFollowUps.slice(0, 5),
      weeklyTrend: recentTimeSeriesData,
      salaryRange: {
        min: salaryStats.min,
        max: salaryStats.max,
        average: salaryStats.average
      },
      lastUpdated: new Date()
    };
  }

  // Get actionable insights
  // GET /dashboard/insights
  @Get('insights')
  async getInsights(@Req() req: any) {
    const metrics = await this.analyticsService.getDashboardMetrics(req.user.userId);
    const followUpStats = await this.followUpService.getFollowUpStatistics(req.user.userId);

    const insights = [];

    // Low response rate insight
    if (metrics.averageResponseTime > 14) {
      insights.push({
        type: 'warning',
        title: 'Long Response Times',
        description: 'Companies are taking over 2 weeks to respond on average',
        action: 'Consider following up on pending applications'
      });
    }

    // High rejection rate
    if (metrics.rejectionRate > 50) {
      insights.push({
        type: 'improvement',
        title: 'High Rejection Rate',
        description: `${metrics.rejectionRate.toFixed(0)}% of applications are being rejected`,
        action: 'Review and optimize your resume tailoring'
      });
    }

    // Pending follow-ups
    if (followUpStats.overdue > 0) {
      insights.push({
        type: 'action',
        title: 'Overdue Follow-ups',
        description: `You have ${followUpStats.overdue} overdue follow-up reminders`,
        action: 'Complete pending follow-ups to improve response rates'
      });
    }

    // Success celebration
    if (metrics.offerRate > 30) {
      insights.push({
        type: 'success',
        title: 'Great Interview Performance!',
        description: `${metrics.offerRate.toFixed(0)}% of interviews result in offers`,
        action: 'Keep up the excellent work!'
      });
    }

    // Application velocity
    const recentApps = metrics.recentActivity.filter(
      (a: any) => a.type === 'application'
    ).length;
    
    if (recentApps < 3) {
      insights.push({
        type: 'suggestion',
        title: 'Low Application Activity',
        description: 'Consider applying to more positions',
        action: 'Search for new job opportunities'
      });
    }

    return insights;
  }
}