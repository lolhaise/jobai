import {
  Controller,
  Get,
  Delete,
  Param,
  Request,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SessionService } from './session.service';

@Controller('users/:userId/sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  getUserSessions(@Param('userId') userId: string, @Request() req: any) {
    return this.sessionService.getUserSessions(userId, req.user.sub);
  }

  @Get('activity')
  getSessionActivity(@Param('userId') userId: string, @Request() req: any) {
    return this.sessionService.getSessionActivity(userId, req.user.sub);
  }

  @Post('refresh')
  refreshSession(@Param('userId') userId: string, @Request() req: any) {
    return this.sessionService.refreshSession(userId, req.user.sub);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeSession(
    @Param('userId') userId: string,
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.sessionService.revokeSession(userId, sessionId, req.user.sub);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeAllSessions(@Param('userId') userId: string, @Request() req: any) {
    return this.sessionService.revokeAllSessions(userId, req.user.sub);
  }
}