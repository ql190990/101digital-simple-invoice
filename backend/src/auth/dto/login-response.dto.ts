import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ example: 3600, description: 'Token lifetime in seconds' })
  expiresIn!: number;

  @ApiProperty({ type: UserDto })
  user!: UserDto;
}
