// Import validation decorators
import { IsString, IsOptional } from 'class-validator';

// DTO class for creating application tags
export class CreateTagDto {
  // Required: Tag name
  @IsString()
  name: string;

  // Optional: Tag color (defaults to gray if not provided)
  @IsOptional()
  @IsString()
  color?: string;

  // Optional: Tag description
  @IsOptional()
  @IsString()
  description?: string;
}