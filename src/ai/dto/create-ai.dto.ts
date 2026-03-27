import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateAiDto {
  @ApiProperty({
    description: 'The prompt/message to send to the AI model',
    example: 'Tell me a 2-sentence joke.',
  })
  @IsString()
  prompt: string;

  @ApiProperty({
    description: 'The model to use (default: gemini-3-flash-preview)',
    example: 'gemini-3-flash-preview',
    required: false,
    default: 'gemini-3-flash-preview',
  })
  @IsString()
  @IsOptional()
  model?: string;
}

export class StreamingAiDto {
  @ApiProperty({
    description: 'The prompt/message to send to the AI model',
    example: 'Write a short poem about coding.',
  })
  @IsString()
  prompt: string;

  @ApiProperty({
    description: 'The model to use (default: gemini-3-flash-preview)',
    example: 'gemini-3-flash-preview',
    required: false,
    default: 'gemini-3-flash-preview',
  })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({
    description: 'Enable streaming response',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  stream?: boolean;
}
