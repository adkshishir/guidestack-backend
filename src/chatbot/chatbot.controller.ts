import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { ChatbotService } from './chatbot.service';
import { SendMessageDto, ChatResponseDto } from './dto/chat-message.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Chatbot')
@Controller('chatbot')
@Public()
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a message to the chatbot',
    description:
      'Sends a message to the chatbot and receives a response. This endpoint is public and does not require authentication.',
  })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully received chatbot response',
    type: ChatResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Bad request - validation failed or AI service error',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @Req() req: Request,
  ): Promise<ChatResponseDto> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.chatbotService.sendMessage(sendMessageDto, ipAddress, userAgent);
  }

  @Post('message/stream')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a message to the chatbot (streaming)',
    description:
      'Sends a message to the chatbot and receives a streaming response in real-time. This endpoint is public and does not require authentication.',
  })
  @ApiBody({ type: SendMessageDto })
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
  @ApiBadRequestResponse({
    description: 'Bad request - validation failed or AI service error',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
  })
  async getStreamingResponse(
    @Body() sendMessageDto: SendMessageDto,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    try {
      for await (const chunk of this.chatbotService.getStreamingResponse(
        sendMessageDto,
        ipAddress,
        userAgent,
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
}

