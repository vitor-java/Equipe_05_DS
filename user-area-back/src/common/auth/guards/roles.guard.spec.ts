import { describe, it, expect} from 'vitest';
import { AccessRole } from '../access-role.enum';
import { RolesGuard } from './roles.guard';
import { AccessDeniedException } from '@/common/exceptions/access-denied.exception';

describe('RolesGuard', () => {
  const req: any = {};
  const ctx: any = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => req }) };
  it('permite quando não há roles exigidas', () => {
    const guard = new RolesGuard({ getAllAndOverride: () => undefined } as any);
    expect(guard.canActivate(ctx)).toBe(true);
  });
  it('permite lista vazia de roles', () => {
    const guard = new RolesGuard({ getAllAndOverride: () => [] } as any);
    expect(guard.canActivate(ctx)).toBe(true);
  });
  it('nega usuário ausente', () => {
    const guard = new RolesGuard({ getAllAndOverride: () => [AccessRole.ADMIN] } as any);
    req.user = undefined;
    expect(() => guard.canActivate(ctx)).toThrow(AccessDeniedException);
  });
  it('nega papel incompatível', () => {
    const guard = new RolesGuard({ getAllAndOverride: () => [AccessRole.ADMIN] } as any);
    req.user = { role: AccessRole.STUDENT };
    expect(() => guard.canActivate(ctx)).toThrow(AccessDeniedException);
  });
  it('permite papel autorizado', () => {
    const guard = new RolesGuard({ getAllAndOverride: () => [AccessRole.ADMIN, AccessRole.STAFF] } as any);
    req.user = { role: AccessRole.STAFF };
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
