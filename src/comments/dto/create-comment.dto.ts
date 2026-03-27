import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  MinLength,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Blog post ID',
    example: 1,
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  blogPostId: number;

  @ApiProperty({
    description: 'Comment content',
    example: 'This is a great article!',
    type: String,
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({
    description: 'Parent comment ID (for nested replies)',
    example: null,
    type: Number,
  })
  @IsInt()
  @IsOptional()
  parentId?: number;

  @ApiPropertyOptional({
    description: 'Author name (for guest comments)',
    example: 'John Doe',
    type: String,
  })
  @IsString()
  @IsOptional()
  authorName?: string;

  @ApiPropertyOptional({
    description: 'Author email (for guest comments)',
    example: 'john@example.com',
    type: String,
  })
  @IsEmail()
  @IsOptional()
  authorEmail?: string;

  @ApiPropertyOptional({
    description: 'Comment token for verified guests (skip OTP)',
    example: 'abc123...',
    type: String,
  })
  @IsString()
  @IsOptional()
  commentToken?: string;
}
