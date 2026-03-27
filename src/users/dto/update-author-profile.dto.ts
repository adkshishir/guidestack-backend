import { PartialType } from '@nestjs/mapped-types';
import { CreateAuthorProfileDto } from './create-author-profile.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, IsObject } from 'class-validator';

export class UpdateAuthorProfileDto extends PartialType(CreateAuthorProfileDto) {
  @ApiPropertyOptional({
    description: 'Display name for the author',
    example: 'John Doe',
    type: String,
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Author biography',
    example: 'Experienced writer and technology enthusiast',
    type: String,
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Avatar media ID',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  avatarMediaId?: number;

  @ApiPropertyOptional({
    description: 'List of expertise topics',
    example: ['JavaScript', 'TypeScript', 'Node.js'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expertiseTopics?: string[];

  @ApiPropertyOptional({
    description: 'Social media links',
    example: {
      twitter: 'https://twitter.com/johndoe',
      linkedin: 'https://linkedin.com/in/johndoe',
      github: 'https://github.com/johndoe',
    },
    type: Object,
  })
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, any>;
}

