import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';

/**
 * Public user representation. Never includes `passwordHash` (AUTH-06).
 */
export class UserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'reviewer@101digital.io' })
  email!: string;

  @ApiProperty({ example: 'Reviewer' })
  fullname!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  static fromEntity(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
