import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BlogPost } from './blog-post.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('blog_schemas')
export class BlogSchema extends BaseEntity {
  @Column({ name: 'blog_post_id', unique: true })
  blogPostId: number;

  @Column({ name: 'article_schema', type: 'jsonb', nullable: true })
  articleSchema: Record<string, any>;

  @Column({ name: 'faq_schema', type: 'jsonb', nullable: true })
  faqSchema: Record<string, any>;

  // Relationships
  @OneToOne(() => BlogPost, (post) => post.blogSchema, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blog_post_id' })
  blogPost: BlogPost;
}
