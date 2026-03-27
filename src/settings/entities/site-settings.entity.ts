import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('site_settings')
export class SiteSettings extends BaseEntity {
  @Column({ name: 'site_name' })
  siteName: string;

  @Column({ name: 'default_author_id', nullable: true })
  defaultAuthorId: number;

  @Column({ name: 'default_language', nullable: true })
  defaultLanguage: string;

  @Column({ name: 'default_meta', type: 'jsonb', nullable: true })
  defaultMeta: Record<string, any>;

  @Column({ name: 'schema_defaults', type: 'jsonb', nullable: true })
  schemaDefaults: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'default_author_id' })
  defaultAuthor: User;
}
