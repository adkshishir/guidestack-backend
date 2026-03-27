import { IsNotEmpty, IsString, IsEmail, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyCommentDto {
  @ApiProperty({
    description: 'Author email',
    example: 'john@example.com',
    type: String,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Verification code (OTP)',
    example: '123456',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;

  @ApiProperty({
    description: 'Comment ID',
    example: 1,
    type: Number,
  })
  @IsNotEmpty()
  commentId: number;
}
