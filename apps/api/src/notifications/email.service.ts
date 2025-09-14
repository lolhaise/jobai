// Email Service for Job Alerts and Notifications
// Handles all email communications including job alerts, notifications, and transactional emails

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

interface EmailOptions {
  to: string; // Recipient email
  subject: string; // Email subject
  template: string; // Template name
  data: any; // Data to inject into template
  attachments?: any[]; // Optional attachments
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor(private readonly configService: ConfigService) {
    // Initialize email transporter
    this.initializeTransporter();
    // Pre-compile email templates
    this.loadTemplates();
  }

  /**
   * Initialize the email transporter
   * Supports multiple providers: SendGrid, AWS SES, Gmail, etc.
   */
  private initializeTransporter(): void {
    const emailProvider = this.configService.get<string>('EMAIL_PROVIDER', 'smtp');

    switch (emailProvider) {
      case 'sendgrid':
        // SendGrid configuration
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          auth: {
            user: 'apikey',
            pass: this.configService.get<string>('SENDGRID_API_KEY'),
          },
        });
        break;

      case 'ses':
        // AWS SES configuration
        this.transporter = nodemailer.createTransporter({
          host: this.configService.get<string>('AWS_SES_ENDPOINT'),
          port: 587,
          secure: false,
          auth: {
            user: this.configService.get<string>('AWS_SES_ACCESS_KEY'),
            pass: this.configService.get<string>('AWS_SES_SECRET_KEY'),
          },
        });
        break;

      case 'gmail':
        // Gmail configuration (for development)
        this.transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: this.configService.get<string>('GMAIL_USER'),
            pass: this.configService.get<string>('GMAIL_APP_PASSWORD'),
          },
        });
        break;

      default:
        // Generic SMTP configuration
        this.transporter = nodemailer.createTransporter({
          host: this.configService.get<string>('SMTP_HOST', 'localhost'),
          port: this.configService.get<number>('SMTP_PORT', 1025),
          secure: this.configService.get<boolean>('SMTP_SECURE', false),
          auth: this.configService.get<string>('SMTP_USER')
            ? {
                user: this.configService.get<string>('SMTP_USER'),
                pass: this.configService.get<string>('SMTP_PASSWORD'),
              }
            : undefined,
        });
    }

    this.logger.log(`Email service initialized with provider: ${emailProvider}`);
  }

  /**
   * Load and compile email templates
   */
  private async loadTemplates(): Promise<void> {
    // Define email templates
    const templates = {
      'job-alert': this.getJobAlertTemplate(),
      'alert-confirmation': this.getAlertConfirmationTemplate(),
      'welcome': this.getWelcomeTemplate(),
      'password-reset': this.getPasswordResetTemplate(),
      'application-status': this.getApplicationStatusTemplate(),
      'interview-reminder': this.getInterviewReminderTemplate(),
      'resume-ready': this.getResumeReadyTemplate(),
    };

    // Compile each template
    for (const [name, source] of Object.entries(templates)) {
      this.templates.set(name, handlebars.compile(source));
    }

    // Register Handlebars helpers
    this.registerHandlebarsHelpers();

    this.logger.log(`Loaded ${this.templates.size} email templates`);
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    // Format currency
    handlebars.registerHelper('currency', (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(amount);
    });

    // Format date
    handlebars.registerHelper('date', (date: Date | string) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Truncate text
    handlebars.registerHelper('truncate', (text: string, length: number) => {
      if (text.length <= length) return text;
      return text.substring(0, length) + '...';
    });

    // Conditional helper
    handlebars.registerHelper('ifEquals', function(arg1: any, arg2: any, options: any) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });
  }

  /**
   * Send an email using a template
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const template = this.templates.get(options.template);
      
      if (!template) {
        throw new Error(`Email template "${options.template}" not found`);
      }

      // Generate HTML content from template
      const html = template(options.data);

      // Send the email
      const info = await this.transporter.sendMail({
        from: this.configService.get<string>('EMAIL_FROM', 'JobAI <noreply@jobai.com>'),
        to: options.to,
        subject: options.subject,
        html,
        attachments: options.attachments,
      });

      this.logger.log(`Email sent to ${options.to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  /**
   * Send a batch of emails
   */
  async sendBatchEmails(emails: EmailOptions[]): Promise<void> {
    const batchSize = 10; // Send in batches to avoid overwhelming the server
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      await Promise.all(batch.map((email) => this.sendEmail(email)));
      
      // Small delay between batches
      if (i + batchSize < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.logger.log(`Sent batch of ${emails.length} emails`);
  }

  // Email Templates

  private getJobAlertTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
    .job-card { border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 8px; }
    .job-title { font-size: 18px; font-weight: bold; color: #4F46E5; }
    .company { color: #666; margin: 5px 0; }
    .location { color: #999; font-size: 14px; }
    .salary { color: #16A34A; font-weight: bold; }
    .skills { margin: 10px 0; }
    .skill-tag { display: inline-block; background: #F3F4F6; padding: 4px 8px; margin: 2px; border-radius: 4px; font-size: 12px; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Job Matches!</h1>
      <p>{{jobCount}} new opportunities match your saved search "{{searchName}}"</p>
    </div>
    
    <p>Hi {{userName}},</p>
    <p>We found some great new job opportunities that match your search criteria. Check them out below:</p>
    
    {{#each jobs}}
    <div class="job-card">
      <div class="job-title">{{title}}</div>
      <div class="company">{{company}}</div>
      <div class="location">📍 {{location}} {{#if isRemote}}(Remote Available){{/if}}</div>
      
      {{#if salaryMin}}
      <div class="salary">💰 {{currency salaryMin}} - {{currency salaryMax}}</div>
      {{/if}}
      
      <div class="skills">
        {{#each requiredSkills}}
        <span class="skill-tag">{{this}}</span>
        {{/each}}
      </div>
      
      <p>{{truncate description 150}}</p>
      
      <a href="{{applicationUrl}}" class="button">View Job</a>
    </div>
    {{/each}}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{viewAllLink}}" class="button">View All {{jobCount}} Matches</a>
    </div>
    
    <div class="footer">
      <p>You're receiving this because you have email alerts enabled for "{{searchName}}".</p>
      <p><a href="{{unsubscribeLink}}">Unsubscribe from this alert</a> | <a href="{{settingsLink}}">Manage all alerts</a></p>
      <p>© 2024 JobAI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private getAlertConfirmationTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10B981; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px 0; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Job Alert Activated!</h1>
    </div>
    
    <div class="content">
      <p>Hi {{userName}},</p>
      <p>Your job alert "<strong>{{searchName}}</strong>" has been successfully activated!</p>
      <p>You'll receive email notifications {{frequency}} when new jobs match your search criteria.</p>
      
      <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>What happens next?</strong></p>
        <ul>
          <li>We'll continuously monitor for new job postings</li>
          <li>When matches are found, you'll get an email summary</li>
          <li>You can click through to apply directly</li>
          <li>Manage or cancel alerts anytime from your dashboard</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="{{dashboardLink}}" class="button">View Dashboard</a>
      </div>
    </div>
    
    <div class="footer">
      <p>© 2024 JobAI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private getWelcomeTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%); color: white; padding: 40px 20px; text-align: center; }
    .steps { margin: 30px 0; }
    .step { display: flex; align-items: center; margin: 20px 0; }
    .step-number { background: #4F46E5; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to JobAI! 🎉</h1>
      <p>Your AI-powered job search assistant</p>
    </div>
    
    <p>Hi {{userName}},</p>
    <p>Welcome aboard! We're excited to help you find your next great opportunity.</p>
    
    <div class="steps">
      <h2>Get Started in 3 Easy Steps:</h2>
      
      <div class="step">
        <div class="step-number">1</div>
        <div>
          <strong>Upload Your Resume</strong>
          <p>We'll parse it and use AI to optimize it for each application</p>
        </div>
      </div>
      
      <div class="step">
        <div class="step-number">2</div>
        <div>
          <strong>Set Your Preferences</strong>
          <p>Tell us what you're looking for - location, salary, remote options</p>
        </div>
      </div>
      
      <div class="step">
        <div class="step-number">3</div>
        <div>
          <strong>Let AI Do the Work</strong>
          <p>We'll find matches, tailor your resume, and track applications</p>
        </div>
      </div>
    </div>
    
    <div style="text-align: center;">
      <a href="{{getStartedLink}}" class="button">Get Started Now</a>
    </div>
  </div>
</body>
</html>`;
  }

  private getPasswordResetTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
    .button { display: inline-block; background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    .code { background: #F3F4F6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    
    <p>Hi {{userName}},</p>
    <p>We received a request to reset your JobAI password. Use the button below to reset it:</p>
    
    <div style="text-align: center;">
      <a href="{{resetLink}}" class="button">Reset Password</a>
    </div>
    
    <p>Or use this code:</p>
    <div class="code">{{resetCode}}</div>
    
    <p>This link will expire in 1 hour for security reasons.</p>
    <p>If you didn't request this, please ignore this email.</p>
  </div>
</body>
</html>`;
  }

  private getApplicationStatusTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .status-applied { background: #3B82F6; }
    .status-reviewing { background: #F59E0B; }
    .status-interview { background: #8B5CF6; }
    .status-offered { background: #10B981; }
    .status-rejected { background: #EF4444; }
    .header { color: white; padding: 20px; text-align: center; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header status-{{status}}">
      <h1>Application Status Update</h1>
    </div>
    
    <p>Hi {{userName}},</p>
    <p>Your application for <strong>{{jobTitle}}</strong> at <strong>{{company}}</strong> has been updated:</p>
    
    <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <h2>Status: {{statusText}}</h2>
      {{#if nextSteps}}
      <p>{{nextSteps}}</p>
      {{/if}}
    </div>
    
    <div style="text-align: center;">
      <a href="{{applicationLink}}" class="button">View Application</a>
    </div>
  </div>
</body>
</html>`;
  }

  private getInterviewReminderTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #8B5CF6; color: white; padding: 20px; text-align: center; }
    .interview-details { background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Interview Reminder</h1>
    </div>
    
    <p>Hi {{userName}},</p>
    <p>This is a reminder about your upcoming interview:</p>
    
    <div class="interview-details">
      <h2>{{jobTitle}} at {{company}}</h2>
      <p><strong>Date:</strong> {{date interviewDate}}</p>
      <p><strong>Time:</strong> {{interviewTime}}</p>
      <p><strong>Type:</strong> {{interviewType}}</p>
      {{#if location}}
      <p><strong>Location:</strong> {{location}}</p>
      {{/if}}
      {{#if meetingLink}}
      <p><strong>Meeting Link:</strong> <a href="{{meetingLink}}">Join Interview</a></p>
      {{/if}}
    </div>
    
    <h3>Preparation Tips:</h3>
    <ul>
      <li>Review the job description and your tailored resume</li>
      <li>Research {{company}} and prepare questions</li>
      <li>Test your video/audio if it's a virtual interview</li>
      <li>Prepare examples using the STAR method</li>
    </ul>
    
    <div style="text-align: center;">
      <a href="{{prepLink}}" class="button">View Interview Prep</a>
    </div>
  </div>
</body>
</html>`;
  }

  private getResumeReadyTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10B981; color: white; padding: 20px; text-align: center; }
    .score { display: inline-block; background: #F3F4F6; padding: 10px 20px; border-radius: 50px; font-size: 24px; font-weight: bold; color: #10B981; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✨ Your Tailored Resume is Ready!</h1>
    </div>
    
    <p>Hi {{userName}},</p>
    <p>Your resume has been optimized for <strong>{{jobTitle}}</strong> at <strong>{{company}}</strong>!</p>
    
    <div style="text-align: center; margin: 20px 0;">
      <p>ATS Compatibility Score:</p>
      <div class="score">{{atsScore}}%</div>
    </div>
    
    <h3>What we optimized:</h3>
    <ul>
      <li>✅ Added {{keywordsAdded}} relevant keywords</li>
      <li>✅ Reordered experience to highlight relevant skills</li>
      <li>✅ Customized summary for the role</li>
      <li>✅ Formatted for ATS compatibility</li>
    </ul>
    
    <div style="text-align: center;">
      <a href="{{resumeLink}}" class="button">Download Resume</a>
      <a href="{{applyLink}}" class="button">Apply Now</a>
    </div>
  </div>
</body>
</html>`;
  }
}