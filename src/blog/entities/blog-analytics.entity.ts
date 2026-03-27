import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BlogPost } from './blog-post.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('blog_analytics')
export class BlogAnalytics extends BaseEntity {
  @Column({ name: 'blog_post_id', unique: true })
  blogPostId: number;

  @Column({ default: 0 })
  views: number;

  @Column({ name: 'unique_views', default: 0 })
  uniqueViews: number;

  @Column({ name: 'avg_read_time', type: 'integer', nullable: true })
  avgReadTime: number;

  @Column({ default: 0 })
  likes: number;

  @Column({
    name: 'bounce_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  bounceRate: number;

  @Column({
    name: 'last_updated',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastUpdated: Date;

  // Relationships
  @OneToOne(() => BlogPost, (post) => post.blogAnalytics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'blog_post_id' })
  blogPost: BlogPost;
}
