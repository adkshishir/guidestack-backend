import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export class ChatMessageDto {
  @ApiProperty({
    description: 'The role of the message sender',
    enum: MessageRole,
    example: MessageRole.USER,
  })
  @IsEnum(MessageRole)
  role: MessageRole;

  @ApiProperty({
    description: 'The content of the message',
    example: 'Hello, can you help me with my question?',
  })
  @IsString()
  content: string;
}

export class SendMessageDto {
  @ApiProperty({
    description: 'The user message to send to the chatbot',
    example: 'What is this blog about?',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Optional conversation history for context',
    type: [ChatMessageDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  conversationHistory?: ChatMessageDto[];

  @ApiProperty({
    description: 'Optional session ID to track conversations',
    example: 'session-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({
    description: 'The AI model to use (default: openai/gpt-4o)',
    example: 'openai/gpt-4o',
    required: false,
    default: 'openai/gpt-4o',
  })
  @IsOptional()
  @IsString()
  model?: string;
}

export class ChatResponseDto {
  @ApiProperty({
    description: 'The chatbot response message',
    example: 'Hello! I can help you with questions about our blog.',
  })
  message: string;

  @ApiProperty({
    description: 'The model used for the response',
    example: 'openai/gpt-4o',
  })
  model: string;

  @ApiProperty({
    description: 'Token usage information',
    example: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
    required: false,
  })
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };

  @ApiProperty({
    description: 'Session ID for tracking the conversation',
    example: 'session-123',
    required: false,
  })
  sessionId?: string;
}

