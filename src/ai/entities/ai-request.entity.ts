import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BlogPost } from '../../blog/entities/blog-post.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('ai_requests')
export class AiRequest extends BaseEntity {
  @Column({ name: 'blog_post_id' })
  blogPostId: number;

  @Column({ name: 'model_name' })
  modelName: string;

  @Column({ name: 'system_prompt_version', nullable: true })
  systemPromptVersion: string;

  @Column({ name: 'user_prompt', type: 'text' })
  userPrompt: string;

  @Column({ name: 'tokens_used', type: 'integer', nullable: true })
  tokensUsed: number;

  @Column({ name: 'generation_time_ms', type: 'integer', nullable: true })
  generationTimeMs: number;

  // Relationships
  @ManyToOne(() => BlogPost, (post) => post.aiRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blog_post_id' })
  blogPost: BlogPost;
}
