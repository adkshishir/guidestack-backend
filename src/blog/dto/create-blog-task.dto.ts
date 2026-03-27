import { IsString, IsNotEmpty, IsOptional, MaxLength, IsArray, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlogTaskDto {
  @ApiProperty({
    description: 'Task title/topic for blog generation',
    example: 'Introduction to Machine Learning',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'Task description (optional)',
    example: 'A comprehensive guide to machine learning fundamentals',
    type: String,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Category IDs for the blog',
    example: [1, 2],
    type: [Number],
    nullable: true,
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  categoryIds?: number[] | null;

  @ApiPropertyOptional({
    description: 'Tag IDs for the blog',
    example: [1, 2, 3],
    type: [Number],
    nullable: true,
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  tagIds?: number[] | null;
}

