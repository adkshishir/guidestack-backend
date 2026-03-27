import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateCommentDto } from './create-comment.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { CommentStatus } from '../entities/comment.entity';

export class UpdateCommentDto extends PartialType(
  OmitType(CreateCommentDto, ['blogPostId'] as const),
) {
  @ApiPropertyOptional({
    description: 'Comment content',
    example: 'Updated comment content',
    type: String,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @ApiPropertyOptional({
    description: 'Comment status',
    enum: CommentStatus,
    enumName: 'CommentStatus',
    example: CommentStatus.VISIBLE,
  })
  @IsOptional()
  @IsEnum(CommentStatus)
  status?: CommentStatus;
}

