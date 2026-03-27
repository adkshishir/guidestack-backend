import { PartialType } from '@nestjs/mapped-types';
import { CreateBlogDto } from './create-blog.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BlogPostStatus } from '../entities/blog-post.entity';

export class UpdateBlogDto extends PartialType(CreateBlogDto) {
  @ApiPropertyOptional({
    description: 'Blog post title',
    example: 'Getting Started with NestJS',
    type: String,
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug',
    example: 'getting-started-with-nestjs',
    type: String,
  })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Short excerpt or summary',
    example: 'Learn how to build scalable applications with NestJS',
    type: String,
  })
  excerpt?: string;

  @ApiPropertyOptional({
    description: 'Blog post status',
    enum: BlogPostStatus,
    enumName: 'BlogPostStatus',
    example: BlogPostStatus.PUBLISHED,
  })
  status?: BlogPostStatus;

  @ApiPropertyOptional({
    description: 'HTML content of the blog post',
    example: '<p>This is the blog content...</p>',
    type: String,
  })
  htmlContent?: string;
}
