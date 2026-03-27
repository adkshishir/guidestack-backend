import { Entity, Column, OneToOne, ManyToOne, JoinColumn } from 'typeorm';
import { BlogPost } from './blog-post.entity';
import { Media } from '../../media/entities/media.entity';
import { BaseEntity } from '../../common/entities/base.entity';

export enum Robots {
  INDEX_FOLLOW = 'INDEX_FOLLOW',
  NOINDEX_NOFOLLOW = 'NOINDEX_NOFOLLOW',
}

@Entity('blog_seo')
export class BlogSeo extends BaseEntity {
  @Column({ name: 'blog_post_id', unique: true })
  blogPostId: number;

  @Column({ name: 'meta_title', nullable: true })
  metaTitle: string;

  @Column({ name: 'meta_description', type: 'text', nullable: true })
  metaDescription: string;

  @Column({ name: 'meta_keywords', type: 'text', nullable: true })
  metaKeywords: string;

  @Column({ name: 'canonical_url', nullable: true })
  canonicalUrl: string;

  @Column({
    type: 'enum',
    enum: Robots,
    default: Robots.INDEX_FOLLOW,
  })
  robots: Robots;

  @Column({ name: 'og_title', nullable: true })
  ogTitle: string;

  @Column({ name: 'og_description', type: 'text', nullable: true })
  ogDescription: string;

  @Column({ name: 'og_image_id', nullable: true })
  ogImageId: number;

  @Column({ name: 'twitter_card', nullable: true })
  twitterCard: string;

  // Relationships
  @OneToOne(() => BlogPost, (post) => post.blogSeo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blog_post_id' })
  blogPost: BlogPost;

  @ManyToOne(() => Media, { nullable: true })
  @JoinColumn({ name: 'og_image_id' })
  ogImage: Media;
}
