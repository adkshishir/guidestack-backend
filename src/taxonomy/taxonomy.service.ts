import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Category } from './entities/category.entity';
import { Tag } from './entities/tag.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { BlogPost, BlogPostStatus } from '../blog/entities/blog-post.entity';
import { BlogCategory } from './entities/blog-category.entity';
import { CategoryTag } from './entities/category-tag.entity';

@Injectable()
export class TaxonomyService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    @InjectRepository(BlogPost)
    private blogPostRepository: Repository<BlogPost>,
    @InjectRepository(BlogCategory)
    private blogCategoryRepository: Repository<BlogCategory>,
    @InjectRepository(CategoryTag)
    private categoryTagRepository: Repository<CategoryTag>,
  ) {}

  // Category methods
  async createCategory(
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    // Generate slug if not provided
    const slug =
      createCategoryDto.slug ||
      createCategoryDto.name.toLowerCase().replace(/\s+/g, '-');

    // Check if slug already exists
    const existingCategory = await this.categoryRepository.findOne({
      where: { slug },
    });
    if (existingCategory) {
      throw new ConflictException('Category with this slug already exists');
    }

    // Validate parent if provided
    if (createCategoryDto.parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: createCategoryDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      slug,
    });

    const saved = await this.categoryRepository.save(category);
    return this.findCategoryById(saved.id);
  }

  async findAllCategories(): Promise<Category[]> {
    return this.categoryRepository.find({
      relations: ['parent', 'children', 'featuredImage'],
      // order: { name: 'ASC' },
      order: { createdAt: 'DESC' },
    });
  }

  async findCategoryById(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children', 'blogCategories', 'featuredImage'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async findCategoryBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { slug },
      relations: ['parent', 'children', 'blogCategories', 'featuredImage'],
    });

    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    return category;
  }

  async updateCategory(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findCategoryById(id);

    // 1. Handle Slug/Name Updates (Existing Logic)
    if (updateCategoryDto.slug || updateCategoryDto.name) {
      const newSlug =
        updateCategoryDto.slug ||
        (updateCategoryDto.name
          ? updateCategoryDto.name.toLowerCase().replace(/\s+/g, '-')
          : category.slug);

      if (newSlug !== category.slug) {
        const existing = await this.categoryRepository.findOne({
          where: { slug: newSlug },
        });
        if (existing && existing.id !== id)
          throw new ConflictException('Slug already exists');
        category.slug = newSlug;
      }
      if (updateCategoryDto.name) category.name = updateCategoryDto.name;
    }

    // 2. Optimized Parent Relation Logic
    // Check if parentId was actually sent in the request object
    if ('parentId' in updateCategoryDto) {
      const { parentId } = updateCategoryDto;

      if (parentId === null || parentId === undefined) {
        // Explicitly remove the relationship
        category.parentId = null;
        category.parent = null;
      } else {
        // Validate and update to new parent
        if (parentId === id)
          throw new BadRequestException('Self-referencing not allowed');

        const parent = await this.categoryRepository.findOne({
          where: { id: parentId },
        });
        if (!parent) throw new NotFoundException('Parent category not found');

        category.parentId = parentId;
      }
    }

    if (updateCategoryDto.description !== undefined) {
      category.description = updateCategoryDto.description;
    }

    if ('featuredImageId' in updateCategoryDto) {
      category.featuredImageId = updateCategoryDto.featuredImageId ?? null;
      // Clear the loaded relation so it's fresh when saved/reloaded
      category.featuredImage = null;
    }

    await this.categoryRepository.save(category);
    return this.findCategoryById(id);
  }

  async removeCategory(id: number): Promise<void> {
    const category = await this.findCategoryById(id);

    // Check if category has children
    const children = await this.categoryRepository.find({
      where: { parentId: id },
    });
    if (children.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with child categories',
      );
    }

    await this.categoryRepository.remove(category);
  }

  // Tag methods
  async createTag(createTagDto: CreateTagDto): Promise<Tag> {
    // Generate slug if not provided
    const slug =
      createTagDto.slug || createTagDto.name.toLowerCase().replace(/\s+/g, '-');

    // Check if slug already exists
    const existingTag = await this.tagRepository.findOne({
      where: { slug },
    });
    if (existingTag) {
      throw new ConflictException('Tag with this slug already exists');
    }

    const tag = this.tagRepository.create({
      name: createTagDto.name,
      slug,
      description: createTagDto.description,
    });

    const savedTag = await this.tagRepository.save(tag);

    // Associate categories if provided
    if (createTagDto.categoryIds && createTagDto.categoryIds.length > 0) {
      await this.associateTagWithCategories(
        savedTag.id,
        createTagDto.categoryIds,
      );
    }

    return this.findTagById(savedTag.id);
  }

  async findAllTags(): Promise<Tag[]> {
    return this.tagRepository.find({
      // order: { name: 'ASC' },
      order: { createdAt: 'DESC' },
    });
  }

  async findTagById(id: number): Promise<Tag> {
    const tag = await this.tagRepository.findOne({
      where: { id },
      relations: ['blogTags', 'categoryTags', 'categoryTags.category'],
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    return tag;
  }

  async findTagBySlug(slug: string): Promise<Tag> {
    const tag = await this.tagRepository.findOne({
      where: { slug },
      relations: ['blogTags'],
    });

    if (!tag) {
      throw new NotFoundException(`Tag with slug "${slug}" not found`);
    }

    return tag;
  }

  async updateTag(id: number, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findTagById(id);

    // Handle slug update
    if (updateTagDto.slug || updateTagDto.name) {
      const newSlug =
        updateTagDto.slug ||
        (updateTagDto.name
          ? updateTagDto.name.toLowerCase().replace(/\s+/g, '-')
          : tag.slug);

      if (newSlug !== tag.slug) {
        const existingTag = await this.tagRepository.findOne({
          where: { slug: newSlug },
        });
        if (existingTag && existingTag.id !== id) {
          throw new ConflictException('Tag with this slug already exists');
        }
        tag.slug = newSlug;
      }
    }

    // Update name if provided
    if (updateTagDto.name) {
      tag.name = updateTagDto.name;
    }

    // Update description if provided
    if (updateTagDto.description !== undefined) {
      tag.description = updateTagDto.description;
    }

    await this.tagRepository.save(tag);

    // Update category associations if provided
    if (updateTagDto.categoryIds !== undefined) {
      await this.updateTagCategories(id, updateTagDto.categoryIds || []);
    }

    return this.findTagById(id);
  }

  async removeTag(id: number): Promise<void> {
    const tag = await this.findTagById(id);
    await this.tagRepository.remove(tag);
  }

  /**
   * Associate tag with categories
   */
  private async associateTagWithCategories(
    tagId: number,
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
    const categoryTags = categoryIds.map((categoryId) =>
      this.categoryTagRepository.create({
        tagId,
        categoryId,
      }),
    );
    await this.categoryTagRepository.save(categoryTags);
  }

  /**
   * Update tag category associations
   */
  private async updateTagCategories(
    tagId: number,
    categoryIds: number[],
  ): Promise<void> {
    // Remove existing associations
    await this.categoryTagRepository.delete({ tagId });

    // Create new associations
    if (categoryIds.length > 0) {
      await this.associateTagWithCategories(tagId, categoryIds);
    }
  }

  /**
   * Get categories with their published blogs for navigation
   * Returns hierarchical structure with parent/child relationships
   * Optimized to use database-level queries and filtering
   *
   * Format: category -> child-category -> blogs
   * Only top-level categories (without parent) are returned
   */
  async getCategoriesForNavigation(): Promise<NavigationCategory[]> {
    // Query only top-level categories with their children and published blogs
    // This uses a single query with LEFT JOINs and subquery filtering
    const categories = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.children', 'child')
      .leftJoinAndSelect('child.blogCategories', 'blogCategory')
      .leftJoinAndSelect('blogCategory.blogPost', 'blogPost')
      .where('category.parentId IS NULL')
      .orderBy('category.createdAt', 'DESC')
      .addOrderBy('child.createdAt', 'DESC')
      .getMany();

    // Transform the result to the NavigationCategory format
    // Blogs are associated with child categories
    const result: NavigationCategory[] = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId || undefined,
      blogs: [], // Blogs are at child category level, not top-level
      children: (category.children || []).map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        parentId: child.parentId || undefined,
        blogs:
          child.blogCategories
            ?.filter((bc) => bc.blogPost?.status === BlogPostStatus.PUBLISHED)
            .map((bc) => ({
              name: bc.blogPost!.title,
              slug: bc.blogPost!.slug,
            })) || [],
        children: [],
      })),
    }));

    return result;
  }
}

export interface NavigationCategory {
  id: number;
  name: string;
  slug: string;
  parentId?: number;
  blogs: Array<{ name: string; slug: string }>;
  children: NavigationCategory[];
}
