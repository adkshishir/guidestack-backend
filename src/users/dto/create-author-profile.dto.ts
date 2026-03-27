import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuthorProfileDto {
  @ApiProperty({
    description: 'User ID (must be unique)',
    example: 1,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    description: 'Display name for the author',
    example: 'John Doe',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiPropertyOptional({
    description: 'Author biography',
    example: 'Experienced writer and technology enthusiast',
    type: String,
  })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Avatar media ID',
    example: 1,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  avatarMediaId?: number;

  @ApiPropertyOptional({
    description: 'List of expertise topics',
    example: ['JavaScript', 'TypeScript', 'Node.js'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
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
  @IsObject()
  @IsOptional()
  socialLinks?: Record<string, any>;
}

