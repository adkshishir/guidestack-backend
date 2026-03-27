import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BlogPost } from './blog-post.entity';
import { BaseEntity } from '../../common/entities/base.entity';

export enum BlogContentSource {
  AI = 'AI',
  HUMAN = 'HUMAN',
  MIXED = 'MIXED',
}

@Entity('blog_contents')
export class BlogContent extends BaseEntity {
  @Column({ name: 'blog_post_id', unique: true })
  blogPostId: number;

  @Column({ name: 'html_content', type: 'text' })
  htmlContent: string;

  @Column({ name: 'word_count', type: 'integer', nullable: true })
  wordCount: number;

  @Column({
    type: 'enum',
    enum: BlogContentSource,
    default: BlogContentSource.HUMAN,
  })
  source: BlogContentSource;

  // Relationships
  @OneToOne(() => BlogPost, (post) => post.blogContent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blog_post_id' })
  blogPost: BlogPost;
}
