import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BlogPost } from './blog-post.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('blog_faqs')
export class BlogFaq extends BaseEntity {
  @Column({ name: 'blog_post_id' })
  blogPostId: number;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ name: 'order_index' })
  orderIndex: number;

  // Relationships
  @ManyToOne(() => BlogPost, (post) => post.blogFaqs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blog_post_id' })
  blogPost: BlogPost;
}
