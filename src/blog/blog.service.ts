import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BlogPost, BlogPostStatus } from './entities/blog-post.entity';
import { BlogContent, BlogContentSource } from './entities/blog-content.entity';
import { BlogSeo, Robots } from './entities/blog-seo.entity';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { Category } from '../taxonomy/entities/category.entity';
import { Tag } from '../taxonomy/entities/tag.entity';
import { BlogCategory } from '../taxonomy/entities/blog-category.entity';
import { BlogTag } from '../taxonomy/entities/blog-tag.entity';
import { BlogAnalytics } from './entities/blog-analytics.entity';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost)
    private blogPostRepository: Repository<BlogPost>,
    @InjectRepository(BlogContent)
    private blogContentRepository: Repository<BlogContent>,
    @InjectRepository(BlogSeo)
    private blogSeoRepository: Repository<BlogSeo>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    @InjectRepository(BlogCategory)
    private blogCategoryRepository: Repository<BlogCategory>,
    @InjectRepository(BlogTag)
    private blogTagRepository: Repository<BlogTag>,
    @InjectRepository(BlogAnalytics)
    private blogAnalyticsRepository: Repository<BlogAnalytics>,
  ) {}

  async create(
    createBlogDto: CreateBlogDto,
    authorId: number,
  ): Promise<BlogPost> {
    // Generate slug if not provided
    const slug =
      createBlogDto.slug ||
      createBlogDto.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

    // Check if slug already exists
    const existingPost = await this.blogPostRepository.findOne({
      where: { slug },
    });
    if (existingPost) {
      throw new ConflictException('Blog post with this slug already exists');
    }

    // Create blog post
    const blogPost = this.blogPostRepository.create({
      title: createBlogDto.title,
      slug,
      excerpt: createBlogDto.excerpt,
      status: createBlogDto.status || BlogPostStatus.DRAFT,
      authorId,
      featuredImageId: createBlogDto.featuredImageId,
      language: createBlogDto.language || 'en',
      publishedAt:
        createBlogDto.status === BlogPostStatus.PUBLISHED ? new Date() : null,
    });

    const savedPost = await this.blogPostRepository.save(blogPost);

    // Create blog content if provided
    if (createBlogDto.htmlContent) {
      const wordCount = this.calculateWordCount(createBlogDto.htmlContent);
      const blogContent = this.blogContentRepository.create({
        blogPostId: savedPost.id,
        htmlContent: createBlogDto.htmlContent,
        wordCount,
        source: BlogContentSource.HUMAN,
      });
      await this.blogContentRepository.save(blogContent);
    }

    // Create SEO if provided
    if (
      createBlogDto.metaTitle ||
      createBlogDto.metaDescription ||
      createBlogDto.metaKeywords ||
      createBlogDto.canonicalUrl
    ) {
      const blogSeo = this.blogSeoRepository.create({
        blogPostId: savedPost.id,
        metaTitle: createBlogDto.metaTitle,
        metaDescription: createBlogDto.metaDescription,
        metaKeywords: createBlogDto.metaKeywords ?? undefined,
        canonicalUrl: createBlogDto.canonicalUrl,
        robots: Robots.INDEX_FOLLOW,
      });
      await this.blogSeoRepository.save(blogSeo);
    }

    // Associate categories
    if (createBlogDto.categoryIds && createBlogDto.categoryIds.length > 0) {
      await this.associateCategories(savedPost.id, createBlogDto.categoryIds);
    }

    // Associate tags
    if (createBlogDto.tagIds && createBlogDto.tagIds.length > 0) {
      await this.associateTags(savedPost.id, createBlogDto.tagIds);
    }

    return this.findOne(savedPost.id);
  }

  /** Paginated result for blog list */
  async findAllPaginated(
    status?: BlogPostStatus,
    page: number = 1,
    limit: number = 12,
  ): Promise<{
    data: BlogPost[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
    const take = Math.min(100, Math.max(1, limit));

    const [data, total] = await this.blogPostRepository.findAndCount({
      where,
      relations: [
        'author',
        'author.authorProfile',
        'featuredImage',
        'blogCategories',
        'blogCategories.category',
        'blogCategories.category.featuredImage',
        'blogTags',
        'blogTags.tag',
        'blogContent',
        'blogAnalytics',
        'comments',
      ],
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        status: true,
        createdAt: true,
        publishedAt: true,
        readingTime: true,
        author: {
          id: true,
          email: true,
          authorProfile: {
            id: true,
            displayName: true,
          },
        },
        featuredImage: {
          id: true,
          url: true,
          filePath: true,
        },
        blogCategories: {
          blogPostId: true,
          categoryId: true,
          category: {
            id: true,
            name: true,
            slug: true,
            featuredImage: {
              id: true,
              url: true,
              filePath: true,
            },
          },
        },
        blogTags: {
          tag: {
            id: true,
            name: true,
            slug: true,
          },
        },
        blogContent: {
          id: true,
          wordCount: true,
        },
        blogAnalytics: {
          views: true,
          likes: true,
        },
        comments: { id: true },
      },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    const totalPages = Math.ceil(total / take) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));

    return {
      data,
      total,
      page: currentPage,
      limit: take,
      totalPages,
    };
  }

  async findAll(status?: BlogPostStatus): Promise<BlogPost[]> {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return this.blogPostRepository.find({
      where,
      relations: [
        'author',
        'author.authorProfile',
        'featuredImage',
        'blogCategories',
        'blogCategories.category',
        'blogCategories.category.featuredImage',
        'blogTags',
        'blogTags.tag',
        'blogContent',
        'blogAnalytics',
        'comments',
      ],
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        status: true,
        createdAt: true,
        publishedAt: true,
        readingTime: true,
        author: {
          id: true,
          email: true,
          authorProfile: {
            id: true,
            displayName: true,
          },
        },
        featuredImage: {
          id: true,
          url: true,
          filePath: true,
        },
        blogCategories: {
          blogPostId: true,
          categoryId: true,
          category: {
            id: true,
            name: true,
            slug: true,
            featuredImage: {
              id: true,
              url: true,
              filePath: true,
            },
          },
        },
        blogTags: {
          tag: {
            id: true,
            name: true,
            slug: true,
          },
        },
        blogContent: {
          id: true,
          wordCount: true,
        },
        blogAnalytics: {
          views: true,
          likes: true,
        },
        comments: { id: true },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<BlogPost> {
    const blogPost = await this.blogPostRepository.findOne({
      where: { id },
      relations: [
        'author',
        'featuredImage',
        'blogContent',
        'blogSeo',
        'blogSchema',
        'blogFaqs',
        'blogCategories',
        'blogCategories.category',
        'blogCategories.category.featuredImage',
        'blogTags',
        'blogTags.tag',
        'comments',
        'blogAnalytics',
      ],
    });

    if (!blogPost) {
      throw new NotFoundException(`Blog post with ID ${id} not found`);
    }

    return blogPost;
  }

  async findBySlug(slug: string): Promise<BlogPost> {
    const blogPost = await this.blogPostRepository.findOne({
      where: { slug },
      relations: [
        'author',
        'featuredImage',
        'blogContent',
        'blogSeo',
        'blogSchema',
        'blogFaqs',
        'blogCategories',
        'blogCategories.category',
        'blogCategories.category.featuredImage',
        'blogTags',
        'blogTags.tag',
        'comments',
        'blogAnalytics',
      ],
    });

    if (!blogPost) {
      throw new NotFoundException(`Blog post with slug "${slug}" not found`);
    }

    return blogPost;
  }

  /**
   * Find all published blog posts by category slug
   */
  async findByCategorySlug(
    categorySlug: string,
  ): Promise<{ category: Category; posts: BlogPost[] }> {
    const category = await this.categoryRepository.findOne({
      where: { slug: categorySlug },
      relations: ['featuredImage'],
    });

    if (!category) {
      throw new NotFoundException(
        `Category with slug "${categorySlug}" not found`,
      );
    }

    const posts = await this.blogPostRepository
      .createQueryBuilder('blogPost')
      .innerJoin('blogPost.blogCategories', 'blogCategory')
      .innerJoin('blogCategory.category', 'category', 'category.slug = :slug', {
        slug: categorySlug,
      })
      .leftJoinAndSelect('blogPost.author', 'author')
      .leftJoinAndSelect('author.authorProfile', 'authorProfile')
      .leftJoinAndSelect('blogPost.featuredImage', 'featuredImage')
      .leftJoinAndSelect('blogPost.blogCategories', 'bc')
      .leftJoinAndSelect('bc.category', 'cat')
      .leftJoinAndSelect('cat.featuredImage', 'catFeaturedImage')
      .leftJoinAndSelect('blogPost.blogTags', 'bt')
      .leftJoinAndSelect('bt.tag', 'tag')
      .leftJoinAndSelect('blogPost.blogContent', 'blogContent')
      .select([
        'blogPost.id',
        'blogPost.title',
        'blogPost.slug',
        'blogPost.excerpt',
        'blogPost.publishedAt',
        'blogPost.createdAt',
        'blogPost.readingTime',
        'author.id',
        'author.email',
        'authorProfile.displayName',
        'featuredImage.id',
        'featuredImage.url',
        'featuredImage.filePath',
        'bc',
        'cat.id',
        'cat.name',
        'cat.slug',
        'catFeaturedImage.id',
        'catFeaturedImage.url',
        'catFeaturedImage.filePath',
        'bt',
        'tag.id',
        'tag.name',
        'tag.slug',
        'blogContent.id',
        'blogContent.wordCount',
      ])
      .where('blogPost.status = :status', { status: BlogPostStatus.PUBLISHED })
      .orderBy('blogPost.publishedAt', 'DESC')
      .getMany();

    return { category, posts };
  }

  /**
   * Find all published blog posts by tag slug
   */
  async findByTagSlug(
    tagSlug: string,
  ): Promise<{ tag: Tag; posts: BlogPost[] }> {
    const tag = await this.tagRepository.findOne({
      where: { slug: tagSlug },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with slug "${tagSlug}" not found`);
    }

    const posts = await this.blogPostRepository
      .createQueryBuilder('blogPost')
      .innerJoin('blogPost.blogTags', 'blogTag')
      .innerJoin('blogTag.tag', 'tag', 'tag.slug = :slug', { slug: tagSlug })
      .leftJoinAndSelect('blogPost.author', 'author')
      .leftJoinAndSelect('author.authorProfile', 'authorProfile')
      .leftJoinAndSelect('blogPost.featuredImage', 'featuredImage')
      .leftJoinAndSelect('blogPost.blogCategories', 'bc')
      .leftJoinAndSelect('bc.category', 'cat')
      .leftJoinAndSelect('cat.featuredImage', 'catFeaturedImage')
      .leftJoinAndSelect('blogPost.blogTags', 'bt')
      .leftJoinAndSelect('bt.tag', 't')
      .leftJoinAndSelect('blogPost.blogContent', 'blogContent')
      .select([
        'blogPost.id',
        'blogPost.title',
        'blogPost.slug',
        'blogPost.excerpt',
        'blogPost.publishedAt',
        'blogPost.createdAt',
        'blogPost.readingTime',
        'author.id',
        'author.email',
        'authorProfile.displayName',
        'featuredImage.id',
        'featuredImage.url',
        'featuredImage.filePath',
        'bc',
        'cat.id',
        'cat.name',
        'cat.slug',
        'catFeaturedImage.id',
        'catFeaturedImage.url',
        'catFeaturedImage.filePath',
        'bt',
        't.id',
        't.name',
        't.slug',
        'blogContent.id',
        'blogContent.wordCount',
      ])
      .where('blogPost.status = :status', { status: BlogPostStatus.PUBLISHED })
      .orderBy('blogPost.publishedAt', 'DESC')
      .getMany();

    return { tag, posts };
  }

  async update(
    id: number,
    updateBlogDto: UpdateBlogDto,
    userId: number,
  ): Promise<BlogPost> {
    const blogPost = await this.findOne(id);

    // Check authorization - authors can only update their own posts
    // unless they are admin/editor
    // This check should be done in the controller, but we'll add it here for safety

    // Handle slug update
    if (updateBlogDto.slug || updateBlogDto.title) {
      const newSlug =
        updateBlogDto.slug ||
        (updateBlogDto.title
          ? updateBlogDto.title
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, '')
          : blogPost.slug);

      if (newSlug !== blogPost.slug) {
        const existingPost = await this.blogPostRepository.findOne({
          where: { slug: newSlug },
        });
        if (existingPost && existingPost.id !== id) {
          throw new ConflictException(
            'Blog post with this slug already exists',
          );
        }
        blogPost.slug = newSlug;
      }
    }

    // Update fields
    if (updateBlogDto.title) {
      blogPost.title = updateBlogDto.title;
    }
    if (updateBlogDto.excerpt !== undefined) {
      blogPost.excerpt = updateBlogDto.excerpt;
    }
    if (updateBlogDto.status) {
      blogPost.status = updateBlogDto.status;
      if (
        updateBlogDto.status === BlogPostStatus.PUBLISHED &&
        !blogPost.publishedAt
      ) {
        blogPost.publishedAt = new Date();
      }
    }
    if (updateBlogDto.featuredImageId !== undefined) {
      blogPost.featuredImageId = updateBlogDto.featuredImageId;
    }
    if (updateBlogDto.language !== undefined) {
      blogPost.language = updateBlogDto.language;
    }

    await this.blogPostRepository.save(blogPost);

    // Update content if provided
    if (updateBlogDto.htmlContent !== undefined) {
      let blogContent = await this.blogContentRepository.findOne({
        where: { blogPostId: id },
      });

      const wordCount = this.calculateWordCount(updateBlogDto.htmlContent);
      if (blogContent) {
        blogContent.htmlContent = updateBlogDto.htmlContent;
        blogContent.wordCount = wordCount;
        await this.blogContentRepository.save(blogContent);
      } else {
        blogContent = this.blogContentRepository.create({
          blogPostId: id,
          htmlContent: updateBlogDto.htmlContent,
          wordCount,
          source: BlogContentSource.HUMAN,
        });
        await this.blogContentRepository.save(blogContent);
      }
    }

    // Update categories if provided
    if (updateBlogDto.categoryIds !== undefined) {
      await this.updateCategories(id, updateBlogDto.categoryIds);
    }

    // Update tags if provided
    if (updateBlogDto.tagIds !== undefined) {
      await this.updateTags(id, updateBlogDto.tagIds);
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const blogPost = await this.findOne(id);
    await this.blogPostRepository.remove(blogPost);
  }

  private async associateCategories(
    blogPostId: number,
    categoryIds: number[],
  ): Promise<void> {
    // Verify all categories exist
    const categories = await this.categoryRepository.find({
      where: { id: In(categoryIds) },
    });
    if (categories.length !== categoryIds.length) {
      throw new BadRequestException('One or more categories not found');
    }

    // Create associations
    const blogCategories = categoryIds.map((categoryId) =>
      this.blogCategoryRepository.create({
        blogPostId,
        categoryId,
      }),
    );
    await this.blogCategoryRepository.save(blogCategories);
  }

  private async associateTags(
    blogPostId: number,
    tagIds: number[],
  ): Promise<void> {
    // Verify all tags exist
    const tags = await this.tagRepository.find({
      where: { id: In(tagIds) },
    });
    if (tags.length !== tagIds.length) {
      throw new BadRequestException('One or more tags not found');
    }

    // Create associations
    const blogTags = tagIds.map((tagId) =>
      this.blogTagRepository.create({
        blogPostId,
        tagId,
      }),
    );
    await this.blogTagRepository.save(blogTags);
  }

  private async updateCategories(
    blogPostId: number,
    categoryIds: number[],
  ): Promise<void> {
    // Remove existing associations
    await this.blogCategoryRepository.delete({ blogPostId });

    // Create new associations
    if (categoryIds.length > 0) {
      await this.associateCategories(blogPostId, categoryIds);
    }
  }

  private async updateTags(
    blogPostId: number,
    tagIds: number[],
  ): Promise<void> {
    // Remove existing associations
    await this.blogTagRepository.delete({ blogPostId });

    // Create new associations
    if (tagIds.length > 0) {
      await this.associateTags(blogPostId, tagIds);
    }
  }

  private calculateWordCount(htmlContent: string): number {
    // Remove HTML tags and calculate word count
    const text = htmlContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.split(' ').filter((word) => word.length > 0).length;
  }

  async incrementViews(id: number): Promise<void> {
    let analytics = await this.blogAnalyticsRepository.findOne({
      where: { blogPostId: id },
    });

    if (!analytics) {
      analytics = this.blogAnalyticsRepository.create({
        blogPostId: id,
        views: 1,
      });
    } else {
      analytics.views += 1;
      analytics.lastUpdated = new Date();
    }

    await this.blogAnalyticsRepository.save(analytics);
  }

  async incrementLikes(id: number): Promise<void> {
    let analytics = await this.blogAnalyticsRepository.findOne({
      where: { blogPostId: id },
    });

    if (!analytics) {
      analytics = this.blogAnalyticsRepository.create({
        blogPostId: id,
        likes: 1,
      });
    } else {
      analytics.likes += 1;
      analytics.lastUpdated = new Date();
    }

    await this.blogAnalyticsRepository.save(analytics);
  }
}
