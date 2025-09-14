// Import validation decorators
import { IsString, IsOptional, IsBoolean } from 'class-validator';

// DTO class for creating application notes
export class CreateNoteDto {
  // Optional: Note title/subject
  @IsOptional()
  @IsString()
  title?: string;

  // Required: Note content/body
  @IsString()
  content: string;

  // Optional: Whether note is private (defaults to true)
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  // Optional: Whether note should be pinned (defaults to false)
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  // Optional: Color for note organization
  @IsOptional()
  @IsString()
  color?: string;
}