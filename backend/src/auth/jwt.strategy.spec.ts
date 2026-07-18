import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: { findById: jest.Mock; findByEmail: jest.Mock };

  beforeEach(() => {
    usersService = { findById: jest.fn(), findByEmail: jest.fn() };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('a'.repeat(32)),
    } as unknown as ConfigService;
    strategy = new JwtStrategy(config, usersService as unknown as UsersService);
  });

  it('returns the authenticated user for an existing account', async () => {
    const user: User = {
      id: 'ad1e0902-1928-4345-b513-60c86c94fc91',
      email: 'reviewer@101digital.io',
      passwordHash: 'irrelevant-here',
      fullname: 'Reviewer',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    usersService.findById.mockResolvedValue(user);

    const result = await strategy.validate({ sub: user.id, email: user.email });

    expect(result).toEqual({ id: user.id, email: user.email, fullname: user.fullname });
    expect(usersService.findById).toHaveBeenCalledWith(user.id);
  });

  it('rejects a still-valid token whose user was deleted (revocation)', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(strategy.validate({ sub: 'gone', email: 'x@x.io' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
