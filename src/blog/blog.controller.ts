import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { BlogService } from './blog.service';
import { BlogSchedulerService } from './blog-scheduler.service';
import { BlogTaskService } from './blog-task.service';
import { IntelligentBlogGenerationService } from './intelligent-blog-generation.service';
import { CreateBlogTaskDto } from './dto/create-blog-task.dto';
import { UpdateBlogTaskDto } from './dto/update-blog-task.dto';
import { BlogTask } from './entities/blog-task.entity';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { GenerateBlogDto } from './dto/generate-blog.dto';
import { BlogPost, BlogPostStatus } from './entities/blog-post.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Blog')
@ApiBearerAuth('JWT-auth')
@Controller('blog')
@UseGuards(RolesGuard)
export class BlogController {
  constructor(
    private readonly blogService: BlogService,
    private readonly blogSchedulerService: BlogSchedulerService,
    private readonly blogTaskService: BlogTaskService,
    private readonly intelligentBlogGenerationService: IntelligentBlogGenerationService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new blog post',
    description:
      'Creates a new blog post with content, SEO, categories, and tags. Slug will be auto-generated from title if not provided.',
  })
  @ApiBody({ type: CreateBlogDto })
  @ApiResponse({
    status: 201,
    description: 'Blog post created successfully',
    type: BlogPost,
  })
  @ApiBadRequestResponse({ description: 'Bad request - validation failed' })
  @ApiConflictResponse({
    description: 'Blog post with this slug already exists',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(
    @Body() createBlogDto: CreateBlogDto,
    @CurrentUser() user: User,
  ): Promise<BlogPost> {
    return this.blogService.create(createBlogDto, user.id);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get blog posts (paginated)',
    description:
      'Returns a paginated list of blog posts. Can be filtered by status. Use page and limit for pagination.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: BlogPostStatus,
    description: 'Filter by blog post status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 12, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of blog posts',
  })
  async findAll(
    @Query('status') status?: BlogPostStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    data: BlogPost[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const hasPagination = page !== undefined || limit !== undefined;
    if (hasPagination) {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 12;
      return this.blogService.findAllPaginated(
        status,
        isNaN(pageNum) ? 1 : pageNum,
        isNaN(limitNum) ? 12 : limitNum,
      );
    }
    const data = await this.blogService.findAll(status);
    return {
      data,
      total: data.length,
      page: 1,
      limit: data.length,
      totalPages: 1,
    };
  }

  // Blog Task endpoints - MUST be before @Get(':id') to avoid route conflicts
  @Get('tasks')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  @ApiOperation({
    summary: 'Get all blog tasks',
    description:
      'Returns a list of all blog tasks. Can be filtered to show only active tasks.',
  })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Filter to show only active tasks',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all blog tasks',
    type: [BlogTask],
  })
  async findAllTasks(
    @Query('activeOnly') activeOnly?: boolean,
  ): Promise<BlogTask[]> {
    return this.blogTaskService.findAll(activeOnly === true);
  }

  @Get('tasks/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  @ApiOperation({
    summary: 'Get a blog task by ID',
    description: 'Returns a single blog task by its ID',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Blog task ID' })
  @ApiResponse({
    status: 200,
    description: 'Blog task found',
    type: BlogTask,
  })
  @ApiNotFoundResponse({ description: 'Blog task not found' })
  async findTaskById(@Param('id', ParseIntPipe) id: number): Promise<BlogTask> {
    return this.blogTaskService.findOne(id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get a blog post by ID',
    description: 'Returns a single blog post by its ID with all related data',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Blog post ID' })
  @ApiResponse({
    status: 200,
    description: 'Blog post found',
    type: BlogPost,
  })
  @ApiNotFoundResponse({ description: 'Blog post not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<BlogPost> {
    return this.blogService.findOne(id);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({
    summary: 'Get a blog post by slug',
    description: 'Returns a single blog post by its slug with all related data',
  })
  @ApiParam({ name: 'slug', type: String, description: 'Blog post slug' })
  @ApiResponse({
    status: 200,
    description: 'Blog post found',
    type: BlogPost,
  })
  @ApiNotFoundResponse({ description: 'Blog post not found' })
  async findBySlug(@Param('slug') slug: string): Promise<BlogPost> {
    return this.blogService.findBySlug(slug);
  }

  @Get('category/:slug')
  @Public()
  @ApiOperation({
    summary: 'Get all published blog posts by category slug',
    description:
      'Returns all published blog posts that belong to a specific category',
  })
  @ApiParam({ name: 'slug', type: String, description: 'Category slug' })
  @ApiResponse({
    status: 200,
    description: 'List of blog posts in the category',
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async findByCategorySlug(@Param('slug') slug: string) {
    return this.blogService.findByCategorySlug(slug);
  }

  @Get('tag/:slug')
  @Public()
  @ApiOperation({
    summary: 'Get all published blog posts by tag slug',
    description: 'Returns all published blog posts that have a specific tag',
  })
  @ApiParam({ name: 'slug', type: String, description: 'Tag slug' })
  @ApiResponse({
    status: 200,
    description: 'List of blog posts with the tag',
  })
  @ApiNotFoundResponse({ description: 'Tag not found' })
  async findByTagSlug(@Param('slug') slug: string) {
    return this.blogService.findByTagSlug(slug);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  @ApiOperation({
    summary: 'Update a blog post',
    description:
      'Updates an existing blog post. Authors can only update their own posts unless they are admin/editor.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Blog post ID' })
  @ApiBody({ type: UpdateBlogDto })
  @ApiResponse({
    status: 200,
    description: 'Blog post updated successfully',
    type: BlogPost,
  })
  @ApiBadRequestResponse({ description: 'Bad request - validation failed' })
  @ApiNotFoundResponse({ description: 'Blog post not found' })
  @ApiConflictResponse({
    description: 'Blog post with this slug already exists',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBlogDto: UpdateBlogDto,
    @CurrentUser() user: User,
  ): Promise<BlogPost> {
    return this.blogService.update(id, updateBlogDto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a blog post',
    description:
      'Permanently deletes a blog post. Admin and Editor roles only.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Blog post ID' })
  @ApiResponse({
    status: 204,
    description: 'Blog post deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'Blog post not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Insufficient permissions' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.blogService.remove(+id);
  }

  @Post(':id/view')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Increment blog post view count' })
  @ApiParam({ name: 'id', type: Number })
  async incrementView(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.blogService.incrementViews(id);
  }

  @Post(':id/like')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Increment blog post like count' })
  @ApiParam({ name: 'id', type: Number })
  async incrementLike(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.blogService.incrementLikes(id);
  }

  @Post('generate')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Manually trigger blog generation',
    description:
      'Manually triggers AI-powered blog generation. The blog will be automatically created and published.',
  })
  @ApiBody({ type: GenerateBlogDto })
  @ApiResponse({
    status: 201,
    description: 'Blog generated successfully',
    type: BlogPost,
  })
  @ApiBadRequestResponse({
    description: 'Bad request - blog generation failed',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin or Editor role required',
  })
  async generateBlog(
    @Body() generateBlogDto: GenerateBlogDto,
  ): Promise<BlogPost> {
    return this.blogSchedulerService.generateBlogManually(
      generateBlogDto.topic,
    );
  }

  @Post('auto-generate')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Auto-generate a blog post (fully automatic)',
    description:
      'Triggers fully automatic, intelligent blog generation. No body required. ' +
      'The system analyzes existing content and category distribution, then picks ' +
      'the best topic, category, and tags automatically before generating the post with AI.',
  })
  @ApiResponse({
    status: 201,
    description: 'Blog generated successfully',
    type: BlogPost,
  })
  @ApiBadRequestResponse({
    description: 'Bad request - auto blog generation failed',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin or Editor role required',
  })
  async autoGenerateBlog(): Promise<BlogPost> {
    return this.intelligentBlogGenerationService.generateIntelligentBlog();
  }

  // Blog Task endpoints - MUST be before @Post('generate') and other routes to avoid conflicts
  @Post('tasks')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new blog task',
    description:
      'Creates a new blog task that will be used by the scheduler to generate blog posts',
  })
  @ApiBody({ type: CreateBlogTaskDto })
  @ApiResponse({
    status: 201,
    description: 'Blog task created successfully',
    type: BlogTask,
  })
  @ApiBadRequestResponse({ description: 'Bad request - validation failed' })
  async createTask(
    @Body() createBlogTaskDto: CreateBlogTaskDto,
  ): Promise<BlogTask> {
    return this.blogTaskService.create(createBlogTaskDto);
  }

  @Patch('tasks/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({
    summary: 'Update a blog task',
    description: 'Updates an existing blog task',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Blog task ID' })
  @ApiBody({ type: UpdateBlogTaskDto })
  @ApiResponse({
    status: 200,
    description: 'Blog task updated successfully',
    type: BlogTask,
  })
  @ApiBadRequestResponse({ description: 'Bad request - validation failed' })
  @ApiNotFoundResponse({ description: 'Blog task not found' })
  async updateTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBlogTaskDto: UpdateBlogTaskDto,
  ): Promise<BlogTask> {
    return this.blogTaskService.update(id, updateBlogTaskDto);
  }

  @Delete('tasks/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a blog task',
    description: 'Deletes a blog task. Admin and Editor roles only.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Blog task ID' })
  @ApiResponse({
    status: 204,
    description: 'Blog task deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'Blog task not found' })
  async removeTask(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.blogTaskService.remove(id);
  }
}
