import {
  Entity,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { BlogPost } from '../../blog/entities/blog-post.entity';
import { Tag } from './tag.entity';

@Entity('blog_tags')
export class BlogTag {
  @PrimaryColumn({ name: 'blog_post_id' })
  blogPostId: number;

  @PrimaryColumn({ name: 'tag_id' })
  tagId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => BlogPost, (post) => post.blogTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blog_post_id' })
  blogPost: BlogPost;

  @ManyToOne(() => Tag, (tag) => tag.blogTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}
