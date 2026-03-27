import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class GenerateBlogDto {
  @ApiPropertyOptional({
    description: 'Optional topic or prompt for blog generation',
    example: 'Write a comprehensive blog post about: How to build a modern web application',
  })
  @IsString()
  @IsOptional()
  topic?: string;
}

