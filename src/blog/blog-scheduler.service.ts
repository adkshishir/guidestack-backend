import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogGenerationService } from './blog-generation.service';
import { BlogTaskService } from './blog-task.service';
import { IntelligentBlogGenerationService } from './intelligent-blog-generation.service';
import { EmailService } from '../email/email.service';
import {
  Subscriber,
  SubscriberStatus,
} from '../newsletter/entities/subscriber.entity';

@Injectable()
export class BlogSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(BlogSchedulerService.name);

  constructor(
    private readonly blogGenerationService: BlogGenerationService,
    private readonly blogTaskService: BlogTaskService,
    private readonly intelligentBlogGenerationService: IntelligentBlogGenerationService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @InjectRepository(Subscriber)
    private readonly subscriberRepository: Repository<Subscriber>,
  ) {}

  onModuleInit() {}

  /**
   * Interval job to automatically generate blogs
   * Runs twice a week: Monday and Thursday at 1 AM
   * Cron: 0 1 * * 1,4 (Monday=1, Thursday=4)
   * Can be disabled via AUTO_BLOG_GENERATION_ENABLED environment variable
   */
  @Cron('0 1 * * 1,4', {
    name: 'blog-generation',
    timeZone: 'UTC',
  })
  async handleBlogGeneration() {
    this.logger.log(
      'Interval task triggered - checking if blog generation is enabled...',
    );

    const enabled = this.configService.get<boolean>(
      'AUTO_BLOG_GENERATION_ENABLED',
      true,
    );

    if (!enabled) {
      this.logger.log('Auto blog generation is disabled');
      return;
    }

    // Check if there are any active tasks in the database
    const activeTask = await this.blogTaskService.findNextActiveTask();

    if (!activeTask) {
      this.logger.log(
        'No active blog tasks found. Scheduler is now SLEEPING. It will wake up automatically when a task is added.',
      );
      return;
    }

    this.logger.log(
      `Scheduler is AWAKE. Found ${await this.getActiveTaskCount()} active task(s). Processing the oldest task.`,
    );

    try {
      this.logger.log(
        `Starting scheduled blog generation for task: "${activeTask.title}" (ID: ${activeTask.id})...`,
      );

      // Use the task title as the topic, or combine with description if available
      const topic = activeTask.description
        ? `${activeTask.title}. ${activeTask.description}`
        : activeTask.title;

      // Pass categoryIds and tagIds from task to blog generation
      const blogPost = await this.blogGenerationService.generateAndSaveBlog(
        topic,
        activeTask.categoryIds || undefined,
        activeTask.tagIds || undefined,
      );

      this.logger.log(
        `Successfully generated blog post: ${blogPost.title} (ID: ${blogPost.id}) from task: "${activeTask.title}"`,
      );
      // Send notifications to admin and subscribers
      await this.notifyAdminAndSubscribers(blogPost);
      // Deactivate the task after successful generation
      await this.blogTaskService.deactivate(activeTask.id);
      this.logger.log(`Task "${activeTask.title}" has been deactivated.`);
    } catch (error) {
      this.logger.error(
        `Failed to generate blog in scheduled task: ${error.message}`,
      );
      // Don't throw - we don't want to crash the scheduler
      // Task remains active so it can be retried
    }
  }

  /**
   * Alternative: Cron job to automatically generate blogs
   * Can be used instead of interval by uncommenting and configuring
   * Runs daily at 2 AM by default
   * Can be configured via BLOG_GENERATION_CRON environment variable
   */
  // @Cron(
  //   process.env.BLOG_GENERATION_CRON || CronExpression.EVERY_DAY_AT_2AM,
  //   {
  //     name: 'auto-generate-blog',
  //   },
  // )
  // async handleBlogGenerationCron() {
  //   const enabled = this.configService.get<boolean>(
  //     'AUTO_BLOG_GENERATION_ENABLED',
  //     true,
  //   );

  //   if (!enabled) {
  //     this.logger.log('Auto blog generation is disabled');
  //     return;
  //   }

  //   try {
  //     this.logger.log('Starting scheduled blog generation (cron)...');
  //     const blogPost = await this.blogGenerationService.generateAndSaveBlog();
  //     this.logger.log(
  //       `Successfully generated blog post: ${blogPost.title} (ID: ${blogPost.id})`,
  //     );
  //   } catch (error) {
  //     this.logger.error(
  //       `Failed to generate blog in scheduled task: ${error.message}`,
  //     );
  //   }
  // }

  /**
   * Manual trigger for blog generation (can be called via API)
   */
  async generateBlogManually(topic?: string) {
    this.logger.log('Manual blog generation triggered');
    return await this.blogGenerationService.generateAndSaveBlog(topic);
  }

  /**
   * Get count of active tasks
   */
  private async getActiveTaskCount(): Promise<number> {
    const activeTasks = await this.blogTaskService.findAll(true);
    return activeTasks.length;
  }

  /**
   * Send blog notification to both admin and all verified subscribers
   */
  private async notifyAdminAndSubscribers(blogPost: any): Promise<void> {
    try {
      // Prepare blog details for notification
      const blogDetails = {
        id: blogPost.id,
        title: blogPost.title,
        slug: blogPost.slug,
        excerpt: blogPost.excerpt,
        author: blogPost.author?.fullName || 'AI System',
        publishedAt: blogPost.publishedAt,
        readingTime: blogPost.blogContent?.readingTime || 5,
        wordCount: blogPost.blogContent?.wordCount || 0,
        faqCount: blogPost.faqCount || 0,
        topic: blogPost.topic,
        tableOfContents: blogPost.blogContent?.tableOfContents,
      };

      // Get admin email
      const adminEmail = this.configService.get<string>('MAIL_ADMIN');

      // Get all verified subscribers
      const subscribers = await this.subscriberRepository.find({
        where: { status: SubscriberStatus.VERIFIED },
      });

      const subscriberEmails = subscribers.map((sub) => sub.email);

      // Combine admin and subscriber emails
      const allRecipients = adminEmail
        ? [adminEmail, ...subscriberEmails]
        : subscriberEmails;

      if (allRecipients.length === 0) {
        this.logger.warn(
          'No admin or verified subscribers found. Skipping email notification.',
        );
        return;
      }

      // Send email to all recipients
      const subject = `✍️ New Article Published: ${blogDetails.title}`;
      const html = this.emailService.generateBlogNotificationHtml(blogDetails);
      const text = this.emailService.generateBlogNotificationText(blogDetails);

      await this.emailService.sendEmail(allRecipients, subject, html, text);

      this.logger.log(
        `Email notification sent to ${allRecipients.length} recipient(s): admin + ${subscriberEmails.length} subscriber(s)`,
      );
    } catch (error) {
      this.logger.error(`Failed to send blog notification: ${error.message}`);
      // Don't throw - we don't want to crash the scheduler
    }
  }

  /**
   * Wake up the scheduler to check for tasks immediately
   * Called when the first active task is created (transitioning from 0 to 1+ active tasks)
   */
  async wakeUpScheduler() {
    const activeCount = await this.getActiveTaskCount();
    this.logger.log(
      `Scheduler WAKING UP - Found ${activeCount} active task(s). Starting blog generation immediately...`,
    );
    // Trigger the blog generation handler immediately
    await this.handleBlogGeneration();
  }

  /**
   * Intelligent blog generation cron job
   * Runs once per day at 4 AM when there are no active blog tasks
   * Analyzes existing content and generates comprehensive, related blogs
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM, {
    name: 'intelligent-blog-generation',
  })
  async handleIntelligentBlogGeneration() {
    this.logger.log(
      'Intelligent blog generation cron triggered - checking conditions...',
    );

    const enabled = this.configService.get<boolean>(
      'INTELLIGENT_BLOG_GENERATION_ENABLED',
      true,
    );

    if (!enabled) {
      this.logger.log('Intelligent blog generation is disabled');
      return;
    }

    // Check if there are any active tasks
    const activeTasks = await this.blogTaskService.findAll(true);
    if (activeTasks.length > 0) {
      this.logger.log(
        `Skipping intelligent blog generation - ${activeTasks.length} active task(s) exist. Task-based generation takes priority.`,
      );
      return;
    }

    this.logger.log(
      'No active tasks found. Starting intelligent blog generation...',
    );

    try {
      const blogPost =
        await this.intelligentBlogGenerationService.generateIntelligentBlog();

      this.logger.log(
        `Successfully generated intelligent blog post: ${blogPost.title} (ID: ${blogPost.id})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate intelligent blog: ${error.message}`,
      );
      this.logger.debug('Error details:', error);
      // Don't throw - we don't want to crash the scheduler
      // The service will retry on the next cron run
    }
  }
}
