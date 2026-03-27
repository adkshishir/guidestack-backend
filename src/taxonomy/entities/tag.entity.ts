import { Entity, Column, OneToMany } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { BlogTag } from './blog-tag.entity';
import { CategoryTag } from './category-tag.entity';

@Entity('tags')
export class Tag extends BaseEntity {
  @ApiProperty({
    description: 'Tag name',
    example: 'JavaScript',
    type: String,
  })
  @Column()
  name: string;

  @ApiProperty({
    description: 'URL-friendly slug',
    example: 'javascript',
    type: String,
  })
  @Column({ unique: true })
  slug: string;

  @ApiPropertyOptional({
    description: 'Tag description',
    example: 'A tag for JavaScript-related content',
    type: String,
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  // Relationships
  @ApiPropertyOptional({
    description: 'Blog tags relationship',
    type: () => [BlogTag],
  })
  @OneToMany(() => BlogTag, (blogTag) => blogTag.tag)
  blogTags: BlogTag[];

  @ApiPropertyOptional({
    description: 'Associated categories',
    type: () => [CategoryTag],
  })
  @OneToMany(() => CategoryTag, (categoryTag) => categoryTag.tag)
  categoryTags: CategoryTag[];
}
