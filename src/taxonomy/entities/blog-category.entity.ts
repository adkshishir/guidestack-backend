import {
  Entity,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { BlogPost } from '../../blog/entities/blog-post.entity';
import { Category } from './category.entity';

@Entity('blog_categories')
export class BlogCategory {
  @PrimaryColumn({ name: 'blog_post_id' })
  blogPostId: number;

  @PrimaryColumn({ name: 'category_id' })
  categoryId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => BlogPost, (post) => post.blogCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'blog_post_id' })
  blogPost: BlogPost;

  @ManyToOne(() => Category, (category) => category.blogCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
