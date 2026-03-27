import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenAI } from '@google/genai';
import {
  SendMessageDto,
  ChatResponseDto,
  ChatMessageDto,
  MessageRole,
} from './dto/chat-message.dto';
import { ChatMessage } from './entities/chat-message.entity';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly ai: GoogleGenAI | null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not set. Chatbot will not work.',
      );
      this.ai = null;
    } else {
      this.ai = new GoogleGenAI({
        apiKey: apiKey,
      });
      this.logger.log('Chatbot Gemini AI initialized successfully');
    }
  }

  /**
   * Send a message to the chatbot and get a response
   */
  async sendMessage(
    sendMessageDto: SendMessageDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ChatResponseDto> {
    try {
      if (!this.ai) {
        throw new BadRequestException('AI service is not configured');
      }

      const model = sendMessageDto.model || 'gemini-3-flash-preview';
      const sessionId = sendMessageDto.sessionId || this.generateSessionId();

      // Build prompt for Gemini
      const prompt = this.buildPromptForGemini(
        sendMessageDto.message,
        sendMessageDto.conversationHistory,
      );

      this.logger.log(
        `Processing chat message for session ${sessionId} with model ${model}`,
      );

      // Save user message to database
      const userMessage = this.chatMessageRepository.create({
        sessionId,
        role: MessageRole.USER,
        content: sendMessageDto.message,
        ipAddress,
        userAgent,
      });
      await this.chatMessageRepository.save(userMessage);

      // Get AI response from Gemini
      const response = await this.ai.models.generateContent({
        model,
        contents: prompt,
      });

      const assistantMessage = response.text;
      if (!assistantMessage) {
        throw new BadRequestException('No response from AI service');
      }

      // Save assistant message to database
      const assistantMessageEntity = this.chatMessageRepository.create({
        sessionId,
        role: MessageRole.ASSISTANT,
        content: assistantMessage,
        model: model,
        ipAddress,
        userAgent,
      });
      await this.chatMessageRepository.save(assistantMessageEntity);

      return {
        message: assistantMessage,
        model: model,
        sessionId,
      };
    } catch (error) {
      this.logger.error('Error processing chat message:', error.message);
      throw new BadRequestException(
        `Failed to process chat message: ${error.message}`,
      );
    }
  }

  /**
   * Get streaming response for real-time chat experience
   */
  async *getStreamingResponse(
    sendMessageDto: SendMessageDto,
    ipAddress?: string,
    userAgent?: string,
  ): AsyncGenerator<string, void, unknown> {
    try {
      if (!this.ai) {
        throw new BadRequestException('AI service is not configured');
      }

      const model = sendMessageDto.model || 'gemini-3-flash-preview';
      const sessionId = sendMessageDto.sessionId || this.generateSessionId();

      // Build prompt for Gemini
      const prompt = this.buildPromptForGemini(
        sendMessageDto.message,
        sendMessageDto.conversationHistory,
      );

      // Save user message to database
      const userMessage = this.chatMessageRepository.create({
        sessionId,
        role: MessageRole.USER,
        content: sendMessageDto.message,
        ipAddress,
        userAgent,
      });
      await this.chatMessageRepository.save(userMessage);

      // Get streaming response from Gemini
      const stream = await this.ai.models.generateContentStream({
        model,
        contents: prompt,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const text = chunk.text || '';
        if (text) {
          fullResponse += text;
          yield text;
        }
      }

      // Save assistant message to database after streaming completes
      if (fullResponse) {
        const assistantMessageEntity = this.chatMessageRepository.create({
          sessionId,
          role: MessageRole.ASSISTANT,
          content: fullResponse,
          model,
          ipAddress,
          userAgent,
        });
        await this.chatMessageRepository.save(assistantMessageEntity);
      }
    } catch (error) {
      this.logger.error('Error streaming chat message:', error.message);
      throw new BadRequestException(
        `Failed to stream chat message: ${error.message}`,
      );
    }
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(sessionId: string): Promise<ChatMessageDto[]> {
    const messages = await this.chatMessageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });

    return messages.map((msg) => ({
      role: msg.role as MessageRole,
      content: msg.content,
    }));
  }

  /**
   * Build prompt for Gemini API
   */
  private buildPromptForGemini(
    userMessage: string,
    conversationHistory?: ChatMessageDto[],
  ): string {
    let prompt = `${this.getSystemPrompt()}\n\n`;

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg) => {
        const role = msg.role === MessageRole.USER ? 'User' : 'Assistant';
        prompt += `${role}: ${msg.content}\n\n`;
      });
    }

    // Add current user message
    prompt += `User: ${userMessage}\n\nAssistant:`;

    return prompt;
  }

  /**
   * Get system prompt for the chatbot
   */
  private getSystemPrompt(): string {
    return `You are a helpful and friendly website chatbot assistant. Your role is to:
- Answer questions about the website and blog content
- Provide helpful information to visitors
- Be concise, friendly, and professional
- If you don't know something, politely say so
- Guide users to relevant content when appropriate

Keep your responses conversational, helpful, and under 200 words unless the user asks for more detail.`;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
