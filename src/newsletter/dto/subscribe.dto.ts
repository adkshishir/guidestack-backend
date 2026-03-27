import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscribeDto {
  @ApiProperty({
    description: 'Email address to subscribe',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiPropertyOptional({ description: 'Subscriber name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Subscription source',
    example: 'homepage',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;
}

export class VerifySubscriptionDto {
  @ApiProperty({ description: 'Verification token from email' })
  @IsString()
  token: string;
}

export class UnsubscribeDto {
  @ApiProperty({ description: 'Unsubscribe token from email' })
  @IsString()
  token: string;
}

export class SubscriptionResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;
}
