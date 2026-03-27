import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ImageGenerationController } from './image-generation.controller';
import { ImageGenerationService } from './image-generation.service';
import { MediaUploadController } from './media-upload.controller';
import { MediaUploadService } from './media-upload.service';
import { Media } from './entities/media.entity';
import { BlogPost } from '../blog/entities/blog-post.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Media, BlogPost]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public', 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [ImageGenerationController, MediaUploadController],
  providers: [ImageGenerationService, MediaUploadService],
  exports: [ImageGenerationService, MediaUploadService],
})
export class MediaModule {}
