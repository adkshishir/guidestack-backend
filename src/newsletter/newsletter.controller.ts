import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { NewsletterService } from './newsletter.service';
import { SubscribeDto, SubscriptionResponseDto } from './dto/subscribe.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Public()
  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe to newsletter' })
  @ApiResponse({
    status: 200,
    description: 'Subscription initiated successfully',
    type: SubscriptionResponseDto,
  })
  async subscribe(
    @Body() subscribeDto: SubscribeDto,
    @Req() request: Request,
  ): Promise<SubscriptionResponseDto> {
    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.ip;
    const userAgent = request.headers['user-agent'];

    return this.newsletterService.subscribe(subscribeDto, ipAddress, userAgent);
  }

  @Public()
  @Get('verify')
  @ApiOperation({ summary: 'Verify subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription verified successfully',
    type: SubscriptionResponseDto,
  })
  async verifySubscription(
    @Query('token') token: string,
  ): Promise<SubscriptionResponseDto> {
    return this.newsletterService.verifySubscription(token);
  }

  @Public()
  @Get('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from newsletter' })
  @ApiResponse({
    status: 200,
    description: 'Unsubscribed successfully',
    type: SubscriptionResponseDto,
  })
  async unsubscribe(
    @Query('token') token: string,
  ): Promise<SubscriptionResponseDto> {
    return this.newsletterService.unsubscribe(token);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get subscriber statistics' })
  @ApiResponse({
    status: 200,
    description: 'Subscriber statistics',
  })
  async getStats() {
    return this.newsletterService.getSubscriberCount();
  }
}
