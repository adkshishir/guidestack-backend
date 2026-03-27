import {
  Entity,
  Column,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Media } from '../../media/entities/media.entity';
import { BlogContent } from './blog-content.entity';
import { BlogSeo } from './blog-seo.entity';
import { BlogSchema } from './blog-schema.entity';
import { BlogFaq } from './blog-faq.entity';
import { BlogRevision } from './blog-revision.entity';
import { BlogAnalytics } from './blog-analytics.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { AiRequest } from '../../ai/entities/ai-request.entity';
import { BlogTag } from '../../taxonomy/entities/blog-tag.entity';
import { BlogCategory } from '../../taxonomy/entities/blog-category.entity';

export enum BlogPostStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('blog_posts')
export class BlogPost extends BaseEntity {
  @ApiProperty({
    description: 'Blog post title',
    example: 'Getting Started with NestJS',
    type: String,
  })
  @Column()
  title: string;

  @ApiProperty({
    description: 'URL-friendly slug',
    example: 'getting-started-with-nestjs',
    type: String,
  })
  @Column({ unique: true })
  slug: string;

  @ApiPropertyOptional({
    description: 'Short excerpt or summary',
    example: 'Learn how to build scalable applications with NestJS',
    type: String,
  })
  @Column({ type: 'text', nullable: true })
  excerpt: string;

  @ApiProperty({
    description: 'Blog post status',
    enum: BlogPostStatus,
    enumName: 'BlogPostStatus',
    example: BlogPostStatus.DRAFT,
  })
  @Column({
    type: 'enum',
    enum: BlogPostStatus,
    default: BlogPostStatus.DRAFT,
  })
  status: BlogPostStatus;

  @ApiProperty({
    description: 'Author user ID',
    example: 1,
    type: Number,
  })
  @Column({ name: 'author_id' })
  authorId: number;

  @ApiPropertyOptional({
    description: 'Publication date',
    example: '2024-01-01T00:00:00.000Z',
    type: Date,
    nullable: true,
  })
  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Estimated reading time in minutes',
    example: 5,
    type: Number,
    nullable: true,
  })
  @Column({ name: 'reading_time', type: 'integer', nullable: true })
  readingTime: number | null;

  @ApiPropertyOptional({
    description: 'Featured image media ID',
    example: 1,
    type: Number,
    nullable: true,
  })
  @Column({ name: 'featured_image_id', type: 'integer', nullable: true })
  featuredImageId: number;

  @ApiPropertyOptional({
    description: 'Language code',
    example: 'en',
    type: String,
  })
  @Column({ nullable: true })
  language: string;

  // Relationships
  @ApiPropertyOptional({
    description: 'Author user',
    type: () => User,
  })
  @ManyToOne(() => User, (user) => user.blogPosts)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @ApiPropertyOptional({
    description: 'Featured image media',
    type: () => Media,
  })
  @ManyToOne(() => Media, { nullable: true })
  @JoinColumn({ name: 'featured_image_id' })
  featuredImage: Media;

  @ApiPropertyOptional({
    description: 'Blog content',
    type: () => BlogContent,
  })
  @OneToOne(() => BlogContent, (content) => content.blogPost)
  blogContent: BlogContent;

  @ApiPropertyOptional({
    description: 'SEO information',
    type: () => BlogSeo,
  })
  @OneToOne(() => BlogSeo, (seo) => seo.blogPost)
  blogSeo: BlogSeo;

  @ApiPropertyOptional({
    description: 'Schema markup',
    type: () => BlogSchema,
  })
  @OneToOne(() => BlogSchema, (schema) => schema.blogPost)
  blogSchema: BlogSchema;

  @ApiPropertyOptional({
    description: 'FAQ items',
    type: () => [BlogFaq],
  })
  @OneToMany(() => BlogFaq, (faq) => faq.blogPost)
  blogFaqs: BlogFaq[];

  @ApiPropertyOptional({
    description: 'Revision history',
    type: () => [BlogRevision],
  })
  @OneToMany(() => BlogRevision, (revision) => revision.blogPost)
  blogRevisions: BlogRevision[];

  @ApiPropertyOptional({
    description: 'Analytics data',
    type: () => BlogAnalytics,
  })
  @OneToOne(() => BlogAnalytics, (analytics) => analytics.blogPost)
  blogAnalytics: BlogAnalytics;

  @ApiPropertyOptional({
    description: 'Comments',
    type: () => [Comment],
  })
  @OneToMany(() => Comment, (comment) => comment.blogPost)
  comments: Comment[];

  @ApiPropertyOptional({
    description: 'AI requests',
    type: () => [AiRequest],
  })
  @OneToMany(() => AiRequest, (request) => request.blogPost)
  aiRequests: AiRequest[];

  @ApiPropertyOptional({
    description: 'Associated tags',
    type: () => [BlogTag],
  })
  @OneToMany(() => BlogTag, (blogTag) => blogTag.blogPost)
  blogTags: BlogTag[];

  @ApiPropertyOptional({
    description: 'Associated categories',
    type: () => [BlogCategory],
  })
  @OneToMany(() => BlogCategory, (blogCategory) => blogCategory.blogPost)
  blogCategories: BlogCategory[];
}
