import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Technology',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @ApiProperty({
    description: 'URL-friendly slug (auto-generated if not provided)',
    example: 'technology',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({
    description: 'Category description',
    example: 'Articles about technology and innovation',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Parent category ID (for hierarchical categories)',
    example: 1,
    type: Number,
    required: false,
  })
  @ValidateIf((object, value) => value !== null)
  @IsInt()
  @IsOptional()
  parentId?: number | null;

  @ApiProperty({
    description: 'Featured image ID for the category',
    example: 1,
    type: Number,
    required: false,
  })
  @ValidateIf((object, value) => value !== null)
  @IsInt()
  @IsOptional()
  featuredImageId?: number | null;
}
