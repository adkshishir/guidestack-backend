import {
  Entity,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { Tag } from './tag.entity';

@Entity('category_tags')
export class CategoryTag {
  @PrimaryColumn({ name: 'category_id' })
  categoryId: number;

  @PrimaryColumn({ name: 'tag_id' })
  tagId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => Category, (category) => category.categoryTags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => Tag, (tag) => tag.categoryTags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}
