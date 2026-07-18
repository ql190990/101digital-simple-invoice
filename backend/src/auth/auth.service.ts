import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginResponseDto } from './dto/login-response.dto';
import { UserDto } from './dto/user.dto';
import { JwtPayload } from './jwt.strategy';

export const BCRYPT_COST = 12;

/**
 * A real bcrypt digest of a fixed, non-secret password, computed once at module
 * load. Used as a stand-in hash when the email is unknown so that
 * `bcrypt.compare` still runs the full KDF instead of short-circuiting. This
 * keeps the "unknown email" and "wrong password" paths timing-equivalent and
 * closes the user-enumeration side-channel (Sec M1, AUTH-07). It is a valid
 * 60-char hash at cost `BCRYPT_COST`, pinned by a unit test so it cannot
 * silently regress into a malformed literal.
 */
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync('simpleinvoice-dummy-password', BCRYPT_COST);

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
   * (AUTH-07). When the email is unknown we still run `bcrypt.compare` against
   * `DUMMY_PASSWORD_HASH` (a real, valid digest), so both failure paths perform
   * the same KDF work and stay timing-equivalent — no user-enumeration oracle.
   */
  async login(email: string, password: string): Promise<LoginResponseDto> {
    const user = await this.usersService.findByEmail(email);

    const hash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
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
