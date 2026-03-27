import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxonomyController } from './taxonomy.controller';
import { TaxonomyService } from './taxonomy.service';
import { TaxonomySeederService } from './taxonomy-seeder.service';
import { Category } from './entities/category.entity';
import { Tag } from './entities/tag.entity';
import { BlogPost } from '../blog/entities/blog-post.entity';
import { BlogCategory } from './entities/blog-category.entity';
import { CategoryTag } from './entities/category-tag.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Tag, BlogPost, BlogCategory, CategoryTag, User])],
  controllers: [TaxonomyController],
  providers: [TaxonomyService, TaxonomySeederService],
  exports: [TaxonomyService],
})
export class TaxonomyModule {}

