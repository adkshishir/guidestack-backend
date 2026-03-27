import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BlogModule } from './blog/blog.module';
import { AiModule } from './ai/ai.module';
import { UsersModule } from './users/users.module';
import { MediaModule } from './media/media.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { CommentsModule } from './comments/comments.module';
import { SettingsModule } from './settings/settings.module';
import { AuthModule } from './auth/auth.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { EmailModule } from './email/email.module';
import { ContactModule } from './contact/contact.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { DashboardModule } from './dashboard/dashboard.module';

// Import all entities from feature modules
import { User } from './users/entities/user.entity';
import { AuthorProfile } from './users/entities/author-profile.entity';
import { Media } from './media/entities/media.entity';
import { BlogPost } from './blog/entities/blog-post.entity';
import { BlogContent } from './blog/entities/blog-content.entity';
import { BlogSeo } from './blog/entities/blog-seo.entity';
import { BlogSchema } from './blog/entities/blog-schema.entity';
import { BlogFaq } from './blog/entities/blog-faq.entity';
import { BlogRevision } from './blog/entities/blog-revision.entity';
import { BlogAnalytics } from './blog/entities/blog-analytics.entity';
import { BlogTask } from './blog/entities/blog-task.entity';
import { Category } from './taxonomy/entities/category.entity';
import { Tag } from './taxonomy/entities/tag.entity';
import { BlogTag } from './taxonomy/entities/blog-tag.entity';
import { BlogCategory } from './taxonomy/entities/blog-category.entity';
import { CategoryTag } from './taxonomy/entities/category-tag.entity';
import { Comment } from './comments/entities/comment.entity';
import { AiRequest } from './ai/entities/ai-request.entity';
import { SiteSettings } from './settings/entities/site-settings.entity';
import { ChatMessage } from './chatbot/entities/chat-message.entity';
import { Contact } from './contact/entities/contact.entity';
import { Subscriber } from './newsletter/entities/subscriber.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'blog_db'),
        entities: [
          User,
          AuthorProfile,
          Media,
          BlogPost,
          BlogContent,
          BlogSeo,
          BlogSchema,
          BlogFaq,
          BlogRevision,
          BlogAnalytics,
          BlogTask,
          Category,
          Tag,
          BlogTag,
          BlogCategory,
          CategoryTag,
          Comment,
          AiRequest,
          SiteSettings,
          ChatMessage,
          Contact,
          Subscriber,
        ],
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true),
        logging: configService.get<boolean>('DB_LOGGING', false),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    BlogModule,
    AiModule,
    UsersModule,
    MediaModule,
    TaxonomyModule,
    CommentsModule,
    SettingsModule,
    ChatbotModule,
    EmailModule,
    ContactModule,
    NewsletterModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
