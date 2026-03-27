import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Comment, CommentStatus } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { VerifyCommentDto } from './dto/verify-comment.dto';
import { BlogPost } from '../blog/entities/blog-post.entity';
import {
  Subscriber,
  SubscriberStatus,
} from '../newsletter/entities/subscriber.entity';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(BlogPost)
    private blogPostRepository: Repository<BlogPost>,
    @InjectRepository(Subscriber)
    private subscriberRepository: Repository<Subscriber>,
    private emailService: EmailService,
  ) {}

  async create(
    createCommentDto: CreateCommentDto,
    userId?: number,
  ): Promise<Comment & { commentToken?: string }> {
    // Verify blog post exists
    const blogPost = await this.blogPostRepository.findOne({
      where: { id: createCommentDto.blogPostId },
    });
    if (!blogPost) {
      throw new NotFoundException('Blog post not found');
    }

    // Verify parent comment exists if provided
    if (createCommentDto.parentId) {
      const parent = await this.commentsRepository.findOne({
        where: { id: createCommentDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }
      // Ensure parent comment belongs to the same blog post
      if (parent.blogPostId !== createCommentDto.blogPostId) {
        throw new BadRequestException(
          'Parent comment must belong to the same blog post',
        );
      }
    }

    // If user is authenticated, create comment directly
    if (userId) {
      const comment = this.commentsRepository.create({
        ...createCommentDto,
        userId,
        status: CommentStatus.VISIBLE,
      });
      return this.commentsRepository.save(comment);
    }

    // Guest comment flow
    if (!createCommentDto.authorEmail || !createCommentDto.authorName) {
      throw new BadRequestException(
        'Email and name are required for guest comments',
      );
    }

    // Check if guest has a valid comment token
    if (createCommentDto.commentToken) {
      const subscriber = await this.subscriberRepository.findOne({
        where: {
          commentToken: createCommentDto.commentToken,
          status: SubscriberStatus.VERIFIED,
        },
      });

      if (subscriber) {
        // Token is valid, create comment directly
        const comment = this.commentsRepository.create({
          content: createCommentDto.content,
          blogPostId: createCommentDto.blogPostId,
          parentId: createCommentDto.parentId,
          authorName: subscriber.name || createCommentDto.authorName,
          authorEmail: subscriber.email,
          subscriberId: subscriber.id,
          status: CommentStatus.VISIBLE,
        });
        const savedComment = await this.commentsRepository.save(comment);
        return { ...savedComment, commentToken: subscriber.commentToken };
      }
    }

    // No valid token, require OTP verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const comment = this.commentsRepository.create({
      ...createCommentDto,
      verificationCode: otp,
      status: CommentStatus.PENDING_VERIFICATION,
    });

    const savedComment = await this.commentsRepository.save(comment);

    // Send OTP via email
    await this.sendOtpEmail(
      createCommentDto.authorEmail,
      createCommentDto.authorName,
      otp,
    );

    return savedComment;
  }

  private async sendOtpEmail(email: string, name: string, otp: string) {
    const subject = 'Verify your comment';
    const html = `
      <h1>Comment Verification</h1>
      <p>Hello ${name},</p>
      <p>Your verification code for the comment is: <strong>${otp}</strong></p>
      <p>This code will expire in 10 minutes.</p>
    `;
    await this.emailService.sendEmail(email, subject, html);
  }

  async verifyOtp(
    verifyCommentDto: VerifyCommentDto,
  ): Promise<Comment & { commentToken: string }> {
    const { email, code, commentId } = verifyCommentDto;

    const comment = await this.commentsRepository.findOne({
      where: {
        id: commentId,
        authorEmail: email,
        verificationCode: code,
        status: CommentStatus.PENDING_VERIFICATION,
      },
    });

    if (!comment) {
      throw new BadRequestException(
        'Invalid verification code or comment not found',
      );
    }

    // Update comment status
    comment.status = CommentStatus.VISIBLE;
    comment.verificationCode = null; // Clear code after verification

    // Also, Upsert Subscriber with comment token
    let subscriber = await this.subscriberRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    // Generate a comment token for future use
    const commentToken = crypto.randomBytes(32).toString('hex');

    if (!subscriber) {
      subscriber = this.subscriberRepository.create({
        email: email.toLowerCase().trim(),
        name: comment.authorName || undefined,
        status: SubscriberStatus.VERIFIED,
        verificationToken: crypto.randomBytes(32).toString('hex'),
        commentToken,
        verifiedAt: new Date(),
      });
    } else {
      if (subscriber.status !== SubscriberStatus.VERIFIED) {
        subscriber.status = SubscriberStatus.VERIFIED;
        subscriber.verifiedAt = new Date();
      }
      subscriber.name = subscriber.name || comment.authorName || undefined;
      // Update comment token (refresh it on each verification)
      subscriber.commentToken = commentToken;
    }

    await this.subscriberRepository.save(subscriber);
    comment.subscriberId = subscriber.id;

    const savedComment = await this.commentsRepository.save(comment);

    // Return comment with the token for client storage
    return { ...savedComment, commentToken };
  }

  async findAll(blogPostId?: number): Promise<Comment[]> {
    const where: any = {};
    if (blogPostId) {
      where.blogPostId = blogPostId;
    }

    return this.commentsRepository.find({
      where,
      relations: ['user', 'blogPost', 'parent', 'replies'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['user', 'blogPost', 'parent', 'replies'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    return comment;
  }

  async findByBlogPost(blogPostId: number): Promise<Comment[]> {
    return this.commentsRepository.find({
      where: {
        blogPostId,
        parentId: IsNull(),
        status: CommentStatus.VISIBLE,
      },
      relations: ['user', 'replies'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: number,
    updateCommentDto: UpdateCommentDto,
  ): Promise<Comment> {
    const comment = await this.findOne(id);

    if (updateCommentDto.content !== undefined) {
      comment.content = updateCommentDto.content;
    }
    if (updateCommentDto.status !== undefined) {
      comment.status = updateCommentDto.status;
    }

    return this.commentsRepository.save(comment);
  }

  async remove(id: number): Promise<void> {
    const comment = await this.findOne(id);
    // Soft delete by setting status to DELETED
    comment.status = CommentStatus.DELETED;
    await this.commentsRepository.save(comment);
  }

  async hardDelete(id: number): Promise<void> {
    const comment = await this.findOne(id);
    await this.commentsRepository.remove(comment);
  }
}
