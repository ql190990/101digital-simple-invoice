import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT auth guard applied to all protected routes (AUTH-02). Unauthenticated
 * requests receive 401 via the standard error envelope.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
