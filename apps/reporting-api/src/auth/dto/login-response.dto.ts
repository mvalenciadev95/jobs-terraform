import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  access_token: string;

  @ApiProperty({
    example: { id: 1, email: 'demo@example.com', role: 'user' },
    description: 'User information',
  })
  user: {
    id: number;
    email: string;
    role: string;
  };
}
