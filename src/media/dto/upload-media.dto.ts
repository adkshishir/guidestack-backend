import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UploadMediaDto {
  @ApiPropertyOptional({
    description: 'Alt text for the image',
    example: 'A beautiful landscape photo',
    type: String,
  })
  @IsString()
  @IsOptional()
  altText?: string;

  @ApiPropertyOptional({
    description: 'Title/name for the media file',
    example: 'Landscape Photo',
    type: String,
  })
  @IsString()
  @IsOptional()
  title?: string;
}
