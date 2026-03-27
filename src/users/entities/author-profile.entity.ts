import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from './user.entity';
import { Media } from '../../media/entities/media.entity';

@Entity('author_profiles')
export class AuthorProfile extends BaseEntity {
  @ApiProperty({
    description: 'User ID (unique)',
    example: 1,
    type: Number,
  })
  @Column({ name: 'user_id', unique: true })
  userId: number;

  @ApiProperty({
    description: 'Display name for the author',
    example: 'John Doe',
    type: String,
  })
  @Column({ name: 'display_name' })
  displayName: string;

  @ApiPropertyOptional({
    description: 'Author biography',
    example: 'Experienced writer and technology enthusiast',
    type: String,
  })
  @Column({ type: 'text', nullable: true })
  bio: string;

  @ApiPropertyOptional({
    description: 'Avatar media ID',
    example: 1,
    type: Number,
  })
  @Column({ name: 'avatar_media_id', nullable: true })
  avatarMediaId: number;

  @ApiPropertyOptional({
    description: 'List of expertise topics',
    example: ['JavaScript', 'TypeScript', 'Node.js'],
    type: [String],
  })
  @Column({
    name: 'expertise_topics',
    type: 'text',
    array: true,
    nullable: true,
  })
  expertiseTopics: string[];

  @ApiPropertyOptional({
    description: 'Social media links',
    example: {
      twitter: 'https://twitter.com/johndoe',
      linkedin: 'https://linkedin.com/in/johndoe',
      github: 'https://github.com/johndoe',
    },
    type: Object,
  })
  @Column({ name: 'social_links', type: 'jsonb', nullable: true })
  socialLinks: Record<string, any>;

  // Relationships
  @ApiPropertyOptional({
    description: 'Associated user',
    type: () => User,
  })
  @ManyToOne(() => User, (user) => user.authorProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiPropertyOptional({
    description: 'Avatar media',
    type: () => Media,
  })
  @ManyToOne(() => Media, { nullable: true })
  @JoinColumn({ name: 'avatar_media_id' })
  avatarMedia: Media;
}
