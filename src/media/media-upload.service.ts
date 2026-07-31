import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Media, MediaType } from './entities/media.entity';
import { UploadMediaDto } from './dto/upload-media.dto';

@Injectable()
export class MediaUploadService {
  private readonly logger = new Logger(MediaUploadService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Media)
    private mediaRepository: Repository<Media>,
  ) {
    // Uploads are served statically by this API (see MediaModule's
    // ServeStaticModule), not by the frontend, so the URL must point here.
    this.baseUrl =
      this.configService.get<string>('API_URL')?.split(',')[0] ||
      'https://api.wealthalgor.com';
  }

  /**
   * Upload a media file and create a database record
   */
  async uploadMedia(
    file: Express.Multer.File,
    uploadMediaDto: UploadMediaDto,
  ): Promise<Media> {
    try {
      // Construct the URL for the uploaded file (served statically at /uploads/)
      const fileUrl = `${this.baseUrl}/uploads/${file.filename}`;

      // Get image dimensions if possible (for images)
      let width: number | undefined;
      let height: number | undefined;

      // Create media record
      const media = this.mediaRepository.create({
        type: MediaType.IMAGE,
        url: fileUrl,
        altText: uploadMediaDto.altText || file.originalname,
        width,
        height,
        fileName: file.originalname,
        filePath: `public/uploads/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
      });

      const savedMedia = await this.mediaRepository.save(media);
      this.logger.log(`Media uploaded successfully: ${savedMedia.id}`);

      return savedMedia;
    } catch (error) {
      this.logger.error(`Failed to save media record: ${error.message}`);
      throw new BadRequestException('Failed to save media record');
    }
  }

  /**
   * Get all media files
   */
  async getAllMedia(): Promise<Media[]> {
    return this.mediaRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a media file by ID
   */
  async getMediaById(id: number): Promise<Media> {
    const media = await this.mediaRepository.findOne({ where: { id } });
    if (!media) {
      throw new NotFoundException(`Media with ID ${id} not found`);
    }
    return media;
  }

  /**
   * Delete a media file
   */
  async deleteMedia(id: number): Promise<void> {
    const media = await this.getMediaById(id);

    // Try to delete the file from disk
    if (media.filePath) {
      try {
        const fullPath = join(process.cwd(), media.filePath);
        await unlink(fullPath);
        this.logger.log(`Deleted file: ${fullPath}`);
      } catch (error) {
        this.logger.warn(`Could not delete file: ${error.message}`);
        // Continue with database deletion even if file deletion fails
      }
    }

    await this.mediaRepository.remove(media);
    this.logger.log(`Media record deleted: ${id}`);
  }
}
