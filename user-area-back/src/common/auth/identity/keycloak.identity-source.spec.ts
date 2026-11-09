import {describe,it,expect,beforeEach,vi,} from 'vitest';
import {UnauthorizedException,} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {createRemoteJWKSet,jwtVerify,} from 'jose';
import { KeycloakIdentitySource } from './keycloak.identity-source';
import { AccessDeniedException } from '@/common/exceptions/access-denied.exception';
import { AccessRole } from '../access-role.enum';

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => vi.fn()),
  jwtVerify: vi.fn(),
}));

describe('KeycloakIdentitySource', () => {
  const defaultConfig = {
    'keycloak.authServerUrl': 'https://auth.test',
    'keycloak.realm': 'test-realm',
    'keycloak.clientId': 'test-client',
    'keycloak.jwksCacheMaxAge': 600000,
    'keycloak.jwksTimeout': 5000,
  };

  let configService: { get: ReturnType<typeof vi.fn> };
  let identitySource: KeycloakIdentitySource;

  const createRequest = (authorization?: string) => ({
    headers: {
      authorization,
    },
  }) as any;

  const validPayload = {
    sub: 'user-123',
    name: 'Ana',
    email: 'ana@test.com',
    aud: 'test-client',
    realm_access: {
      roles: ['sys_user-area-student'],
    },
  };

  const mockValidToken = (payload: Record<string, any> = validPayload,) => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload,
      protectedHeader: {},
      key: {},
    } as any);
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(createRemoteJWKSet).mockImplementation(
      (() => vi.fn()) as any,
    );

    vi.mocked(jwtVerify).mockReset();

    configService = {
      get: vi.fn((key: string) => defaultConfig[key as keyof typeof defaultConfig]),
    };

    identitySource = new KeycloakIdentitySource(
      configService as unknown as ConfigService,
    );
  });

  it('retorna null quando não existe autorização', async () => {
    const result = await identitySource.extract(createRequest());

    expect(result).toBeNull();
    expect(jwtVerify).not.toHaveBeenCalled();
  });

  it('retorna null quando o esquema não é Bearer', async () => {
    const result = await identitySource.extract(
      createRequest('Basic token-123'),
    );

    expect(result).toBeNull();
    expect(jwtVerify).not.toHaveBeenCalled();
  });

  it('retorna null quando o token está ausente', async () => {
    const result = await identitySource.extract(
      createRequest('Bearer'),
    );

    expect(result).toBeNull();
  });

  it('lança erro quando a configuração do Keycloak está ausente', async () => {
    configService.get.mockImplementation(() => undefined);

    await expect(
      identitySource.extract(createRequest('Bearer token-123')),
    ).rejects.toThrow(
      'Configuração do Keycloak ausente: defina KEYCLOAK_AUTH_SERVER_URL e KEYCLOAK_REALM.',
    );

    expect(jwtVerify).not.toHaveBeenCalled();
  });

  it('inicializa o JWKS com a URL e as configurações corretas', async () => {
    mockValidToken();

    await identitySource.extract(
      createRequest('Bearer token-123'),
    );

    expect(createRemoteJWKSet).toHaveBeenCalledWith(
      new URL(
        'https://auth.test/realms/test-realm/protocol/openid-connect/certs',
      ),
      {
        cacheMaxAge: 600000,
        timeoutDuration: 5000,
      },
    );
  });

  it('valida o token utilizando o issuer e a tolerância de relógio', async () => {
    mockValidToken();

    await identitySource.extract(
      createRequest('Bearer token-123'),
    );

    expect(jwtVerify).toHaveBeenCalledWith(
      'token-123',
      expect.any(Function),
      {
        issuer: 'https://auth.test/realms/test-realm',
        clockTolerance: 5,
      },
    );
  });

  it('lança UnauthorizedException quando o token é inválido', async () => {
    vi.mocked(jwtVerify).mockRejectedValue(
      new Error('Token inválido'),
    );

    await expect(
      identitySource.extract(createRequest('Bearer token-123')),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('retorna os dados do usuário quando o token é válido', async () => {
    mockValidToken();

    const result = await identitySource.extract(
      createRequest('Bearer token-123'),
    );

    expect(result).toEqual({
      userId: 'user-123',
      role: AccessRole.STUDENT,
      name: 'Ana',
      email: 'ana@test.com',
    });
  });

  it('utiliza preferred_username quando name não existe', async () => {
    mockValidToken({
      sub: 'user-123',
      preferred_username: 'ana123',
      aud: 'test-client',
      realm_access: {
        roles: ['sys_user-area-student'],
      },
    });

    const result = await identitySource.extract(
      createRequest('Bearer token-123'),
    );

    expect(result?.name).toBe('ana123');
  });

  it('aceita clientId presente em azp', async () => {
    mockValidToken({
      ...validPayload,
      aud: 'account',
      azp: 'test-client',
    });

    const result = await identitySource.extract(
      createRequest('Bearer token-123'),
    );

    expect(result?.userId).toBe('user-123');
  });

  it('aceita clientId presente em uma lista de audiencias', async () => {
    mockValidToken({
      ...validPayload,
      aud: ['account', 'test-client'],
    });

    const result = await identitySource.extract(
      createRequest('Bearer token-123'),
    );

    expect(result?.userId).toBe('user-123');
  });

  it('lança AccessDeniedException quando a audiência é inválida', async () => {
    mockValidToken({
      ...validPayload,
      aud: 'another-client',
      azp: 'another-client',
    });

    await expect(
      identitySource.extract(createRequest('Bearer token-123')),
    ).rejects.toThrow(AccessDeniedException);
  });

  it('não valida audiência quando clientId não está configurado', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'keycloak.clientId') {
        return undefined;
      }

      return defaultConfig[key as keyof typeof defaultConfig];
    });

    mockValidToken({
      ...validPayload,
      aud: 'another-client',
    });

    const result = await identitySource.extract(
      createRequest('Bearer token-123'),
    );

    expect(result?.userId).toBe('user-123');
  });

  it('lança AccessDeniedException quando o usuário não possui role reconhecida', async () => {
    mockValidToken({
      ...validPayload,
      realm_access: {
        roles: ['unknown-role'],
      },
    });

    await expect(
      identitySource.extract(createRequest('Bearer token-123')),
    ).rejects.toThrow(AccessDeniedException);
  });

  it('prioriza ADMIN sobre STAFF e STUDENT', async () => {
    mockValidToken({
      ...validPayload,
      realm_access: {
        roles: [
          'sys_user-area-student',
          'sys_user-area-staff',
          'sys_user-area-admin',
        ],
      },
    });

    const result = await identitySource.extract(
      createRequest('Bearer token-123'),
    );

    expect(result?.role).toBe(AccessRole.ADMIN);
  });

  it('prioriza STAFF sobre STUDENT', async () => {
    mockValidToken({
      ...validPayload,
      realm_access: {
        roles: [
          'sys_user-area-student',
          'sys_user-area-staff',
        ],
      },
    });

    const result = await identitySource.extract(
      createRequest('Bearer token-123'),
    );

    expect(result?.role).toBe(AccessRole.STAFF);
  });

  it('lança UnauthorizedException quando o token não possui sub', async () => {
    mockValidToken({
      ...validPayload,
      sub: undefined,
    });

    await expect(
      identitySource.extract(createRequest('Bearer token-123')),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('reutiliza a inicialização do JWKS nas próximas validações', async () => {
    mockValidToken();

    await identitySource.extract(
      createRequest('Bearer token-123'),
    );

    await identitySource.extract(
      createRequest('Bearer token-456'),
    );

    expect(createRemoteJWKSet).toHaveBeenCalledTimes(1);
    expect(jwtVerify).toHaveBeenCalledTimes(2);
  });
});
