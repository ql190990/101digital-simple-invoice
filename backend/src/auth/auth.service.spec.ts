import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { User } from '@prisma/client';
import { performance } from 'perf_hooks';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { AuthService, BCRYPT_COST, DUMMY_PASSWORD_HASH } from './auth.service';

// bcryptjs' exports are non-configurable, so `jest.spyOn(bcrypt, 'compare')` throws
// "Cannot redefine property". Mock the module instead: keep the real
// hashSync/getRounds/compareSync (DUMMY_PASSWORD_HASH validity + the timing test need
// the real KDF) and replace only `compare` with a jest.fn().
jest.mock('bcryptjs', () => {
  const actual = jest.requireActual('bcryptjs');
  return { __esModule: true, ...actual, compare: jest.fn() };
});

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'ad1e0902-1928-4345-b513-60c86c94fc91',
    email: 'reviewer@101digital.io',
    // A valid 60-char digest so the stored-hash shape is realistic; bcrypt.compare
    // is mocked per-test, so the concrete value never gates the assertions.
    passwordHash: DUMMY_PASSWORD_HASH,
    fullname: 'Reviewer',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; findById: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn(), findById: jest.fn() };
    jwtService = { signAsync: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(3600) } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    (bcrypt.compare as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Regression guard for Sec M1 / AUTH-07: the previous malformed literal made
  // bcrypt.compare short-circuit in ~1µs, re-opening a user-enumeration oracle.
  describe('DUMMY_PASSWORD_HASH (timing defense)', () => {
    it('is a valid 60-char bcrypt digest at the configured cost', () => {
      expect(BCRYPT_COST).toBe(12);
      expect(DUMMY_PASSWORD_HASH).toHaveLength(60);
      expect(bcrypt.getRounds(DUMMY_PASSWORD_HASH)).toBe(BCRYPT_COST);
    });

    it('actually runs the KDF instead of short-circuiting', () => {
      const start = performance.now();
      const matched = bcrypt.compareSync('x', DUMMY_PASSWORD_HASH);
      const elapsedMs = performance.now() - start;

      expect(matched).toBe(false);
      // A malformed hash returns in ~1µs; a real cost-12 compare takes ~200ms.
      expect(elapsedMs).toBeGreaterThan(20);
    });
  });

  describe('login', () => {
    it('still runs bcrypt.compare for an unknown email, then throws a generic error', async () => {
      const compareSpy = bcrypt.compare as jest.Mock;
      compareSpy.mockResolvedValue(false);
      usersService.findByEmail.mockResolvedValue(null);

      const error = await service.login('nobody@x.io', 'pw').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).message).toBe('Invalid email or password');
      // The compare must run against the dummy hash even with no user (no early return).
      expect(compareSpy).toHaveBeenCalledTimes(1);
      expect(compareSpy).toHaveBeenCalledWith('pw', DUMMY_PASSWORD_HASH);
    });

    it('throws the same generic error for a wrong password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      usersService.findByEmail.mockResolvedValue(makeUser());

      const error = await service.login('reviewer@101digital.io', 'wrong').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).message).toBe('Invalid email or password');
    });

    it('issues a token for valid credentials and never exposes passwordHash', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('signed.jwt.token');
      usersService.findByEmail.mockResolvedValue(makeUser());

      const result = await service.login('reviewer@101digital.io', 'correct');

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(3600);
      expect(result.user.email).toBe('reviewer@101digital.io');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(result)).not.toContain(DUMMY_PASSWORD_HASH);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'ad1e0902-1928-4345-b513-60c86c94fc91', email: 'reviewer@101digital.io' },
        { expiresIn: 3600 },
      );
    });
  });
});
