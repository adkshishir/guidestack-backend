import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
  ApiQuery,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { VerifyCommentDto } from './dto/verify-comment.dto';
import { Comment } from './entities/comment.entity';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Comments')
@ApiBearerAuth('JWT-auth')
@Controller('comments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new comment',
    description:
      'Creates a new comment on a blog post. If authenticated, comment is visible. If guest, requires OTP verification.',
  })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({
    status: 201,
    description:
      'Comment created successfully. If guest, verification email sent.',
    type: Comment,
  })
  @ApiBadRequestResponse({ description: 'Bad request - validation failed' })
  @ApiNotFoundResponse({ description: 'Blog post or parent comment not found' })
  async create(
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user?: User,
  ): Promise<Comment> {
    return this.commentsService.create(createCommentDto, user?.id);
  }

  @Post('verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify guest comment with OTP',
    description:
      'Verifies a guest comment using the OTP sent to their email. Also subscribes them to newsletter.',
  })
  @ApiBody({ type: VerifyCommentDto })
  @ApiResponse({
    status: 200,
    description: 'Comment verified and published',
    type: Comment,
  })
  @ApiBadRequestResponse({ description: 'Invalid verification code' })
  async verify(@Body() verifyCommentDto: VerifyCommentDto): Promise<Comment> {
    return this.commentsService.verifyOtp(verifyCommentDto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all comments',
    description:
      'Returns a list of all comments. Can be filtered by blog post ID.',
  })
  @ApiQuery({
    name: 'blogPostId',
    required: false,
    type: Number,
    description: 'Filter comments by blog post ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of comments',
    type: [Comment],
  })
  async findAll(@Query('blogPostId') blogPostId?: number): Promise<Comment[]> {
    return this.commentsService.findAll(blogPostId);
  }

  @Get('blog/:blogPostId')
  @Public()
  @ApiOperation({
    summary: 'Get comments for a blog post',
    description:
      'Returns all top-level comments for a specific blog post with their replies',
  })
  @ApiParam({ name: 'blogPostId', type: Number, description: 'Blog post ID' })
  @ApiResponse({
    status: 200,
    description: 'List of comments for the blog post',
    type: [Comment],
  })
  async findByBlogPost(
    @Param('blogPostId', ParseIntPipe) blogPostId: number,
  ): Promise<Comment[]> {
    return this.commentsService.findByBlogPost(blogPostId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get a comment by ID',
    description: 'Returns a single comment by its ID',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment found',
    type: Comment,
  })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Comment> {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  @ApiOperation({
    summary: 'Update a comment',
    description:
      'Updates an existing comment. Authors can only update their own comments.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Comment ID' })
  @ApiBody({ type: UpdateCommentDto })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
    type: Comment,
  })
  @ApiBadRequestResponse({ description: 'Bad request - validation failed' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCommentDto: UpdateCommentDto,
    @CurrentUser() user: User,
  ): Promise<Comment> {
    // TODO: Add authorization check - users can only update their own comments
    // unless they are admin/editor
    return this.commentsService.update(id, updateCommentDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a comment (soft delete)',
    description: 'Soft deletes a comment by setting its status to DELETED',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Comment ID' })
  @ApiResponse({
    status: 204,
    description: 'Comment deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.commentsService.remove(id);
  }

  @Delete(':id/hard')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Permanently delete a comment',
    description:
      'Permanently deletes a comment from the database. Admin and Editor only.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Comment ID' })
  @ApiResponse({
    status: 204,
    description: 'Comment permanently deleted',
  })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  async hardDelete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.commentsService.hardDelete(id);
  }
}
