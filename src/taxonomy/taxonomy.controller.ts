import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { TaxonomyService } from './taxonomy.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { Category } from './entities/category.entity';
import { Tag } from './entities/tag.entity';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Taxonomy')
@ApiBearerAuth('JWT-auth')
@Controller('taxonomy')
@UseGuards(RolesGuard)
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  // Category endpoints
  @Post('categories')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new category',
    description: 'Creates a new category. Slug will be auto-generated from name if not provided.',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: Category,
  })
  @ApiBadRequestResponse({ description: 'Bad request - validation failed' })
  @ApiConflictResponse({ description: 'Category with this slug already exists' })
  @ApiNotFoundResponse({ description: 'Parent category not found' })
  async createCategory(@Body() createCategoryDto: CreateCategoryDto): Promise<Category> {
    return this.taxonomyService.createCategory(createCategoryDto);
  }

  @Get('categories')
  @Public()
  @ApiOperation({
    summary: 'Get all categories',
    description: 'Returns a list of all categories with their parent and children relationships',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all categories',
    type: [Category],
  })
  async findAllCategories(): Promise<Category[]> {
    return this.taxonomyService.findAllCategories();
  }

  @Get('categories/:id')
  @Public()
  @ApiOperation({
    summary: 'Get a category by ID',
    description: 'Returns a single category by its ID',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category found',
    type: Category,
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async findCategoryById(@Param('id', ParseIntPipe) id: number): Promise<Category> {
    return this.taxonomyService.findCategoryById(id);
  }

  @Get('categories/slug/:slug')
  @Public()
  @ApiOperation({
    summary: 'Get a category by slug',
    description: 'Returns a single category by its slug',
  })
  @ApiParam({ name: 'slug', type: String, description: 'Category slug' })
  @ApiResponse({
    status: 200,
    description: 'Category found',
    type: Category,
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async findCategoryBySlug(@Param('slug') slug: string): Promise<Category> {
    return this.taxonomyService.findCategoryBySlug(slug);
  }

  @Patch('categories/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({
    summary: 'Update a category',
    description: 'Updates an existing category',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Category ID' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    type: Category,
  })
  @ApiBadRequestResponse({
    description: 'Bad request - validation failed or category cannot be its own parent',
  })
  @ApiNotFoundResponse({ description: 'Category or parent category not found' })
  @ApiConflictResponse({ description: 'Category with this slug already exists' })
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.taxonomyService.updateCategory(id, updateCategoryDto);
  }

  @Delete('categories/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a category',
    description: 'Deletes a category. Cannot delete categories with child categories.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Category ID' })
  @ApiResponse({
    status: 204,
    description: 'Category deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({
    description: 'Cannot delete category with child categories',
  })
  async removeCategory(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.taxonomyService.removeCategory(id);
  }

  // Tag endpoints
  @Post('tags')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new tag',
    description: 'Creates a new tag. Slug will be auto-generated from name if not provided.',
  })
  @ApiBody({ type: CreateTagDto })
  @ApiResponse({
    status: 201,
    description: 'Tag created successfully',
    type: Tag,
  })
  @ApiBadRequestResponse({ description: 'Bad request - validation failed' })
  @ApiConflictResponse({ description: 'Tag with this slug already exists' })
  async createTag(@Body() createTagDto: CreateTagDto): Promise<Tag> {
    return this.taxonomyService.createTag(createTagDto);
  }

  @Get('tags')
  @Public()
  @ApiOperation({
    summary: 'Get all tags',
    description: 'Returns a list of all tags',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all tags',
    type: [Tag],
  })
  async findAllTags(): Promise<Tag[]> {
    return this.taxonomyService.findAllTags();
  }

  @Get('tags/:id')
  @Public()
  @ApiOperation({
    summary: 'Get a tag by ID',
    description: 'Returns a single tag by its ID',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Tag ID' })
  @ApiResponse({
    status: 200,
    description: 'Tag found',
    type: Tag,
  })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  async findTagById(@Param('id', ParseIntPipe) id: number): Promise<Tag> {
    return this.taxonomyService.findTagById(id);
  }

  @Get('tags/slug/:slug')
  @Public()
  @ApiOperation({
    summary: 'Get a tag by slug',
    description: 'Returns a single tag by its slug',
  })
  @ApiParam({ name: 'slug', type: String, description: 'Tag slug' })
  @ApiResponse({
    status: 200,
    description: 'Tag found',
    type: Tag,
  })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  async findTagBySlug(@Param('slug') slug: string): Promise<Tag> {
    return this.taxonomyService.findTagBySlug(slug);
  }

  @Patch('tags/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({
    summary: 'Update a tag',
    description: 'Updates an existing tag',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Tag ID' })
  @ApiBody({ type: UpdateTagDto })
  @ApiResponse({
    status: 200,
    description: 'Tag updated successfully',
    type: Tag,
  })
  @ApiBadRequestResponse({ description: 'Bad request - validation failed' })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  @ApiConflictResponse({ description: 'Tag with this slug already exists' })
  async updateTag(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTagDto: UpdateTagDto,
  ): Promise<Tag> {
    return this.taxonomyService.updateTag(id, updateTagDto);
  }

  @Delete('tags/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a tag',
    description: 'Deletes a tag',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Tag ID' })
  @ApiResponse({
    status: 204,
    description: 'Tag deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  async removeTag(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.taxonomyService.removeTag(id);
  }

  @Get('navigation')
  @Public()
  @ApiOperation({
    summary: 'Get categories with blogs for navigation',
    description: 'Returns categories with their published blogs (name, slug) for navigation menu',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories with blogs for navigation',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          slug: { type: 'string' },
          blogs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                slug: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  async getNavigationData() {
    return this.taxonomyService.getCategoriesForNavigation();
  }
}

