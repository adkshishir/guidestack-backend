import { ApiProperty } from '@nestjs/swagger';

export class MfaRequiredResponseDto {
  @ApiProperty({ example: true })
  mfaRequired: boolean;

  @ApiProperty({ example: 'user@example.com' })
  email: string;
}
