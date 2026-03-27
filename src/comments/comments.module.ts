import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { BlogPost } from '../blog/entities/blog-post.entity';
import { Subscriber } from '../newsletter/entities/subscriber.entity';
import { NewsletterModule } from '../newsletter/newsletter.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, BlogPost, Subscriber]),
    NewsletterModule,
    EmailModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
