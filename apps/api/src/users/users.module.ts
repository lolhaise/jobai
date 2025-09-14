import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersService } from './users.service';
import { SessionService } from './session.service';
import { UsersController } from './users.controller';
import { AdminController } from './admin.controller';
import { SessionController } from './session.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [UsersController, AdminController, SessionController],
  providers: [UsersService, SessionService],
  exports: [UsersService, SessionService],
})
export class UsersModule {}