import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApiKeyService } from './services/api-key.service';
import { WebhookController } from './controllers/webhook.controller';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    ApiKeyService,
    {
      provide: 'WEBHOOK_CONFIG',
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('WEBHOOK_SECRET'),
        signatureHeader: configService.get<string>('WEBHOOK_SIGNATURE_HEADER', 'x-signature'),
        signaturePrefix: configService.get<string>('WEBHOOK_SIGNATURE_PREFIX', 'sha256='),
        timestampHeader: configService.get<string>('WEBHOOK_TIMESTAMP_HEADER', 'x-timestamp'),
        toleranceWindow: configService.get<number>('WEBHOOK_TOLERANCE_WINDOW', 300),
        maxBodySize: configService.get<number>('WEBHOOK_MAX_BODY_SIZE', 1024 * 1024),
        retryAttempts: configService.get<number>('WEBHOOK_RETRY_ATTEMPTS', 3),
        retryDelay: configService.get<number>('WEBHOOK_RETRY_DELAY', 1000),
      }),
      inject: [ConfigService],
    },
    {
      provide: 'CACHE_CONFIG',
      useFactory: (configService: ConfigService) => ({
        enabled: configService.get<boolean>('CACHE_ENABLED', true),
        defaultTTL: configService.get<number>('CACHE_DEFAULT_TTL', 300),
        prefix: configService.get<string>('CACHE_PREFIX', 'jobai'),
        maxMemorySize: configService.get<number>('CACHE_MAX_MEMORY_SIZE', 50 * 1024 * 1024), // 50MB
        redis: configService.get<string>('REDIS_URL') ? {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
        } : undefined,
      }),
      inject: [ConfigService],
    },
    {
      provide: 'RATE_LIMIT_CONFIG',
      useFactory: (configService: ConfigService) => ({
        global: {
          requests: configService.get<number>('RATE_LIMIT_REQUESTS', 1000),
          per: configService.get<number>('RATE_LIMIT_WINDOW', 60000),
        },
        jobBoards: {
          remoteOk: {
            requests: configService.get<number>('RATE_LIMIT_REMOTE_OK', 60),
            per: 60000,
          },
          remotive: {
            requests: configService.get<number>('RATE_LIMIT_REMOTIVE', 100),
            per: 60000,
          },
          theMuse: {
            requests: configService.get<number>('RATE_LIMIT_THE_MUSE', 100),
            per: 60000,
          },
          usaJobs: {
            requests: configService.get<number>('RATE_LIMIT_USA_JOBS', 200),
            per: 60000,
          },
        },
      }),
      inject: [ConfigService],
    },
    {
      provide: 'ERROR_HANDLER_CONFIG',
      useFactory: (configService: ConfigService) => ({
        maxRetries: configService.get<number>('ERROR_MAX_RETRIES', 3),
        baseDelay: configService.get<number>('ERROR_BASE_DELAY', 1000),
        maxDelay: configService.get<number>('ERROR_MAX_DELAY', 30000),
        backoffFactor: configService.get<number>('ERROR_BACKOFF_FACTOR', 2),
        circuitBreaker: {
          enabled: configService.get<boolean>('CIRCUIT_BREAKER_ENABLED', true),
          failureThreshold: configService.get<number>('CIRCUIT_BREAKER_FAILURE_THRESHOLD', 5),
          resetTimeout: configService.get<number>('CIRCUIT_BREAKER_RESET_TIMEOUT', 60000),
          monitoringPeriod: configService.get<number>('CIRCUIT_BREAKER_MONITORING_PERIOD', 60000),
        },
      }),
      inject: [ConfigService],
    },
  ],
  controllers: [WebhookController],
  exports: [
    ApiKeyService,
    'WEBHOOK_CONFIG',
    'CACHE_CONFIG',
    'RATE_LIMIT_CONFIG',
    'ERROR_HANDLER_CONFIG',
  ],
})
export class IntegrationsModule {
  static forRoot() {
    return {
      module: IntegrationsModule,
      global: true,
    };
  }
}