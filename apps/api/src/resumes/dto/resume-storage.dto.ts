import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateResumeVersionDto {
  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  versionNotes?: string;

  @IsOptional()
  builderData?: any;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsArray()
  @IsOptional()
  experience?: any[];

  @IsArray()
  @IsOptional()
  education?: any[];

  @IsArray()
  @IsOptional()
  skills?: string[];

  @IsArray()
  @IsOptional()
  projects?: any[];

  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class UpdateResumeTagsDto {
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

export class ShareResumeDto {
  @IsEnum(['LINK', 'EMAIL', 'EMBED'])
  shareType: 'LINK' | 'EMAIL' | 'EMBED';

  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;

  @IsString()
  @IsOptional()
  password?: string;

  @IsBoolean()
  @IsOptional()
  allowDownload?: boolean;

  @IsBoolean()
  @IsOptional()
  allowCopy?: boolean;

  @IsBoolean()
  @IsOptional()
  requireEmail?: boolean;
}

export class SearchResumesDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  includeArchived?: boolean;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsNumber()
  @IsOptional()
  offset?: number;
}

export class CompareVersionsDto {
  @IsString()
  version1Id: string;

  @IsString()
  version2Id: string;
}

export class MergeVersionsDto {
  @IsString()
  baseVersionId: string;

  @IsArray()
  @IsString({ each: true })
  versionIds: string[];

  @IsString()
  @IsOptional()
  mergeNotes?: string;
}

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  category: string;

  @IsOptional()
  layout?: any;

  @IsOptional()
  styles?: any;

  @IsArray()
  @IsString({ each: true })
  sections: string[];

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  isPremium?: boolean;
}

export class ApplyTemplateDto {
  @IsString()
  resumeId: string;

  @IsString()
  templateId: string;
}