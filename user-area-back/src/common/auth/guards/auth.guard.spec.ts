import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AccessRole } from '../access-role.enum';

describe('AuthGuard', () => {
  const request = { headers: {} } as any;
  const context = {
    getHandler: vi.fn(), getClass: vi.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;
  it('permite rotas públicas sem consultar identidade', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(true) } as any;
    const identity = { extract: vi.fn() };
    expect(await new AuthGuard(reflector, identity).canActivate(context)).toBe(true);
    expect(identity.extract).not.toHaveBeenCalled();
  });
  it('rejeita requisição sem identidade', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as any;
    const identity = { extract: vi.fn().mockResolvedValue(null) };
    await expect(new AuthGuard(reflector, identity).canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('anexa o usuário autenticado à requisição', async () => {
    const user = { userId: 'u1', role: AccessRole.STUDENT };
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as any;
    const identity = { extract: vi.fn().mockResolvedValue(user) };
    expect(await new AuthGuard(reflector, identity).canActivate(context)).toBe(true);
    expect(request.user).toEqual(user);
  });
});
