import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { BlogGenerationService } from './blog-generation.service';
import { BlogSchedulerService } from './blog-scheduler.service';
import { BlogTaskService } from './blog-task.service';
import { IntelligentBlogGenerationService } from './intelligent-blog-generation.service';
import { BlogPost } from './entities/blog-post.entity';
import { BlogContent } from './entities/blog-content.entity';
import { BlogSeo } from './entities/blog-seo.entity';
import { BlogSchema } from './entities/blog-schema.entity';
import { BlogFaq } from './entities/blog-faq.entity';
import { BlogTask } from './entities/blog-task.entity';
import { BlogAnalytics } from './entities/blog-analytics.entity';
import { Category } from '../taxonomy/entities/category.entity';
import { Tag } from '../taxonomy/entities/tag.entity';
import { BlogCategory } from '../taxonomy/entities/blog-category.entity';
import { BlogTag } from '../taxonomy/entities/blog-tag.entity';
import { User } from '../users/entities/user.entity';
import { AiModule } from '../ai/ai.module';
import { EmailModule } from '../email/email.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BlogPost,
      BlogContent,
      BlogSeo,
      BlogSchema,
      BlogFaq,
      BlogTask,
      BlogAnalytics,
      Category,
      Tag,
      BlogCategory,
      BlogTag,
      User,
    ]),
    AiModule,
    EmailModule,
    MediaModule,
  ],
  controllers: [BlogController],
  providers: [
    BlogService,
    BlogGenerationService,
    BlogSchedulerService,
    BlogTaskService,
    IntelligentBlogGenerationService,
  ],
  exports: [
    BlogService,
    BlogGenerationService,
    BlogTaskService,
    BlogSchedulerService,
    IntelligentBlogGenerationService,
  ],
})
export class BlogModule {}
