import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AiService } from './ai.service';
import { CreateAiDto, StreamingAiDto } from './dto/create-ai.dto';
import { UpdateAiDto } from './dto/update-ai.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('AI')
@ApiBearerAuth('JWT-auth')
@Controller('ai')
@UseGuards(RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  @ApiOperation({
    summary: 'Get a simple AI chat response',
    description:
      'Sends a prompt to the AI model and waits for the complete response.',
  })
  @ApiBody({ type: CreateAiDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully received AI response',
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          example:
            "Here is a joke: Why did the programmer quit his job? He didn't get arrays!",
        },
        model: { type: 'string', example: 'gemini-3-flash-preview' },
        usage: {
          type: 'object',
          properties: {
            prompt_tokens: { type: 'number', example: 10 },
            completion_tokens: { type: 'number', example: 20 },
            total_tokens: { type: 'number', example: 30 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getSimpleResponse(@Body() createAiDto: CreateAiDto) {
    return this.aiService.getSimpleResponse(createAiDto);
  }

  @Post('chat/stream')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  @ApiOperation({
    summary: 'Get a streaming AI chat response',
    description:
      'Sends a prompt to the AI model and receives tokens as they are generated (streaming).',
  })
  @ApiBody({ type: StreamingAiDto })
  @ApiResponse({
    status: 200,
    description: 'Streaming response (text/event-stream)',
    headers: {
      'Content-Type': {
        description: 'text/event-stream',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getStreamingResponse(
    @Body() streamingAiDto: StreamingAiDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of this.aiService.getStreamingResponse(
        streamingAiDto,
      )) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Streaming error',
        message: error.message,
      });
    }
  }

  // Legacy endpoints (kept for backward compatibility)
  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  @ApiOperation({ summary: 'Create AI (legacy endpoint)', deprecated: true })
  @ApiResponse({ status: 200, description: 'Legacy endpoint' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createAiDto: CreateAiDto) {
    return this.aiService.create(createAiDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Find all AI (legacy endpoint)', deprecated: true })
  @ApiResponse({ status: 200, description: 'Legacy endpoint' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.aiService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Find one AI (legacy endpoint)', deprecated: true })
  @ApiResponse({ status: 200, description: 'Legacy endpoint' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string) {
    return this.aiService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update AI (legacy endpoint)', deprecated: true })
  @ApiResponse({ status: 200, description: 'Legacy endpoint' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(@Param('id') id: string, @Body() updateAiDto: UpdateAiDto) {
    return this.aiService.update(+id, updateAiDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove AI (legacy endpoint)', deprecated: true })
  @ApiResponse({ status: 200, description: 'Legacy endpoint' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  remove(@Param('id') id: string) {
    return this.aiService.remove(+id);
  }
}
