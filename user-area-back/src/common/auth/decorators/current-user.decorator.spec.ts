import type { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { AccessRole } from '../access-role.enum';
import type { CurrentUser } from '../current-user.interface';
import { GetCurrentUser } from './current-user.decorator';

describe('GetCurrentUser', () => {
  function getFactory() {
    class FakeController {
      handler() {
        return undefined;
      }
    }

    GetCurrentUser()(FakeController.prototype, 'handler', 0);

    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, FakeController, 'handler');
    return Object.values(metadata)[0] as {
      factory: (data: unknown, context: ExecutionContext) => CurrentUser | undefined;
    };
  }

  // Simula o contexto de uma requisição HTTP, só com o que o decorator usa.
  function createContext(request: { user?: CurrentUser }): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('devolve o usuário autenticado que está na requisição', () => {
    const { factory } = getFactory();
    const user: CurrentUser = {
      userId: 'keycloak-1',
      role: AccessRole.ADMIN,
      name: 'Admin',
      email: 'admin@exemplo.com',
    };

    const result = factory(undefined, createContext({ user }));

    expect(result).toBe(user);
  });

  it('devolve undefined quando não há usuário na requisição', () => {
    const { factory } = getFactory();

    const result = factory(undefined, createContext({}));

    expect(result).toBeUndefined();
  });
});