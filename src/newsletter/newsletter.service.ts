import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Subscriber, SubscriberStatus } from './entities/subscriber.entity';
import { SubscribeDto } from './dto/subscribe.dto';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    @InjectRepository(Subscriber)
    private subscriberRepository: Repository<Subscriber>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  /**
   * Subscribe a new user to the newsletter
   */
  async subscribe(
    subscribeDto: SubscribeDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string }> {
    const { email, name, source } = subscribeDto;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if subscriber already exists
    const existingSubscriber = await this.subscriberRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existingSubscriber) {
      if (existingSubscriber.status === SubscriberStatus.VERIFIED) {
        return {
          success: true,
          message: 'You are already subscribed to our newsletter.',
        };
      }

      if (existingSubscriber.status === SubscriberStatus.PENDING) {
        // Resend verification email
        await this.sendVerificationEmail(existingSubscriber);
        return {
          success: true,
          message:
            'A verification email has been sent. Please check your inbox.',
        };
      }

      if (existingSubscriber.status === SubscriberStatus.UNSUBSCRIBED) {
        // Re-subscribe
        existingSubscriber.status = SubscriberStatus.PENDING;
        existingSubscriber.verificationToken = this.generateToken();
        existingSubscriber.unsubscribedAt = undefined;
        await this.subscriberRepository.save(existingSubscriber);
        await this.sendVerificationEmail(existingSubscriber);
        return {
          success: true,
          message:
            'Welcome back! A verification email has been sent to confirm your subscription.',
        };
      }
    }

    // Create new subscriber
    const verificationToken = this.generateToken();
    const unsubscribeToken = this.generateToken();

    const subscriber = this.subscriberRepository.create({
      email: normalizedEmail,
      name,
      source,
      verificationToken,
      unsubscribeToken,
      status: SubscriberStatus.PENDING,
      ipAddress,
      userAgent,
    });

    await this.subscriberRepository.save(subscriber);

    // Send verification email
    await this.sendVerificationEmail(subscriber);

    return {
      success: true,
      message:
        'Thank you for subscribing! Please check your email to verify your subscription.',
    };
  }

  /**
   * Verify subscription using token
   */
  async verifySubscription(
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    const subscriber = await this.subscriberRepository.findOne({
      where: { verificationToken: token },
    });

    if (!subscriber) {
      throw new NotFoundException('Invalid verification token.');
    }

    if (subscriber.status === SubscriberStatus.VERIFIED) {
      return {
        success: true,
        message: 'Your subscription is already verified.',
      };
    }

    subscriber.status = SubscriberStatus.VERIFIED;
    subscriber.verifiedAt = new Date();
    await this.subscriberRepository.save(subscriber);

    // Send welcome email
    await this.sendWelcomeEmail(subscriber);

    return {
      success: true,
      message:
        'Your subscription has been verified! You will now receive our newsletter.',
    };
  }

  /**
   * Unsubscribe using token
   */
  async unsubscribe(
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    const subscriber = await this.subscriberRepository.findOne({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      throw new NotFoundException('Invalid unsubscribe token.');
    }

    if (subscriber.status === SubscriberStatus.UNSUBSCRIBED) {
      return {
        success: true,
        message: 'You have already been unsubscribed.',
      };
    }

    subscriber.status = SubscriberStatus.UNSUBSCRIBED;
    subscriber.unsubscribedAt = new Date();
    await this.subscriberRepository.save(subscriber);

    return {
      success: true,
      message:
        'You have been successfully unsubscribed. We are sorry to see you go!',
    };
  }

  /**
   * Get all verified subscribers
   */
  async getVerifiedSubscribers(): Promise<Subscriber[]> {
    return this.subscriberRepository.find({
      where: { status: SubscriberStatus.VERIFIED },
    });
  }

  /**
   * Get subscriber count
   */
  async getSubscriberCount(): Promise<{
    total: number;
    verified: number;
    pending: number;
    unsubscribed: number;
  }> {
    const [total, verified, pending, unsubscribed] = await Promise.all([
      this.subscriberRepository.count(),
      this.subscriberRepository.count({
        where: { status: SubscriberStatus.VERIFIED },
      }),
      this.subscriberRepository.count({
        where: { status: SubscriberStatus.PENDING },
      }),
      this.subscriberRepository.count({
        where: { status: SubscriberStatus.UNSUBSCRIBED },
      }),
    ]);

    return { total, verified, pending, unsubscribed };
  }

  /**
   * Update last email sent timestamp
   */
  async updateLastEmailSent(subscriberId: number): Promise<void> {
    await this.subscriberRepository.update(subscriberId, {
      lastEmailSentAt: new Date(),
      emailsSent: () => 'emails_sent + 1',
    });
  }

  /**
   * Generate random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Send verification email
   */
  private async sendVerificationEmail(subscriber: Subscriber): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME', 'GuideStack');
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'https://wealthalgor.com',
    );
    const verifyUrl = `${frontendUrl}/verify-subscription?token=${subscriber.verificationToken}`;

    const subject = `Verify your subscription to ${appName}`;
    const html = this.generateVerificationEmailHtml(
      subscriber,
      verifyUrl,
      appName,
    );

    await this.emailService.sendEmail(subscriber.email, subject, html);
  }

  /**
   * Send welcome email after verification
   */
  private async sendWelcomeEmail(subscriber: Subscriber): Promise<void> {
    const appName = this.configService.get<string>('APP_NAME', 'GuideStack');
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'https://wealthalgor.com',
    );
    const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${subscriber.unsubscribeToken}`;

    const subject = `Welcome to ${appName}!`;
    const html = this.generateWelcomeEmailHtml(
      subscriber,
      frontendUrl,
      unsubscribeUrl,
      appName,
    );

    await this.emailService.sendEmail(subscriber.email, subject, html);
  }

  /**
   * Generate verification email HTML
   */
  private generateVerificationEmailHtml(
    subscriber: Subscriber,
    verifyUrl: string,
    appName: string,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Subscription</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1e293b; font-size: 28px; margin: 0;">Verify Your Email</h1>
      </div>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Hi${subscriber.name ? ` ${subscriber.name}` : ''},
      </p>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Thank you for subscribing to ${appName}! Please click the button below to verify your email address and start receiving our newsletter.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Verify Email Address
        </a>
      </div>
      
      <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="color: #3b82f6; font-size: 14px; word-break: break-all; margin-bottom: 24px;">
        ${verifyUrl}
      </p>
      
      <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
        If you didn't subscribe to ${appName}, you can safely ignore this email.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
      
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        © ${new Date().getFullYear()} ${appName}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate welcome email HTML
   */
  private generateWelcomeEmailHtml(
    subscriber: Subscriber,
    frontendUrl: string,
    unsubscribeUrl: string,
    appName: string,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${appName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1e293b; font-size: 28px; margin: 0;">🎉 Welcome to ${appName}!</h1>
      </div>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Hi${subscriber.name ? ` ${subscriber.name}` : ''},
      </p>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Your subscription has been confirmed! You're now part of our community of readers who receive the latest insights on finance, AI, and technology.
      </p>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Here's what you can expect:
      </p>
      
      <ul style="color: #475569; font-size: 16px; line-height: 1.8; margin-bottom: 24px; padding-left: 24px;">
        <li>Daily updates with our latest articles</li>
        <li>Expert insights on wealth management and algorithmic trading</li>
        <li>Early access to new features and content</li>
      </ul>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${frontendUrl}/blog" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Explore Our Blog
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
      
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0 0 8px 0;">
        © ${new Date().getFullYear()} ${appName}. All rights reserved.
      </p>
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        <a href="${unsubscribeUrl}" style="color: #94a3b8;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
