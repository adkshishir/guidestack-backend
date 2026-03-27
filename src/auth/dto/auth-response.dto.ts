import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token for authentication',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJzdWIiOjEsInJvbGUiOiJBVVRIT1IiLCJpYXQiOjE2MDAwMDAwMDB9.example',
    type: String,
  })
  access_token: string;

  @ApiProperty({
    description: 'User information',
    type: Object,
    example: {
      id: 1,
      email: 'user@example.com',
      role: 'AUTHOR',
      status: 'ACTIVE',
    },
  })
  user: {
    id: number;
    email: string;
    role: string;
    status: string;
    isTwoFactorEnabled: boolean;
  };
}
