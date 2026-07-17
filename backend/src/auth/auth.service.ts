import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginResponseDto } from './dto/login-response.dto';
import { UserDto } from './dto/user.dto';
import { JwtPayload } from './jwt.strategy';

export const BCRYPT_COST = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Hash a plaintext password with bcrypt (cost ≥ 10, AUTH-05). */
  static hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_COST);
  }

  /**
   * Validate credentials and issue a JWT. Returns one generic error for both
   * "unknown email" and "wrong password" so account existence is not leaked
   * (AUTH-07). A dummy compare runs when the email is unknown to blunt timing
   * side-channels.
   */
  async login(email: string, password: string): Promise<LoginResponseDto> {
    const user = await this.usersService.findByEmail(email);

    const hash =
      user?.passwordHash ?? '$2a$12$0000000000000000000000000000000000000000000000000000';
    const passwordMatches = await bcrypt.compare(password, hash);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const expiresIn = this.config.get<number>('JWT_EXPIRES_IN', 3600);
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: UserDto.fromEntity(user),
    };
  }
}
