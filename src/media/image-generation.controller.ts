import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ImageGenerationService } from './image-generation.service';
import {
  GenerateImageDto,
  GenerateImageFromBlogDto,
} from './dto/generate-image.dto';
import { Media } from './entities/media.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Image Generation')
@ApiBearerAuth('JWT-auth')
@Controller('images')
@UseGuards(RolesGuard)
export class ImageGenerationController {
  constructor(
    private readonly imageGenerationService: ImageGenerationService,
  ) {}

  @Post('generate')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate an image from a prompt',
    description:
      'Generates an image using AI (DALL-E) based on a text prompt. Optionally associates the image with a blog post.',
  })
  @ApiBody({ type: GenerateImageDto })
  @ApiResponse({
    status: 201,
    description: 'Image generated successfully',
    type: Media,
  })
  @ApiBadRequestResponse({
    description: 'Bad request - validation failed or image generation failed',
  })
  @ApiNotFoundResponse({
    description: 'Blog post not found (if blogPostId provided)',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async generateImage(
    @Body() generateImageDto: GenerateImageDto,
  ): Promise<Media> {
    return this.imageGenerationService.generateImage(generateImageDto);
  }

  @Post('generate-from-blog')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate an image for a blog post',
    description:
      "Generates an image based on a blog post's title and content. Automatically associates the image with the blog post as the featured image.",
  })
  @ApiBody({ type: GenerateImageFromBlogDto })
  @ApiResponse({
    status: 201,
    description: 'Image generated successfully and associated with blog post',
    type: Media,
  })
  @ApiBadRequestResponse({
    description: 'Bad request - validation failed or image generation failed',
  })
  @ApiNotFoundResponse({ description: 'Blog post not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async generateImageFromBlog(
    @Body() generateImageFromBlogDto: GenerateImageFromBlogDto,
  ): Promise<Media> {
    return this.imageGenerationService.generateImageFromBlog(
      generateImageFromBlogDto,
    );
  }
}
