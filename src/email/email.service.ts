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
    tableOfContents?: { text: string; level: number }[];
  }): Promise<void> {
    const adminEmail = this.configService.get<string>('MAIL_ADMIN');
    if (!adminEmail) {
      this.logger.warn(
        'MAIL_ADMIN not configured. Skipping blog generation notification.',
      );
      return;
    }

    const subject = `✍️ New Article Published: ${blogDetails.title}`;
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
    tableOfContents?: { text: string; level: number }[];
  }): string {
    const publishedDate = new Date(blogDetails.publishedAt).toLocaleDateString(
      'en-US',
      { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    );
    const appName = this.configService.get<string>('SITE_NAME', 'Blog Platform');
    const baseUrl = this.configService.get<string>('SITE_URL', 'http://localhost:3000');
    const blogUrl = `${baseUrl}/blog/${blogDetails.slug}`;

    const tocHtml = this.renderTocHtml(blogDetails.tableOfContents ?? []);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Article Published</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;">AI-Generated Article</p>
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">${this.escapeHtml(blogDetails.title)}</h1>
              <p style="margin:16px 0 0 0;font-size:14px;color:#cbd5e1;">${this.escapeHtml(blogDetails.excerpt)}</p>
            </td>
          </tr>

          <!-- Stats bar -->
          <tr>
            <td style="background:#3b82f6;padding:14px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="color:#ffffff;font-size:13px;font-weight:600;">
                    📖 ${blogDetails.readingTime} min read
                    &nbsp;&nbsp;·&nbsp;&nbsp;
                    📝 ${blogDetails.wordCount.toLocaleString()} words
                    &nbsp;&nbsp;·&nbsp;&nbsp;
                    ❓ ${blogDetails.faqCount} FAQs
                    &nbsp;&nbsp;·&nbsp;&nbsp;
                    🗓 ${publishedDate}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 40px;">

              ${blogDetails.topic ? `
              <!-- Topic pill -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px 16px;">
                    <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#3b82f6;">Generated Topic</p>
                    <p style="margin:4px 0 0 0;font-size:14px;color:#1e3a5f;">${this.escapeHtml(blogDetails.topic)}</p>
                  </td>
                </tr>
              </table>
              ` : ''}

              ${tocHtml}

              <!-- Meta details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;margin-top:28px;padding-top:24px;">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:13px;color:#64748b;font-weight:600;width:120px;">Author</td>
                        <td style="font-size:13px;color:#334155;">${this.escapeHtml(blogDetails.author)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:13px;color:#64748b;font-weight:600;width:120px;">Post ID</td>
                        <td style="font-size:13px;color:#334155;">#${blogDetails.id}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:13px;color:#64748b;font-weight:600;width:120px;">Slug</td>
                        <td style="font-size:13px;color:#334155;font-family:monospace;">${this.escapeHtml(blogDetails.slug)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td align="center" style="border-radius:8px;background:#1e293b;">
                    <a href="${blogUrl}" target="_blank"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
                      Read the Full Article →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Automated notification from <strong>${this.escapeHtml(appName)}</strong> · Article generated by AI
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Render Table of Contents as email-safe HTML (inline styles only, no JS).
   */
  private renderTocHtml(items: { text: string; level: number }[]): string {
    if (!items || items.length === 0) return '';

    const rows = items
      .map((item) => {
        const indent = (item.level - 2) * 20;
        const isH3 = item.level === 3;
        return `
        <tr>
          <td style="padding:5px 0 5px ${indent}px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:10px;vertical-align:top;">
                  <span style="font-size:${isH3 ? '10' : '12'}px;color:${isH3 ? '#94a3b8' : '#3b82f6'};">
                    ${isH3 ? '◦' : '▸'}
                  </span>
                </td>
                <td>
                  <span style="font-size:${isH3 ? '13' : '14'}px;color:${isH3 ? '#64748b' : '#1e293b'};font-weight:${isH3 ? '400' : '500'};">
                    ${this.escapeHtml(item.text)}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
      })
      .join('');

    return `
    <!-- Table of Contents -->
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:28px;">
      <tr>
        <td style="padding:20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:14px;border-bottom:1px solid #e2e8f0;margin-bottom:12px;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:8px;font-size:16px;">📋</td>
                    <td style="font-size:14px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:1px;">
                      Table of Contents
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${rows}
          </table>
        </td>
      </tr>
    </table>`;
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
    tableOfContents?: { text: string; level: number }[];
  }): string {
    const publishedDate = new Date(blogDetails.publishedAt).toLocaleString();
    const appName = this.configService.get<string>('SITE_NAME', 'Blog Platform');
    const baseUrl = this.configService.get<string>('SITE_URL', 'http://localhost:3000');

    const tocText =
      blogDetails.tableOfContents && blogDetails.tableOfContents.length > 0
        ? `\nTable of Contents\n${'─'.repeat(30)}\n${blogDetails.tableOfContents
            .map((item) => {
              const indent = ' '.repeat((item.level - 2) * 4);
              const bullet = item.level === 2 ? '▸' : '◦';
              return `${indent}${bullet} ${item.text}`;
            })
            .join('\n')}\n`
        : '';

    return `
New Article Published: ${blogDetails.title}

${blogDetails.excerpt}
${blogDetails.topic ? `\nTopic: ${blogDetails.topic}` : ''}
${tocText}
Author:       ${blogDetails.author}
Published:    ${publishedDate}
Reading time: ${blogDetails.readingTime} min
Word count:   ${blogDetails.wordCount.toLocaleString()} words
FAQs:         ${blogDetails.faqCount}
Post ID:      #${blogDetails.id}

Read the full article:
${baseUrl}/blog/${blogDetails.slug}

---
Automated notification from ${appName} · Article generated by AI
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
