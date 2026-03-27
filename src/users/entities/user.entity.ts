import { Entity, Column, OneToOne, OneToMany } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { AuthorProfile } from './author-profile.entity';
import { BlogPost } from '../../blog/entities/blog-post.entity';
import { BlogRevision } from '../../blog/entities/blog-revision.entity';
import { Comment } from '../../comments/entities/comment.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  AUTHOR = 'AUTHOR',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity('users')
export class User extends BaseEntity {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    type: String,
  })
  @Column({ unique: true })
  email: string;

  @ApiProperty({
    description: 'Hashed password (not returned in responses)',
    type: String,
    writeOnly: true,
  })
  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.AUTHOR,
  })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.AUTHOR,
  })
  role: UserRole;

  @ApiProperty({
    description: 'User status',
    enum: UserStatus,
    enumName: 'UserStatus',
    example: UserStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @ApiPropertyOptional({
    description: 'Whether 2FA is enabled',
    type: Boolean,
  })
  @Column({ name: 'is_two_factor_enabled', default: false })
  isTwoFactorEnabled: boolean;

  @Column({
    name: 'two_factor_secret',
    type: 'text',
    nullable: true,
    select: false,
  })
  twoFactorSecret: string | null;

  // Relationships
  @ApiPropertyOptional({
    description: 'Author profile',
    type: () => AuthorProfile,
  })
  @OneToOne(() => AuthorProfile, (profile) => profile.user)
  authorProfile: AuthorProfile;

  @ApiPropertyOptional({
    description: 'Blog posts authored by this user',
    type: () => [BlogPost],
  })
  @OneToMany(() => BlogPost, (post) => post.author)
  blogPosts: BlogPost[];

  @ApiPropertyOptional({
    description: 'Blog revisions made by this user',
    type: () => [BlogRevision],
  })
  @OneToMany(() => BlogRevision, (revision) => revision.changedByUser)
  blogRevisions: BlogRevision[];

  @ApiPropertyOptional({
    description: 'Comments made by this user',
    type: () => [Comment],
  })
  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];
}
