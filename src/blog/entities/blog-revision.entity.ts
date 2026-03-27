import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BlogPost } from './blog-post.entity';
import { User } from '../../users/entities/user.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('blog_revisions')
export class BlogRevision extends BaseEntity {
  @Column({ name: 'blog_post_id' })
  blogPostId: number;

  @Column({ name: 'content_snapshot', type: 'jsonb' })
  contentSnapshot: Record<string, any>;

  @Column({ name: 'changed_by_user_id' })
  changedByUserId: number;

  @Column({ name: 'change_reason', type: 'text', nullable: true })
  changeReason: string;

  // Relationships
  @ManyToOne(() => BlogPost, (post) => post.blogRevisions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'blog_post_id' })
  blogPost: BlogPost;

  @ManyToOne(() => User, (user) => user.blogRevisions)
  @JoinColumn({ name: 'changed_by_user_id' })
  changedByUser: User;
}
