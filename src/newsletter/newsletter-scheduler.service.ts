import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Subscriber, SubscriberStatus } from './entities/subscriber.entity';
import { BlogPost, BlogPostStatus } from '../blog/entities/blog-post.entity';
import { BlogContent } from '../blog/entities/blog-content.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class NewsletterSchedulerService {
  private readonly logger = new Logger(NewsletterSchedulerService.name);

  constructor(
    @InjectRepository(Subscriber)
    private subscriberRepository: Repository<Subscriber>,
    @InjectRepository(BlogPost)
    private blogPostRepository: Repository<BlogPost>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  /**
   * Send daily newsletter at 9 AM (peak time)
   * Cron: 0 9 * * * (At 09:00 every day)
   */
  @Cron('0 9 * * *', {
    name: 'daily-newsletter',
    timeZone: 'UTC',
  })
  async sendDailyNewsletter(): Promise<void> {
    this.logger.log('Starting daily newsletter job...');

    try {
      // Get the latest published post from the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const latestPost = await this.blogPostRepository.findOne({
        where: {
          status: BlogPostStatus.PUBLISHED,
          publishedAt: MoreThan(yesterday),
        },
        relations: [
          'featuredImage',
          'blogContent',
          'author',
          'blogCategories',
          'blogCategories.category',
        ],
        order: { publishedAt: 'DESC' },
      });

      if (!latestPost) {
        this.logger.log(
          'No new posts published in the last 24 hours. Skipping newsletter.',
        );
        return;
      }

      // Get all verified subscribers
      const subscribers = await this.subscriberRepository.find({
        where: { status: SubscriberStatus.VERIFIED },
      });

      if (subscribers.length === 0) {
        this.logger.log('No verified subscribers found. Skipping newsletter.');
        return;
      }

      this.logger.log(
        `Sending newsletter about "${latestPost.title}" to ${subscribers.length} subscribers`,
      );

      // Send emails in batches to avoid overwhelming the mail server
      const batchSize = 50;
      const batches = this.chunkArray(subscribers, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        await Promise.allSettled(
          batch.map((subscriber) =>
            this.sendNewsletterToSubscriber(subscriber, latestPost),
          ),
        );

        // Small delay between batches
        if (i < batches.length - 1) {
          await this.delay(1000);
        }
      }

      this.logger.log('Daily newsletter job completed successfully.');
    } catch (error) {
      this.logger.error('Failed to send daily newsletter:', error.message);
    }
  }

  /**
   * Alternative: Send newsletter at 6 PM (evening peak time)
   * Uncomment to use this instead or in addition
   */
  // @Cron('0 18 * * *', {
  //   name: 'evening-newsletter',
  //   timeZone: 'UTC',
  // })
  // async sendEveningNewsletter(): Promise<void> {
  //   await this.sendDailyNewsletter();
  // }

  /**
   * Send newsletter email to a single subscriber
   */
  private async sendNewsletterToSubscriber(
    subscriber: Subscriber,
    post: BlogPost,
  ): Promise<void> {
    try {
      const appName = this.configService.get<string>('APP_NAME', 'WealthAlgor');
      const frontendUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'https://wealthalgor.com',
      );
      const postUrl = `${frontendUrl}/blog/${post.slug}`;
      const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${subscriber.unsubscribeToken}`;

      const subject = `📰 ${post.title} - ${appName}`;
      const html = this.generateNewsletterHtml(
        subscriber,
        post,
        postUrl,
        unsubscribeUrl,
        appName,
        frontendUrl,
      );

      await this.emailService.sendEmail(subscriber.email, subject, html);

      // Update subscriber stats
      await this.subscriberRepository.update(subscriber.id, {
        lastEmailSentAt: new Date(),
        emailsSent: () => 'emails_sent + 1',
      });
    } catch (error) {
      this.logger.error(
        `Failed to send newsletter to ${subscriber.email}:`,
        error.message,
      );
    }
  }

  /**
   * Generate newsletter HTML
   */
  private generateNewsletterHtml(
    subscriber: Subscriber,
    post: BlogPost,
    postUrl: string,
    unsubscribeUrl: string,
    appName: string,
    frontendUrl: string,
  ): string {
    const imageUrl =
      post.featuredImage?.url || `${frontendUrl}/placeholder.svg`;

    const excerpt = post.excerpt || post.title;
    const authorName = post.author?.email?.split('@')[0] || 'WealthAlgor Team';
    const categoryName = post.blogCategories?.[0]?.category?.name || 'Article';
    const readingTime =
      post.readingTime ||
      Math.ceil((post.blogContent?.wordCount || 1000) / 200);
    const publishedDate = post.publishedAt
      ? new Date(post.publishedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="${frontendUrl}" style="text-decoration: none;">
        <h1 style="color: #1e293b; font-size: 24px; margin: 0;">${appName}</h1>
      </a>
      <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Daily Newsletter</p>
    </div>
    
    <!-- Main Content -->
    <div style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
      <!-- Featured Image -->
      <div style="width: 100%; height: 240px; overflow: hidden;">
        <img src="${imageUrl}" alt="${post.title}" style="width: 100%; height: 100%; object-fit: cover;">
      </div>
      
      <!-- Article Content -->
      <div style="padding: 32px;">
        <!-- Category Badge -->
        <span style="display: inline-block; background-color: #eff6ff; color: #3b82f6; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; margin-bottom: 16px;">
          ${categoryName}
        </span>
        
        <!-- Title -->
        <h2 style="color: #1e293b; font-size: 24px; line-height: 1.3; margin: 0 0 16px 0;">
          <a href="${postUrl}" style="color: #1e293b; text-decoration: none;">${post.title}</a>
        </h2>
        
        <!-- Meta Info -->
        <div style="color: #64748b; font-size: 14px; margin-bottom: 16px;">
          <span>By ${authorName}</span>
          <span style="margin: 0 8px;">•</span>
          <span>${publishedDate}</span>
          <span style="margin: 0 8px;">•</span>
          <span>${readingTime} min read</span>
        </div>
        
        <!-- Excerpt -->
        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          ${excerpt}
        </p>
        
        <!-- CTA Button -->
        <div style="text-align: center;">
          <a href="${postUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Read Full Article
          </a>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 14px; margin: 0 0 16px 0;">
        You're receiving this because you subscribed to ${appName}.
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0;">
        © ${new Date().getFullYear()} ${appName}. All rights reserved.
      </p>
      <p style="margin: 0;">
        <a href="${unsubscribeUrl}" style="color: #94a3b8; font-size: 12px;">Unsubscribe</a>
        <span style="color: #94a3b8; margin: 0 8px;">|</span>
        <a href="${frontendUrl}/privacy" style="color: #94a3b8; font-size: 12px;">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
