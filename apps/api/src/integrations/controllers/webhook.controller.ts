import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Param,
  Get,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WebhookProcessor, WebhookConfig } from '@jobai/job-apis';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // TODO: Uncomment when auth is available

interface WebhookPayload {
  [key: string]: any;
}

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly webhookProcessor: WebhookProcessor;

  constructor(
    @Inject('WEBHOOK_CONFIG') private webhookConfig: WebhookConfig
  ) {
    this.webhookProcessor = new WebhookProcessor(this.webhookConfig);
    this.setupDefaultHandlers();
  }

  /**
   * Setup default webhook handlers for job board events
   */
  private setupDefaultHandlers(): void {
    // Remote OK webhook handler
    this.webhookProcessor.registerHandler({
      source: 'remoteok',
      eventTypes: ['job.created', 'job.updated', 'job.deleted'],
      handler: async (event) => {
        this.logger.log(`Processing Remote OK webhook`, {
          eventId: event.id,
          eventType: event.type,
          dataKeys: Object.keys(event.data),
        });

        switch (event.type) {
          case 'job.created':
            await this.handleJobCreated('remoteok', event.data);
            break;
          case 'job.updated':
            await this.handleJobUpdated('remoteok', event.data);
            break;
          case 'job.deleted':
            await this.handleJobDeleted('remoteok', event.data);
            break;
        }
      },
    });

    // Remotive webhook handler
    this.webhookProcessor.registerHandler({
      source: 'remotive',
      eventTypes: ['job_posted', 'job_updated', 'job_closed'],
      handler: async (event) => {
        this.logger.log(`Processing Remotive webhook`, {
          eventId: event.id,
          eventType: event.type,
          dataKeys: Object.keys(event.data),
        });

        switch (event.type) {
          case 'job_posted':
            await this.handleJobCreated('remotive', event.data);
            break;
          case 'job_updated':
            await this.handleJobUpdated('remotive', event.data);
            break;
          case 'job_closed':
            await this.handleJobDeleted('remotive', event.data);
            break;
        }
      },
    });

    // The Muse webhook handler
    this.webhookProcessor.registerHandler({
      source: 'themuse',
      eventTypes: ['job.publish', 'job.update', 'job.expire'],
      handler: async (event) => {
        this.logger.log(`Processing The Muse webhook`, {
          eventId: event.id,
          eventType: event.type,
          dataKeys: Object.keys(event.data),
        });

        switch (event.type) {
          case 'job.publish':
            await this.handleJobCreated('themuse', event.data);
            break;
          case 'job.update':
            await this.handleJobUpdated('themuse', event.data);
            break;
          case 'job.expire':
            await this.handleJobDeleted('themuse', event.data);
            break;
        }
      },
    });

    // USA Jobs webhook handler
    this.webhookProcessor.registerHandler({
      source: 'usajobs',
      eventTypes: ['opportunity.create', 'opportunity.update', 'opportunity.close'],
      handler: async (event) => {
        this.logger.log(`Processing USA Jobs webhook`, {
          eventId: event.id,
          eventType: event.type,
          dataKeys: Object.keys(event.data),
        });

        switch (event.type) {
          case 'opportunity.create':
            await this.handleJobCreated('usajobs', event.data);
            break;
          case 'opportunity.update':
            await this.handleJobUpdated('usajobs', event.data);
            break;
          case 'opportunity.close':
            await this.handleJobDeleted('usajobs', event.data);
            break;
        }
      },
    });

    // Generic webhook handler (for testing and unknown sources)
    this.webhookProcessor.registerHandler({
      source: 'generic',
      eventTypes: ['*'],
      handler: async (event) => {
        this.logger.log(`Processing generic webhook`, {
          eventId: event.id,
          eventType: event.type,
          source: event.source,
          dataKeys: Object.keys(event.data),
        });

        // Log for debugging purposes
        this.logger.debug(`Generic webhook data`, event.data);
      },
    });

    this.logger.log('Webhook handlers registered successfully');
  }

  /**
   * Handle incoming webhooks for specific job board
   */
  @Post(':source')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Receive webhook from job board',
    description: 'Process incoming webhooks from various job boards like Remote OK, Remotive, The Muse, etc.'
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload or signature' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  async receiveWebhook(
    @Param('source') source: string,
    @Headers() headers: Record<string, string>,
    @Body() payload: WebhookPayload,
  ) {
    try {
      const body = JSON.stringify(payload);
      
      this.logger.log(`Received webhook from ${source}`, {
        source,
        contentLength: body.length,
        hasSignature: !!(headers[this.webhookConfig.signatureHeader!] || 
                         headers[this.webhookConfig.signatureHeader!.toLowerCase()]),
      });

      const result = await this.webhookProcessor.processWebhook(
        source,
        headers,
        body
      );

      if (!result.valid) {
        this.logger.warn(`Webhook validation failed`, {
          source,
          error: result.error,
        });
        
        throw new BadRequestException(result.error || 'Invalid webhook');
      }

      this.logger.log(`Webhook processed successfully`, {
        source,
        eventId: result.event?.id,
        eventType: result.event?.type,
      });

      return {
        success: true,
        eventId: result.event?.id,
        message: 'Webhook processed successfully',
      };

    } catch (error) {
      this.logger.error(`Webhook processing error`, {
        source,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to process webhook');
    }
  }

  /**
   * Test webhook endpoint (for development/testing)
   */
  @Post('test/:source')
  @HttpCode(HttpStatus.OK)
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when auth is available
  // @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Test webhook processing',
    description: 'Send a test webhook event for a specific source (requires authentication)'
  })
  @ApiResponse({ status: 200, description: 'Test webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async testWebhook(
    @Param('source') source: string,
    @Body() payload: { eventType: string; testData?: any },
  ) {
    try {
      this.logger.log(`Processing test webhook`, {
        source,
        eventType: payload.eventType,
      });

      const success = await this.webhookProcessor.testWebhook(
        source,
        payload.eventType,
        payload.testData || { test: true, timestamp: new Date() }
      );

      return {
        success,
        source,
        eventType: payload.eventType,
        message: success ? 'Test webhook processed successfully' : 'Test webhook failed',
      };

    } catch (error) {
      this.logger.error(`Test webhook error`, {
        source,
        eventType: payload.eventType,
        error: error.message,
      });

      throw new BadRequestException('Test webhook failed');
    }
  }

  /**
   * Get webhook statistics
   */
  @Get('stats')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when auth is available
  // @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get webhook statistics',
    description: 'Get processing statistics for all webhook handlers'
  })
  @ApiResponse({ status: 200, description: 'Webhook statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWebhookStats() {
    try {
      const stats = this.webhookProcessor.getStats();
      const handlers = this.webhookProcessor.getHandlers();

      return {
        stats,
        handlers: Object.keys(handlers).map(source => ({
          source,
          eventTypes: handlers[source].flatMap(h => h.eventTypes),
          handlerCount: handlers[source].length,
        })),
        uptime: process.uptime(),
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get webhook stats`, error);
      throw new BadRequestException('Failed to get webhook statistics');
    }
  }

  /**
   * Reset webhook statistics
   */
  @Post('stats/reset')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when auth is available
  // @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Reset webhook statistics',
    description: 'Reset all webhook processing statistics'
  })
  @ApiResponse({ status: 200, description: 'Webhook statistics reset successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async resetWebhookStats() {
    try {
      this.webhookProcessor.resetStats();
      
      this.logger.log('Webhook statistics reset');

      return {
        success: true,
        message: 'Webhook statistics reset successfully',
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to reset webhook stats`, error);
      throw new BadRequestException('Failed to reset webhook statistics');
    }
  }

  /**
   * Handle job created event
   */
  private async handleJobCreated(source: string, jobData: any): Promise<void> {
    try {
      this.logger.log(`Handling job created event`, {
        source,
        jobId: jobData.id || jobData.job_id || jobData.positionId,
        title: jobData.title || jobData.name || jobData.position_title,
      });

      // TODO: Implement job creation logic
      // This would typically:
      // 1. Transform the webhook data to standard job format
      // 2. Check for duplicates
      // 3. Store in database
      // 4. Trigger job matching for users
      // 5. Send notifications if needed

      // Example transformation (would be specific to each job board):
      const standardJob = this.transformJobData(source, jobData);
      
      // Store job (this would use your job service)
      // await this.jobService.createJob(standardJob);
      
      this.logger.log(`Job created successfully from webhook`, {
        source,
        jobId: standardJob.externalId,
        title: standardJob.title,
      });

    } catch (error) {
      this.logger.error(`Failed to handle job created event`, {
        source,
        error: error.message,
        jobData: JSON.stringify(jobData).slice(0, 200),
      });
      throw error;
    }
  }

  /**
   * Handle job updated event
   */
  private async handleJobUpdated(source: string, jobData: any): Promise<void> {
    try {
      this.logger.log(`Handling job updated event`, {
        source,
        jobId: jobData.id || jobData.job_id || jobData.positionId,
        title: jobData.title || jobData.name || jobData.position_title,
      });

      // TODO: Implement job update logic
      const standardJob = this.transformJobData(source, jobData);
      
      // Update job (this would use your job service)
      // await this.jobService.updateJob(standardJob);
      
      this.logger.log(`Job updated successfully from webhook`, {
        source,
        jobId: standardJob.externalId,
        title: standardJob.title,
      });

    } catch (error) {
      this.logger.error(`Failed to handle job updated event`, {
        source,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle job deleted/closed event
   */
  private async handleJobDeleted(source: string, jobData: any): Promise<void> {
    try {
      this.logger.log(`Handling job deleted event`, {
        source,
        jobId: jobData.id || jobData.job_id || jobData.positionId,
      });

      const jobId = jobData.id || jobData.job_id || jobData.positionId;
      
      // TODO: Implement job deletion/closure logic
      // await this.jobService.markJobAsClosed(source, jobId);
      
      this.logger.log(`Job marked as closed from webhook`, {
        source,
        jobId,
      });

    } catch (error) {
      this.logger.error(`Failed to handle job deleted event`, {
        source,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Transform job board specific data to standard format
   */
  private transformJobData(source: string, jobData: any): any {
    // This would contain source-specific transformation logic
    const baseTransformation = {
      source,
      externalId: jobData.id || jobData.job_id || jobData.positionId,
      title: jobData.title || jobData.name || jobData.position_title,
      description: jobData.description || jobData.job_description,
      company: jobData.company || jobData.company_name || jobData.organization_name,
      location: jobData.location || jobData.candidate_required_location,
      salary: this.extractSalary(jobData),
      url: jobData.url || jobData.job_url || jobData.apply_url,
      postedAt: this.parseDate(jobData.date || jobData.created_at || jobData.publication_start_date),
      updatedAt: new Date(),
      tags: this.extractTags(jobData),
    };

    // Source-specific transformations
    switch (source) {
      case 'remoteok':
        return {
          ...baseTransformation,
          remote: true,
          tags: jobData.tags || [],
          salary: this.formatSalary(jobData.salary_min, jobData.salary_max, jobData.salary_currency),
        };

      case 'remotive':
        return {
          ...baseTransformation,
          remote: true,
          category: jobData.category,
          jobType: jobData.job_type,
        };

      case 'themuse':
        return {
          ...baseTransformation,
          levels: jobData.levels || [],
          departments: jobData.departments || [],
        };

      case 'usajobs':
        return {
          ...baseTransformation,
          grade: jobData.grade,
          payPlan: jobData.pay_plan,
          series: jobData.series,
        };

      default:
        return baseTransformation;
    }
  }

  private extractSalary(jobData: any): string | null {
    if (jobData.salary) return jobData.salary;
    if (jobData.salary_range) return jobData.salary_range;
    if (jobData.salary_min && jobData.salary_max) {
      return `${jobData.salary_min} - ${jobData.salary_max}`;
    }
    return null;
  }

  private extractTags(jobData: any): string[] {
    if (Array.isArray(jobData.tags)) return jobData.tags;
    if (Array.isArray(jobData.skills)) return jobData.skills;
    if (typeof jobData.tags === 'string') return jobData.tags.split(',').map((t: string) => t.trim());
    return [];
  }

  private parseDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  private formatSalary(min?: number, max?: number, currency = 'USD'): string | null {
    if (!min && !max) return null;
    if (min && max) return `${currency} ${min} - ${max}`;
    if (min) return `${currency} ${min}+`;
    if (max) return `Up to ${currency} ${max}`;
    return null;
  }
}