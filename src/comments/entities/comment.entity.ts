import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { BlogPost } from '../../blog/entities/blog-post.entity';
import { User } from '../../users/entities/user.entity';
import { Subscriber } from '../../newsletter/entities/subscriber.entity';

export enum CommentStatus {
  VISIBLE = 'VISIBLE',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  MODERATED = 'MODERATED',
  DELETED = 'DELETED',
}

@Entity('comments')
export class Comment extends BaseEntity {
  @ApiProperty({
    description: 'Blog post ID',
    example: 1,
    type: Number,
  })
  @Column({ name: 'blog_post_id' })
  blogPostId: number;

  @ApiPropertyOptional({
    description: 'User ID who created the comment',
    example: 1,
    type: Number,
    nullable: true,
  })
  @Column({ name: 'user_id', nullable: true })
  userId: number | null;

  @ApiPropertyOptional({
    description: 'Subscriber ID for guest comments',
    example: 1,
    type: Number,
    nullable: true,
  })
  @Column({ name: 'subscriber_id', nullable: true })
  subscriberId: number | null;

  @ApiPropertyOptional({
    description: 'Author name for guest comments',
    example: 'John Doe',
    type: String,
    nullable: true,
  })
  @Column({ name: 'author_name', nullable: true, type: 'varchar' })
  authorName: string | null;

  @ApiPropertyOptional({
    description: 'Author email for guest comments',
    example: 'john@example.com',
    type: String,
    nullable: true,
  })
  @Column({ name: 'author_email', nullable: true, type: 'varchar' })
  authorEmail: string | null;

  @ApiPropertyOptional({
    description: 'Verification code (OTP) for the comment',
    type: String,
    nullable: true,
  })
  @Column({ name: 'verification_code', nullable: true, type: 'varchar' })
  verificationCode: string | null;

  @ApiProperty({
    description: 'Comment content',
    example: 'This is a great article!',
    type: String,
  })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({
    description: 'Comment status',
    enum: CommentStatus,
    enumName: 'CommentStatus',
    example: CommentStatus.VISIBLE,
  })
  @Column({
    type: 'enum',
    enum: CommentStatus,
    default: CommentStatus.VISIBLE,
  })
  status: CommentStatus;

  @ApiPropertyOptional({
    description: 'Parent comment ID (for nested replies)',
    example: null,
    type: Number,
    nullable: true,
  })
  @Column({ name: 'parent_id', nullable: true })
  parentId: number | null;

  // Relationships
  @ApiPropertyOptional({
    description: 'Associated blog post',
    type: () => BlogPost,
  })
  @ManyToOne(() => BlogPost, (post) => post.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blog_post_id' })
  blogPost: BlogPost;

  @ApiPropertyOptional({
    description: 'User who created the comment',
    type: () => User,
  })
  @ManyToOne(() => User, (user) => user.comments, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiPropertyOptional({
    description: 'Subscriber who created the comment',
    type: () => Subscriber,
  })
  @ManyToOne(() => Subscriber, { nullable: true })
  @JoinColumn({ name: 'subscriber_id' })
  subscriber: Subscriber;

  @ApiPropertyOptional({
    description: 'Parent comment (for nested replies)',
    type: () => Comment,
    nullable: true,
  })
  @ManyToOne(() => Comment, (comment) => comment.replies, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Comment;

  @ApiPropertyOptional({
    description: 'Replies to this comment',
    type: () => [Comment],
  })
  @OneToMany(() => Comment, (comment) => comment.parent)
  replies: Comment[];
}
