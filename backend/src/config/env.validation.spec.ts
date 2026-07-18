import 'reflect-metadata';
import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/simpleinvoice',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'x'.repeat(31) })).toThrow(
      /JWT_SECRET must be at least 32/,
    );
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => validateEnv({ JWT_SECRET: 'x'.repeat(32) })).toThrow(/DATABASE_URL/);
  });

  it('accepts a well-formed env and applies defaults', () => {
    const env = validateEnv(base);

    expect(env.MAX_PAGE_SIZE).toBe(100);
    expect(env.ENABLE_SWAGGER).toBe(true);
    expect(env.NODE_ENV).toBe('development');
  });

  it('coerces ENABLE_SWAGGER=false from the environment to a boolean false', () => {
    const env = validateEnv({ ...base, ENABLE_SWAGGER: 'false' });

    expect(env.ENABLE_SWAGGER).toBe(false);
  });
});
