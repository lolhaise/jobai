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
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get('me')
  getMyProfile(@Request() req: any) {
    return this.usersService.findOne(req.user.sub);
  }

  @Patch('me')
  updateMyProfile(
    @Request() req: any,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(
      req.user.sub,
      updateUserDto,
      req.user.sub,
      req.user.role,
    );
  }

  @Get('me/profile')
  getMyProfileDetails(@Request() req: any) {
    return this.usersService.getProfile(
      req.user.sub,
      req.user.sub,
      req.user.role,
    );
  }

  @Patch('me/profile')
  updateMyProfileDetails(
    @Request() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(
      req.user.sub,
      updateProfileDto,
      req.user.sub,
      req.user.role,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
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
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.usersService.remove(id, req.user.role);
  }

  @Get(':id/profile')
  getUserProfile(@Param('id') id: string, @Request() req: any) {
    return this.usersService.getProfile(
      id,
      req.user.sub,
      req.user.role,
    );
  }

  @Patch(':id/profile')
  @Roles(UserRole.ADMIN)
  updateUserProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @Request() req: any,
  ) {
    return this.usersService.updateProfile(
      id,
      updateProfileDto,
      req.user.sub,
      req.user.role,
    );
  }

}