// Import PartialType utility to make all fields optional
import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsDateString, IsString, IsInt, IsBoolean, Min } from 'class-validator';

// Import the base CreateApplicationDto
import { CreateApplicationDto } from './create-application.dto';

// DTO class for updating an existing application
// Uses PartialType to make all CreateApplicationDto fields optional
export class UpdateApplicationDto extends PartialType(CreateApplicationDto) {
  // Additional fields specific to updates

  // Optional: Date when application was rejected
  @IsOptional()
  @IsDateString()
  rejectedAt?: string;

  // Optional: Reason for rejection
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  // Optional: Date when offer was received
  @IsOptional()
  @IsDateString()
  offeredAt?: string;

  // Optional: Offered salary amount (in cents)
  @IsOptional()
  @IsInt()
  @Min(0)
  salaryOffered?: number;

  // Optional: Final negotiated salary (in cents)
  @IsOptional()
  @IsInt()
  @Min(0)
  salaryNegotiated?: number;

  // Optional: Whether offer was accepted
  @IsOptional()
  @IsBoolean()
  offerAccepted?: boolean;

  // Optional: Date when application was withdrawn
  @IsOptional()
  @IsDateString()
  withdrawnAt?: string;

  // Optional: Reason for withdrawing application
  @IsOptional()
  @IsString()
  withdrawnReason?: string;

  // Optional: Position for Kanban column ordering
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  // Optional: Archive status
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  // Optional: Date of last follow-up
  @IsOptional()
  @IsDateString()
  lastFollowUp?: string;
}