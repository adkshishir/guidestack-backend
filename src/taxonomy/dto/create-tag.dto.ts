import { IsString, IsNotEmpty, IsOptional, MinLength, IsArray, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({
    description: 'Tag name',
    example: 'JavaScript',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @ApiProperty({
    description: 'URL-friendly slug (auto-generated if not provided)',
    example: 'javascript',
    type: String,
    required: false,
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({
    description: 'Tag description',
    example: 'A tag for JavaScript',
    type: String,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Category IDs to associate with this tag',
    example: [1, 2],
    type: [Number],
    nullable: true,
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  categoryIds?: number[] | null;
}

