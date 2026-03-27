import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEnum,
  IsArray,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BlogPostStatus } from '../entities/blog-post.entity';

export class CreateBlogDto {
  @ApiProperty({
    description: 'Blog post title',
    example: 'Getting Started with NestJS',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug (auto-generated from title if not provided)',
    example: 'getting-started-with-nestjs',
    type: String,
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({
    description: 'Short excerpt or summary',
    example: 'Learn how to build scalable applications with NestJS',
    type: String,
  })
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiProperty({
    description: 'Blog post status',
    enum: BlogPostStatus,
    enumName: 'BlogPostStatus',
    example: BlogPostStatus.DRAFT,
    default: BlogPostStatus.DRAFT,
  })
  @IsEnum(BlogPostStatus)
  @IsOptional()
  status?: BlogPostStatus;

  @ApiPropertyOptional({
    description: 'HTML content of the blog post',
    example: '<p>This is the blog content...</p>',
    type: String,
  })
  @IsString()
  @IsOptional()
  htmlContent?: string;

  @ApiPropertyOptional({
    description: 'Featured image media ID',
    example: 1,
    type: Number,
  })
  @IsInt()
  @IsOptional()
  featuredImageId?: number;

  @ApiPropertyOptional({
    description: 'Language code',
    example: 'en',
    type: String,
  })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({
    description: 'Array of category IDs',
    example: [1, 2],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  categoryIds?: number[];

  @ApiPropertyOptional({
    description: 'Array of tag IDs',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  tagIds?: number[];

  // SEO fields
  @ApiPropertyOptional({
    description: 'SEO meta title',
    example: 'Getting Started with NestJS - Complete Guide',
    type: String,
  })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO meta description',
    example: 'Learn how to build scalable applications with NestJS framework',
    type: String,
  })
  @IsString()
  @IsOptional()
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'Canonical URL',
    example: 'https://example.com/blog/getting-started-with-nestjs',
    type: String,
  })
  @IsString()
  @IsOptional()
  canonicalUrl?: string;

  @ApiPropertyOptional({
    description: 'SEO meta keywords (comma-separated or array)',
    example: 'nestjs, nodejs, backend, api',
    type: String,
  })
  @IsString()
  @IsOptional()
  metaKeywords?: string;
}
