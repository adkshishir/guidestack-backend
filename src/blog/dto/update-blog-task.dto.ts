import { PartialType } from '@nestjs/mapped-types';
import { CreateBlogTaskDto } from './create-blog-task.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBlogTaskDto extends PartialType(CreateBlogTaskDto) {
  @ApiPropertyOptional({
    description: 'Whether the task is active',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

