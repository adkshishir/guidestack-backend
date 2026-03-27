import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorDto {
  @ApiProperty({
    description: 'Two factor authentication code',
    example: '123456',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Secret key for two factor authentication',
    example: 'JBSWY3DPEHPK3PXP',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  secret: string;
}
