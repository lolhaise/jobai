import { Controller, Get, UseGuards, Request, UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from './auth.guard'
import { AuthService } from './auth.service'
import { Public } from './public.decorator'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req: any) {
    const user = await this.authService.validateUser(req.user.sub)
    if (!user) {
      throw new UnauthorizedException()
    }
    return user
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Auth health check' })
  healthCheck() {
    return { status: 'ok', service: 'auth' }
  }
}