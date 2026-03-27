import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateContactDto {
  @ApiProperty({
    description: 'Contact name',
    example: 'John Doe',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Contact email',
    example: 'john@example.com',
    type: String,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description: 'Contact subject',
    example: 'Question about blog',
    type: String,
  })
  @IsString()
  @MaxLength(255)
  subject?: string;

  @ApiProperty({
    description: 'Contact message',
    example: 'I have a question about...',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}

