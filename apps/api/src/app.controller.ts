import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './auth/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check' })
  getHealth(): { status: string; timestamp: string } {
    return this.appService.getHealth();
  }

  @Public()
  @Get('ping')
  @ApiOperation({ summary: 'Ping endpoint' })
  ping(): { message: string } {
    return { message: 'pong' };
  }
}