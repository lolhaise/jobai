import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';
import { UsersModule } from './users/users.module';
import { ResumesModule } from './resumes/resumes.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AIModule } from './ai/ai.module';
import { QualityModule } from './quality/quality.module';
import { ApplicationsModule } from './applications/applications.module';
import { CalendarModule } from './calendar/calendar.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    IntegrationsModule.forRoot(),
    AuthModule,
    UsersModule,
    ResumesModule,
    AIModule,
    QualityModule,
    ApplicationsModule,
    CalendarModule, // Added calendar integration module
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}