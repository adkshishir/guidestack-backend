import { Entity, Column } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('blog_tasks')
export class BlogTask extends BaseEntity {
  @ApiProperty({
    description: 'Task title/topic for blog generation',
    example: 'Introduction to Machine Learning',
    type: String,
  })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiPropertyOptional({
    description: 'Task description (optional)',
    example: 'A comprehensive guide to machine learning fundamentals',
    type: String,
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({
    description: 'Whether the task is active',
    example: true,
    type: Boolean,
    default: true,
  })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Category IDs for the blog',
    example: [1, 2],
    type: [Number],
    nullable: true,
  })
  @Column({ type: 'integer', array: true, nullable: true })
  categoryIds: number[] | null;

  @ApiPropertyOptional({
    description: 'Tag IDs for the blog',
    example: [1, 2, 3],
    type: [Number],
    nullable: true,
  })
  @Column({ type: 'integer', array: true, nullable: true })
  tagIds: number[] | null;
}
