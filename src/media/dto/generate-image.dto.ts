import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEnum,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ImageSize {
  SMALL = '256x256',
  MEDIUM = '512x512',
  LARGE = '1024x1024',
}

export enum ImageStyle {
  VIVID = 'vivid',
  NATURAL = 'natural',
}

export enum ImageModel {
  // OpenRouter image generation models
  GEMINI = 'google/gemini-2.0-flash-exp:free',
  FLUX = 'black-forest-labs/flux-1-schnell:free',
  SDXL = 'stability-ai/stable-diffusion-xl:free',
  // Alternative models if above don't work
  FLUX_PRO = 'black-forest-labs/flux-pro:free',
  POLLINATIONS = 'pollinations',
}

export class GenerateImageDto {
  @ApiProperty({
    description: 'Prompt for image generation',
    example: 'A modern tech workspace with a laptop, coffee, and plants',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  prompt: string;

  @ApiPropertyOptional({
    description: 'Blog post ID to associate the generated image with',
    example: 1,
    type: Number,
  })
  @IsInt()
  @IsOptional()
  blogPostId?: number;

  @ApiPropertyOptional({
    description: 'Image generation model to use',
    example: ImageModel.POLLINATIONS,
    default: ImageModel.POLLINATIONS,
  })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({
    description: 'Image size',
    example: '512x512',
    default: '512x512',
  })
  @IsString()
  @IsOptional()
  size?: string;

  @ApiPropertyOptional({
    description: 'Image style (vivid or natural) - only for DALL-E models',
    example: 'natural',
    default: 'natural',
  })
  @IsString()
  @IsOptional()
  style?: string;

  @ApiPropertyOptional({
    description: 'Alt text for the generated image',
    example: 'Modern tech workspace illustration',
    type: String,
  })
  @IsString()
  @IsOptional()
  altText?: string;
}

export class GenerateImageFromBlogDto {
  @ApiProperty({
    description: 'Blog post ID to generate image for',
    example: 1,
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  blogPostId: number;

  @ApiPropertyOptional({
    description:
      'Custom prompt override (if not provided, will be generated from blog post)',
    example: 'A custom image description',
    type: String,
  })
  @IsString()
  @IsOptional()
  customPrompt?: string;

  @ApiPropertyOptional({
    description: 'Image generation model to use',
    example: ImageModel.POLLINATIONS,
    default: ImageModel.POLLINATIONS,
  })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({
    description: 'Image size',
    example: '512x512',
    default: '512x512',
  })
  @IsString()
  @IsOptional()
  size?: string;

  @ApiPropertyOptional({
    description: 'Image style (vivid or natural) - only for DALL-E models',
    example: 'natural',
    default: 'natural',
  })
  @IsString()
  @IsOptional()
  style?: string;
}
