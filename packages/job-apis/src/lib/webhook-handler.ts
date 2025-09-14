import crypto from 'crypto';
import { Logger } from '@jobai/shared';

export interface WebhookConfig {
  secret?: string;
  signatureHeader?: string;
  signaturePrefix?: string;
  timestampHeader?: string;
  toleranceWindow?: number; // seconds
  maxBodySize?: number; // bytes
  retryAttempts?: number;
  retryDelay?: number; // milliseconds
}

export interface WebhookEvent {
  id: string;
  source: string;
  type: string;
  timestamp: Date;
  data: any;
  signature?: string;
  headers: Record<string, string>;
  rawBody: string;
}

export interface WebhookHandler {
  source: string;
  eventTypes: string[];
  handler: (event: WebhookEvent) => Promise<void>;
}

export interface WebhookValidationResult {
  valid: boolean;
  error?: string;
  event?: WebhookEvent;
}

export interface WebhookStats {
  totalReceived: number;
  totalProcessed: number;
  totalFailed: number;
  averageProcessingTime: number;
  handlerStats: Record<string, {
    processed: number;
    failed: number;
    averageTime: number;
  }>;
}

/**
 * Webhook handler with signature verification and event processing
 */
export class WebhookProcessor {
  private handlers = new Map<string, WebhookHandler[]>();
  private stats: WebhookStats = {
    totalReceived: 0,
    totalProcessed: 0,
    totalFailed: 0,
    averageProcessingTime: 0,
    handlerStats: {},
  };
  private processingTimes: number[] = [];
  private readonly logger: Logger;
  private readonly config: WebhookConfig;

  constructor(config: WebhookConfig = {}) {
    this.config = {
      signatureHeader: 'x-signature',
      signaturePrefix: 'sha256=',
      timestampHeader: 'x-timestamp',
      toleranceWindow: 300, // 5 minutes
      maxBodySize: 1024 * 1024, // 1MB
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };

    this.logger = new Logger('WebhookProcessor');

    this.logger.debug('Webhook processor initialized', {
      signatureHeader: this.config.signatureHeader,
      signaturePrefix: this.config.signaturePrefix,
      timestampHeader: this.config.timestampHeader,
      toleranceWindow: this.config.toleranceWindow,
    });
  }

  /**
   * Register a webhook handler
   */
  registerHandler(handler: WebhookHandler): void {
    const existingHandlers = this.handlers.get(handler.source) || [];
    existingHandlers.push(handler);
    this.handlers.set(handler.source, existingHandlers);

    // Initialize stats
    if (!this.stats.handlerStats[handler.source]) {
      this.stats.handlerStats[handler.source] = {
        processed: 0,
        failed: 0,
        averageTime: 0,
      };
    }

    this.logger.info(`Registered webhook handler`, {
      source: handler.source,
      eventTypes: handler.eventTypes,
      totalHandlers: existingHandlers.length,
    });
  }

  /**
   * Unregister webhook handlers for a source
   */
  unregisterHandler(source: string, eventTypes?: string[]): void {
    const handlers = this.handlers.get(source) || [];
    
    if (eventTypes) {
      // Remove specific event type handlers
      const filtered = handlers.filter(h => 
        !h.eventTypes.some(type => eventTypes.includes(type))
      );
      
      if (filtered.length > 0) {
        this.handlers.set(source, filtered);
      } else {
        this.handlers.delete(source);
        delete this.stats.handlerStats[source];
      }
    } else {
      // Remove all handlers for source
      this.handlers.delete(source);
      delete this.stats.handlerStats[source];
    }

    this.logger.info(`Unregistered webhook handler`, {
      source,
      eventTypes: eventTypes || 'all',
    });
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(
    source: string,
    headers: Record<string, string>,
    body: string | Buffer,
    options: {
      skipSignatureVerification?: boolean;
      skipTimestampValidation?: boolean;
    } = {}
  ): Promise<WebhookValidationResult> {
    const startTime = Date.now();
    this.stats.totalReceived++;

    try {
      // Convert body to string if buffer
      const rawBody = typeof body === 'string' ? body : body.toString('utf8');

      // Validate body size
      if (this.config.maxBodySize && rawBody.length > this.config.maxBodySize) {
        throw new Error(`Webhook body too large: ${rawBody.length} bytes`);
      }

      // Validate signature
      if (!options.skipSignatureVerification && this.config.secret) {
        const signatureValid = await this.verifySignature(rawBody, headers);
        if (!signatureValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Validate timestamp
      if (!options.skipTimestampValidation) {
        const timestampValid = this.verifyTimestamp(headers);
        if (!timestampValid) {
          throw new Error('Invalid or expired webhook timestamp');
        }
      }

      // Parse webhook event
      const event = await this.parseWebhookEvent(source, rawBody, headers);

      // Process event
      await this.processEvent(event);

      // Update stats
      const processingTime = Date.now() - startTime;
      this.updateStats(source, processingTime, true);

      this.logger.info(`Webhook processed successfully`, {
        source,
        eventId: event.id,
        eventType: event.type,
        processingTime,
      });

      return {
        valid: true,
        event,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats(source, processingTime, false);

      this.logger.error(`Webhook processing failed`, {
        source,
        error: error.message,
        processingTime,
      });

      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify webhook signature
   */
  private async verifySignature(body: string, headers: Record<string, string>): Promise<boolean> {
    if (!this.config.secret) return true;

    const signatureHeader = this.config.signatureHeader!;
    const signature = headers[signatureHeader] || headers[signatureHeader.toLowerCase()];

    if (!signature) {
      this.logger.warn('Missing webhook signature header', { header: signatureHeader });
      return false;
    }

    // Remove prefix if present
    const cleanSignature = this.config.signaturePrefix 
      ? signature.replace(this.config.signaturePrefix, '')
      : signature;

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', this.config.secret)
      .update(body, 'utf8')
      .digest('hex');

    // Use crypto.timingSafeEqual for constant-time comparison
    const signatureBuffer = Buffer.from(cleanSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      this.logger.warn('Webhook signature length mismatch');
      return false;
    }

    const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValid) {
      this.logger.warn('Webhook signature verification failed');
    }

    return isValid;
  }

  /**
   * Verify webhook timestamp
   */
  private verifyTimestamp(headers: Record<string, string>): boolean {
    if (!this.config.timestampHeader || !this.config.toleranceWindow) return true;

    const timestampHeader = this.config.timestampHeader;
    const timestamp = headers[timestampHeader] || headers[timestampHeader.toLowerCase()];

    if (!timestamp) {
      this.logger.warn('Missing webhook timestamp header', { header: timestampHeader });
      return false;
    }

    const webhookTime = parseInt(timestamp);
    if (isNaN(webhookTime)) {
      this.logger.warn('Invalid webhook timestamp format', { timestamp });
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const timeDifference = Math.abs(currentTime - webhookTime);

    if (timeDifference > this.config.toleranceWindow) {
      this.logger.warn('Webhook timestamp outside tolerance window', {
        timestamp: webhookTime,
        currentTime,
        difference: timeDifference,
        tolerance: this.config.toleranceWindow,
      });
      return false;
    }

    return true;
  }

  /**
   * Parse webhook event from raw data
   */
  private async parseWebhookEvent(
    source: string,
    body: string,
    headers: Record<string, string>
  ): Promise<WebhookEvent> {
    let data: any;
    
    try {
      data = JSON.parse(body);
    } catch (error) {
      throw new Error(`Invalid JSON in webhook body: ${error.message}`);
    }

    // Generate event ID if not present
    const eventId = data.id || 
                   headers['x-event-id'] ||
                   headers['x-request-id'] ||
                   crypto.randomUUID();

    // Extract event type
    const eventType = data.type || 
                     data.event || 
                     data.event_type ||
                     headers['x-event-type'] ||
                     'unknown';

    // Extract timestamp
    const timestampStr = data.timestamp || 
                        data.created_at ||
                        headers['x-timestamp'] ||
                        headers['date'];
    
    const timestamp = timestampStr ? new Date(timestampStr) : new Date();

    return {
      id: eventId,
      source,
      type: eventType,
      timestamp,
      data,
      signature: headers[this.config.signatureHeader!] || headers[this.config.signatureHeader!.toLowerCase()],
      headers,
      rawBody: body,
    };
  }

  /**
   * Process webhook event through registered handlers
   */
  private async processEvent(event: WebhookEvent): Promise<void> {
    const handlers = this.handlers.get(event.source) || [];
    const matchingHandlers = handlers.filter(h => 
      h.eventTypes.includes('*') || h.eventTypes.includes(event.type)
    );

    if (matchingHandlers.length === 0) {
      this.logger.warn(`No handlers registered for event`, {
        source: event.source,
        eventType: event.type,
        eventId: event.id,
      });
      return;
    }

    // Process handlers in parallel
    const promises = matchingHandlers.map(async (handler) => {
      const handlerStartTime = Date.now();
      
      try {
        await this.executeWithRetry(handler.handler, event);
        
        const handlerTime = Date.now() - handlerStartTime;
        this.updateHandlerStats(event.source, handlerTime, true);
        
        this.logger.debug(`Handler executed successfully`, {
          source: event.source,
          eventType: event.type,
          eventId: event.id,
          handlerTime,
        });
      } catch (error) {
        const handlerTime = Date.now() - handlerStartTime;
        this.updateHandlerStats(event.source, handlerTime, false);
        
        this.logger.error(`Handler execution failed`, {
          source: event.source,
          eventType: event.type,
          eventId: event.id,
          error: error.message,
          handlerTime,
        });
        
        throw error;
      }
    });

    await Promise.all(promises);
  }

  /**
   * Execute handler with retry logic
   */
  private async executeWithRetry(
    handler: (event: WebhookEvent) => Promise<void>,
    event: WebhookEvent
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= (this.config.retryAttempts || 1); attempt++) {
      try {
        await handler(event);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < (this.config.retryAttempts || 1)) {
          const delay = this.config.retryDelay! * Math.pow(2, attempt - 1);
          
          this.logger.warn(`Handler failed, retrying`, {
            source: event.source,
            eventId: event.id,
            attempt,
            maxAttempts: this.config.retryAttempts,
            delay,
            error: error.message,
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Update processing statistics
   */
  private updateStats(source: string, processingTime: number, success: boolean): void {
    if (success) {
      this.stats.totalProcessed++;
    } else {
      this.stats.totalFailed++;
    }

    // Update average processing time
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift(); // Keep only last 100 measurements
    }
    
    this.stats.averageProcessingTime = 
      this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
  }

  /**
   * Update handler-specific statistics
   */
  private updateHandlerStats(source: string, processingTime: number, success: boolean): void {
    const handlerStats = this.stats.handlerStats[source];
    if (!handlerStats) return;

    if (success) {
      handlerStats.processed++;
    } else {
      handlerStats.failed++;
    }

    // Update average time (simple moving average)
    const total = handlerStats.processed + handlerStats.failed;
    handlerStats.averageTime = 
      (handlerStats.averageTime * (total - 1) + processingTime) / total;
  }

  /**
   * Get webhook processing statistics
   */
  getStats(): WebhookStats {
    return { ...this.stats };
  }

  /**
   * Get registered handlers
   */
  getHandlers(): Record<string, WebhookHandler[]> {
    const handlers: Record<string, WebhookHandler[]> = {};
    
    for (const [source, sourceHandlers] of this.handlers) {
      handlers[source] = [...sourceHandlers];
    }

    return handlers;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalReceived: 0,
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      handlerStats: {},
    };

    // Reinitialize handler stats
    for (const source of this.handlers.keys()) {
      this.stats.handlerStats[source] = {
        processed: 0,
        failed: 0,
        averageTime: 0,
      };
    }

    this.processingTimes = [];
    
    this.logger.info('Webhook stats reset');
  }

  /**
   * Test webhook handler (for testing purposes)
   */
  async testWebhook(
    source: string,
    eventType: string,
    testData: any = {}
  ): Promise<boolean> {
    const testEvent: WebhookEvent = {
      id: `test-${Date.now()}`,
      source,
      type: eventType,
      timestamp: new Date(),
      data: testData,
      headers: { 'x-test': 'true' },
      rawBody: JSON.stringify(testData),
    };

    try {
      await this.processEvent(testEvent);
      this.logger.info(`Test webhook processed successfully`, {
        source,
        eventType,
        eventId: testEvent.id,
      });
      return true;
    } catch (error) {
      this.logger.error(`Test webhook failed`, {
        source,
        eventType,
        error: error.message,
      });
      return false;
    }
  }
}