import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { BlogPost } from '../blog/entities/blog-post.entity';
import { BlogAnalytics } from '../blog/entities/blog-analytics.entity';
import { User } from '../users/entities/user.entity';
import { Comment } from '../comments/entities/comment.entity';
import { Category } from '../taxonomy/entities/category.entity';
import { Tag } from '../taxonomy/entities/tag.entity';
import { Subscriber } from '../newsletter/entities/subscriber.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BlogPost,
      BlogAnalytics,
      User,
      Comment,
      Category,
      Tag,
      Subscriber,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
