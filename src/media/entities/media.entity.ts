import { Entity, Column, OneToMany } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { AuthorProfile } from '../../users/entities/author-profile.entity';
import { BlogPost } from '../../blog/entities/blog-post.entity';
import { BlogSeo } from '../../blog/entities/blog-seo.entity';

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  FILE = 'FILE',
}

@Entity('media')
export class Media extends BaseEntity {
  @ApiProperty({
    description: 'Media type',
    enum: MediaType,
    enumName: 'MediaType',
    example: MediaType.IMAGE,
  })
  @Column({
    type: 'enum',
    enum: MediaType,
  })
  type: MediaType;

  @ApiProperty({
    description: 'Media URL',
    example: 'https://example.com/images/image.png',
    type: String,
  })
  @Column()
  url: string;

  @ApiPropertyOptional({
    description: 'Alt text for the media',
    example: 'A beautiful landscape image',
    type: String,
  })
  @Column({ name: 'alt_text', nullable: true })
  altText: string;

  @ApiPropertyOptional({
    description: 'Media width in pixels',
    example: 1024,
    type: Number,
  })
  @Column({ nullable: true })
  width: number;

  @ApiPropertyOptional({
    description: 'Media height in pixels',
    example: 768,
    type: Number,
  })
  @Column({ nullable: true })
  height: number;

  @ApiPropertyOptional({
    description: 'Media file size in bytes',
    example: 204800,
    type: Number,
  })
  @Column({ nullable: true })
  size: number;

  @ApiPropertyOptional({
    description: 'MIME type of the media',
    example: 'image/png',
    type: String,
  })
  @Column({ name: 'mime_type', nullable: true })
  mimeType: string;

  @ApiPropertyOptional({
    description: 'Original file name',
    example: 'my-image.png',
    type: String,
  })
  @Column({ name: 'file_name', nullable: true })
  fileName: string;

  @ApiPropertyOptional({
    description: 'File path on server',
    example: '/uploads/123456789.png',
    type: String,
  })
  @Column({ name: 'file_path', nullable: true })
  filePath: string;

  // Relationships
  @ApiPropertyOptional({
    description: 'Author profiles using this media as avatar',
    type: () => [AuthorProfile],
  })
  @OneToMany(() => AuthorProfile, (profile) => profile.avatarMedia)
  authorProfiles: AuthorProfile[];

  @ApiPropertyOptional({
    description: 'Blog posts using this media as featured image',
    type: () => [BlogPost],
  })
  @OneToMany(() => BlogPost, (post) => post.featuredImage)
  blogPosts: BlogPost[];

  @ApiPropertyOptional({
    description: 'Blog SEO entries using this media as OG image',
    type: () => [BlogSeo],
  })
  @OneToMany(() => BlogSeo, (seo) => seo.ogImage)
  blogSeos: BlogSeo[];
}
