import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('admin/users')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get('stats')
  getUserStats(@Request() req: any) {
    return this.usersService.getUserStats(req.user.role);
  }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  getAllUsers(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    return this.usersService.update(
      id,
      updateUserDto,
      req.user.sub,
      req.user.role,
    );
  }


  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@Param('id') id: string, @Request() req: any) {
    return this.usersService.remove(id, req.user.role);
  }

  @Get('search/by-email')
  findUserByEmail(@Query('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Post('bulk-update')
  async bulkUpdateUsers(
    @Body() { userIds, updateData }: { userIds: string[]; updateData: UpdateUserDto },
    @Request() req: any,
  ) {
    const results = [];
    for (const userId of userIds) {
      try {
        const updatedUser = await this.usersService.update(
          userId,
          updateData,
          req.user.sub,
          req.user.role,
        );
        results.push({ userId, success: true, data: updatedUser });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }
    return { results };
  }
}