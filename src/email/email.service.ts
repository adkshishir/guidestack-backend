import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    const mailHost = this.configService.get<string>('MAIL_HOST');
    const mailPort = this.configService.get<number>('MAIL_PORT', 587);
    const mailAuth = this.configService.get<boolean>('MAIL_AUTH', true);
    const mailUsername = this.configService.get<string>('MAIL_USERNAME');
    const mailPassword = this.configService.get<string>('MAIL_PASSWORD');
    const mailFrom = this.configService.get<string>('MAIL_FROM');

    if (!mailHost || !mailUsername || !mailPassword) {
      this.logger.warn(
        'Email configuration is incomplete. Email notifications will be disabled.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: mailHost,
      port: mailPort,
      secure: mailPort === 465, // true for 465, false for other ports
      auth: mailAuth
        ? {
            user: mailUsername,
            pass: mailPassword,
          }
        : undefined,
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error(
          'Email transporter verification failed:',
          error.message,
        );
      } else {
        this.logger.log('Email transporter is ready to send emails');
      }
    });
  }

  /**
   * Send email notification
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        'Email transporter not configured. Skipping email send.',
      );
      return;
    }

    const mailFrom = this.configService.get<string>('MAIL_FROM');
    if (!mailFrom) {
      this.logger.warn('MAIL_FROM not configured. Skipping email send.');
      return;
    }

    try {
      const recipients = Array.isArray(to) ? to : [to];
      const info = await this.transporter.sendMail({
        from: mailFrom,
        to: recipients.join(', '),
        subject,
        text: text || this.stripHtml(html),
        html,
      });

      this.logger.log(`Email sent successfully to ${recipients.join(', ')}`);
      this.logger.debug('Email info:', info.messageId);
    } catch (error) {
      this.logger.error('Failed to send email:', error.message);
      throw error;
    }
  }

  /**
   * Send blog generation notification to admin
   */
  async sendBlogGenerationNotification(blogDetails: {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    author: string;
    publishedAt: Date;
    readingTime: number;
    wordCount: number;
    faqCount: number;
    topic?: string;
  }): Promise<void> {
    const adminEmail = this.configService.get<string>('MAIL_ADMIN');
    if (!adminEmail) {
      this.logger.warn(
        'MAIL_ADMIN not configured. Skipping blog generation notification.',
      );
      return;
    }

    const subject = `New Blog Post Generated: ${blogDetails.title}`;
    const html = this.generateBlogNotificationHtml(blogDetails);
    const text = this.generateBlogNotificationText(blogDetails);

    await this.sendEmail(adminEmail, subject, html, text);
  }

  /**
   * Generate HTML email content for blog notification
   */
  private generateBlogNotificationHtml(blogDetails: {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    author: string;
    publishedAt: Date;
    readingTime: number;
    wordCount: number;
    faqCount: number;
    topic?: string;
  }): string {
    const publishedDate = new Date(blogDetails.publishedAt).toLocaleString();
    const appName = this.configService.get<string>('APP_NAME', 'Blog Platform');
    const baseUrl = this.configService.get<string>(
      'APP_URL',
      'http://localhost:3000',
    );

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Blog Post Generated</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #4CAF50;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background-color: #f9f9f9;
      padding: 20px;
      border: 1px solid #ddd;
      border-top: none;
    }
    .detail-row {
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid #eee;
    }
    .detail-label {
      font-weight: bold;
      color: #555;
      margin-bottom: 5px;
    }
    .detail-value {
      color: #333;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      color: #777;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>New Blog Post Generated</h1>
  </div>
  <div class="content">
    <p>A new blog post has been automatically generated and published on your blog platform.</p>
    
    <div class="detail-row">
      <div class="detail-label">Blog Title:</div>
      <div class="detail-value">${this.escapeHtml(blogDetails.title)}</div>
    </div>
    
    <div class="detail-row">
      <div class="detail-label">Blog ID:</div>
      <div class="detail-value">#${blogDetails.id}</div>
    </div>
    
    <div class="detail-row">
      <div class="detail-label">Slug:</div>
      <div class="detail-value">${this.escapeHtml(blogDetails.slug)}</div>
    </div>
    
    <div class="detail-row">
      <div class="detail-label">Excerpt:</div>
      <div class="detail-value">${this.escapeHtml(blogDetails.excerpt)}</div>
    </div>
    
    ${
      blogDetails.topic
        ? `
    <div class="detail-row">
      <div class="detail-label">Generated Topic:</div>
      <div class="detail-value">${this.escapeHtml(blogDetails.topic)}</div>
    </div>
    `
        : ''
    }
    
    <div class="detail-row">
      <div class="detail-label">Author:</div>
      <div class="detail-value">${this.escapeHtml(blogDetails.author)}</div>
    </div>
    
    <div class="detail-row">
      <div class="detail-label">Published At:</div>
      <div class="detail-value">${publishedDate}</div>
    </div>
    
    <div class="detail-row">
      <div class="detail-label">Reading Time:</div>
      <div class="detail-value">${blogDetails.readingTime} minutes</div>
    </div>
    
    <div class="detail-row">
      <div class="detail-label">Word Count:</div>
      <div class="detail-value">${blogDetails.wordCount.toLocaleString()} words</div>
    </div>
    
    <div class="detail-row">
      <div class="detail-label">FAQs Included:</div>
      <div class="detail-value">${blogDetails.faqCount} FAQs</div>
    </div>
    
    <a href="${baseUrl}/blog/${blogDetails.slug}" class="button">View Blog Post</a>
  </div>
  
  <div class="footer">
    <p>This is an automated notification from ${appName}</p>
    <p>Blog post was automatically generated by AI</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text email content for blog notification
   */
  private generateBlogNotificationText(blogDetails: {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    author: string;
    publishedAt: Date;
    readingTime: number;
    wordCount: number;
    faqCount: number;
    topic?: string;
  }): string {
    const publishedDate = new Date(blogDetails.publishedAt).toLocaleString();
    const appName = this.configService.get<string>('APP_NAME', 'Blog Platform');
    const baseUrl = this.configService.get<string>(
      'APP_URL',
      'http://localhost:3000',
    );

    return `
New Blog Post Generated

A new blog post has been automatically generated and published on your blog platform.

Blog Title: ${blogDetails.title}
Blog ID: #${blogDetails.id}
Slug: ${blogDetails.slug}
Excerpt: ${blogDetails.excerpt}
${blogDetails.topic ? `Generated Topic: ${blogDetails.topic}\n` : ''}
Author: ${blogDetails.author}
Published At: ${publishedDate}
Reading Time: ${blogDetails.readingTime} minutes
Word Count: ${blogDetails.wordCount.toLocaleString()} words
FAQs Included: ${blogDetails.faqCount} FAQs

View the blog post: ${baseUrl}/blog/${blogDetails.slug}

---
This is an automated notification from ${appName}
Blog post was automatically generated by AI
    `.trim();
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
