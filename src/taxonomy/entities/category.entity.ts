import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { BlogCategory } from './blog-category.entity';
import { CategoryTag } from './category-tag.entity';
import { Media } from '../../media/entities/media.entity';

@Entity('categories')
export class Category extends BaseEntity {
  @ApiProperty({
    description: 'Category name',
    example: 'Technology',
    type: String,
  })
  @Column()
  name: string;

  @ApiProperty({
    description: 'URL-friendly slug',
    example: 'technology',
    type: String,
  })
  @Column({ unique: true })
  slug: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Articles about technology and innovation',
    type: String,
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiPropertyOptional({
    description: 'Parent category ID (for hierarchical categories)',
    example: null,
    type: Number,
    nullable: true,
  })
  @Column({ name: 'parent_id', nullable: true })
  parentId: number | null;

  @ApiPropertyOptional({
    description: 'Featured image ID for the category',
    example: 1,
    type: Number,
    nullable: true,
  })
  @Column({ name: 'featured_image_id', nullable: true })
  featuredImageId: number | null;

  // Relationships
  @ApiPropertyOptional({
    description: 'Parent category',
    type: () => Category,
    nullable: true,
  })
  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Category | null;

  @ApiPropertyOptional({
    description: 'Featured image for the category',
    type: () => Media,
    nullable: true,
  })
  @ManyToOne(() => Media, { nullable: true })
  @JoinColumn({ name: 'featured_image_id' })
  featuredImage: Media | null;

  @ApiPropertyOptional({
    description: 'Child categories',
    type: () => [Category],
  })
  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @ApiPropertyOptional({
    description: 'Blog categories relationship',
    type: () => [BlogCategory],
  })
  @OneToMany(() => BlogCategory, (blogCategory) => blogCategory.category)
  blogCategories: BlogCategory[];

  @ApiPropertyOptional({
    description: 'Associated tags',
    type: () => [CategoryTag],
  })
  @OneToMany(() => CategoryTag, (categoryTag) => categoryTag.category)
  categoryTags: CategoryTag[];
}
