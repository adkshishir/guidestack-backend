import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { MediaUploadService } from './media-upload.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { Media } from './entities/media.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';

// Ensure uploads directory exists in public folder
const uploadDir = join(process.cwd(), 'public', 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@ApiTags('Media')
@ApiBearerAuth('JWT-auth')
@Controller('media')
@UseGuards(RolesGuard)
export class MediaUploadController {
  constructor(private readonly mediaUploadService: MediaUploadService) {}

  @Post('upload')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'public', 'uploads');
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // Generate unique filename with original extension
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Allow only images
        if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp|svg\+xml)$/)) {
          return cb(
            new BadRequestException(
              'Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload an image file',
    description:
      'Uploads an image file to the server and creates a media record',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload (JPEG, PNG, GIF, WebP, SVG)',
        },
        altText: {
          type: 'string',
          description: 'Alt text for the image',
        },
        title: {
          type: 'string',
          description: 'Title for the media',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    type: Media,
  })
  @ApiBadRequestResponse({
    description: 'Bad request - invalid file type or size',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadMediaDto: UploadMediaDto,
  ): Promise<Media> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.mediaUploadService.uploadMedia(file, uploadMediaDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({
    summary: 'Get all media files',
    description: 'Retrieves a list of all uploaded media files',
  })
  @ApiResponse({
    status: 200,
    description: 'List of media files',
    type: [Media],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getAllMedia(): Promise<Media[]> {
    return this.mediaUploadService.getAllMedia();
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get a media file by ID',
    description: 'Retrieves a specific media file by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Media file details',
    type: Media,
  })
  @ApiNotFoundResponse({ description: 'Media not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getMediaById(@Param('id', ParseIntPipe) id: number): Promise<Media> {
    return this.mediaUploadService.getMediaById(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a media file',
    description: 'Deletes a media file and removes it from storage',
  })
  @ApiResponse({
    status: 204,
    description: 'Media deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'Media not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async deleteMedia(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.mediaUploadService.deleteMedia(id);
  }
}
