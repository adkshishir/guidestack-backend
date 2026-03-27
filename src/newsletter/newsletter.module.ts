import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { NewsletterSchedulerService } from './newsletter-scheduler.service';
import { Subscriber } from './entities/subscriber.entity';
import { BlogPost } from '../blog/entities/blog-post.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([Subscriber, BlogPost]), EmailModule],
  controllers: [NewsletterController],
  providers: [NewsletterService, NewsletterSchedulerService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
