import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenAI } from '@google/genai';
import { Media, MediaType } from './entities/media.entity';
import {
  GenerateImageDto,
  GenerateImageFromBlogDto,
  ImageModel,
  ImageSize,
} from './dto/generate-image.dto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { BlogPost } from '../blog/entities/blog-post.entity';

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);
  private readonly ai: GoogleGenAI | null;
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Media)
    private mediaRepository: Repository<Media>,
    @InjectRepository(BlogPost)
    private blogPostRepository: Repository<BlogPost>,
  ) {
    // Generated images are written to this API's public/uploads and served
    // statically by it (see MediaModule's ServeStaticModule) — same as
    // MediaUploadService. Using FRONTEND_URL here produced 404 image URLs.
    this.baseUrl =
      this.configService.get<string>('API_URL')?.split(',')[0] ||
      'https://api.wealthalgor.com';

    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not set. Image generation will not work.',
      );
      this.ai = null;
    } else {
      this.ai = new GoogleGenAI({
        apiKey: apiKey,
      });
      this.logger.log('Image generation Gemini AI initialized successfully');
    }
  }

  /**
   * Generate an image from a prompt
   */
  async generateImage(generateImageDto: GenerateImageDto): Promise<Media> {
    try {
      const model = generateImageDto.model || ImageModel.POLLINATIONS;
      const prompt = generateImageDto.prompt;
      const sizeStr = generateImageDto.size || '1024x1024';
      const dimensions = this.getSizeDimensions(sizeStr);

      let imageUrl: string | undefined;
      let isDataUrl = false;

      this.logger.log(`Generating image for prompt: ${prompt}`);

      // Authenticated Pollinations.ai integration using Flux model
      const apiKey = this.configService.get<string>('POLLINATION_API_KEY');
      const encodedPrompt = encodeURIComponent(prompt);
      
      // Use the authenticated endpoint structure: https://gen.pollinations.ai/image/{prompt}
      const generateUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?width=${dimensions.width}&height=${dimensions.height}&model=flux&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

      if (apiKey) {
        this.logger.log(`Using authenticated request for Pollinations`);
      }

      imageUrl = generateUrl;

      if (!imageUrl) {
        throw new BadRequestException('Failed to generate image URL.');
      }

      // Download and save image locally
      const fileName = `${randomBytes(8).toString('hex')}.png`;
      const uploadDir = join(process.cwd(), 'public/uploads');
      const filePath = join(uploadDir, fileName);

      // Ensure directory exists
      await mkdir(uploadDir, { recursive: true });

      let buffer: Buffer;
      if (isDataUrl) {
        const base64Data = imageUrl.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        buffer = await this.downloadImage(imageUrl);
      }

      await writeFile(filePath, buffer);

      const savedUrl = `${this.baseUrl}/uploads/${fileName}`;
      const savedPath = `public/uploads/${fileName}`;

      // Save to media repository
      const media = this.mediaRepository.create({
        type: MediaType.IMAGE,
        url: savedUrl,
        filePath: savedPath,
        fileName: fileName,
        altText: generateImageDto.altText || prompt,
        width: dimensions.width,
        height: dimensions.height,
        size: buffer.length,
        mimeType: 'image/png',
      });

      const savedMedia = await this.mediaRepository.save(media);

      // If blogPostId is provided, update the blog post's featured image
      if (generateImageDto.blogPostId) {
        await this.associateWithBlogPost(
          generateImageDto.blogPostId,
          savedMedia.id,
        );
      }

      this.logger.log(`Image generated successfully with ID: ${savedMedia.id}`);
      return savedMedia;
    } catch (error) {
      this.logger.error('Error generating image:', error.message);
      throw new BadRequestException(
        `Failed to generate image: ${error.message}`,
      );
    }
  }

  /**
   * Generate an image from a blog post
   */
  async generateImageFromBlog(
    generateImageFromBlogDto: GenerateImageFromBlogDto,
  ): Promise<Media> {
    // Fetch the blog post
    const blogPost = await this.blogPostRepository.findOne({
      where: { id: generateImageFromBlogDto.blogPostId },
      relations: ['blogContent'],
    });

    if (!blogPost) {
      throw new NotFoundException(
        `Blog post with ID ${generateImageFromBlogDto.blogPostId} not found`,
      );
    }

    // Generate prompt from blog post if custom prompt is not provided
    const prompt =
      generateImageFromBlogDto.customPrompt ||
      this.generatePromptFromBlogPost(blogPost);

    // Generate the image at 1200x630 (standard OG/featured image ratio) unless caller specifies size
    const media = await this.generateImage({
      prompt,
      blogPostId: generateImageFromBlogDto.blogPostId,
      model: generateImageFromBlogDto.model,
      size: generateImageFromBlogDto.size || '1200x630',
      style: generateImageFromBlogDto.style,
      altText: `Featured image for: ${blogPost.title}`,
    });

    return media;
  }

  /**
   * Generate a sophisticated prompt from blog post content
   */
  private generatePromptFromBlogPost(blogPost: BlogPost): string {
    const systemPrompt = "Create a stunning, high-definition featured image for a professional blog article. The image should be visually compelling, using a vibrant color palette and a clean, modern aesthetic. It should be cinematic and artistic, capturing the metaphorical essence of the topic. IMPORTANT: No text, no logos, and no watermarks in the image.";
    
    const context = `
Context for the image:
- Blog Title: ${blogPost.title}
- Post Summary: ${blogPost.excerpt || 'Focus on the main themes of the title.'}
- Aesthetic: Corporate futurism, professional, high-end digital art style.
`.trim();

    return `${systemPrompt}\n\n${context}`;
  }

  /**
   * Download image from URL with retries and exponential backoff
   */
  private async downloadImage(url: string, retries = 3): Promise<Buffer> {
    let lastError: Error | undefined;
    const apiKey = this.configService.get<string>('POLLINATION_API_KEY');

    for (let i = 0; i < retries; i++) {
      try {
        if (i > 0) {
          const delay = Math.pow(2, i) * 1000;
          this.logger.log(`Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        this.logger.log(
          `Downloading image (attempt ${i + 1}/${retries}): ${url}`,
        );

        const headers: Record<string, string> = {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        };

        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'No error body');
          throw new Error(
            `HTTP ${response.status} ${response.statusText}: ${errorText.slice(0, 100)}`,
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Basic validation that we got an image and not a small error string
        if (buffer.length < 1000) {
          const content = buffer.toString().slice(0, 50);
          throw new Error(
            `Downloaded file is too small (${buffer.length} bytes). Content start: ${content}`,
          );
        }

        return buffer;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Attempt ${i + 1} failed for ${url}: ${error.message}`,
        );
      }
    }

    throw new BadRequestException(
      `Failed to download image after ${retries} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Associate generated image with blog post
   */
  private async associateWithBlogPost(
    blogPostId: number,
    mediaId: number,
  ): Promise<void> {
    const blogPost = await this.blogPostRepository.findOne({
      where: { id: blogPostId },
    });

    if (!blogPost) {
      throw new NotFoundException(`Blog post with ID ${blogPostId} not found`);
    }

    blogPost.featuredImageId = mediaId;
    await this.blogPostRepository.save(blogPost);
  }

  /**
   * Get dimensions for image size
   */
  private getSizeDimensions(size: any): {
    width: number;
    height: number;
  } {
    // If it's an enum value
    const sizeMap: Record<string, { width: number; height: number }> = {
      [ImageSize.SMALL]: { width: 256, height: 256 },
      [ImageSize.MEDIUM]: { width: 512, height: 512 },
      [ImageSize.LARGE]: { width: 1024, height: 1024 },
    };

    if (sizeMap[size]) {
      return sizeMap[size];
    }

    // If it's a string like '512x512'
    if (typeof size === 'string' && size.includes('x')) {
      const [width, height] = size.split('x').map(Number);
      if (!isNaN(width) && !isNaN(height)) {
        return { width, height };
      }
    }

    // Default to Large
    return { width: 1024, height: 1024 };
  }
}
