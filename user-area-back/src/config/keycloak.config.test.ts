import keycloakConfig from './keycloak.config';
import {describe,it,expect,afterEach,} from 'vitest';

describe('keycloak config', () => {
  const keys = [
    'KEYCLOAK_AUTH_SERVER_URL',
    'KEYCLOAK_REALM',
    'KEYCLOAK_CLIENT_ID',
    'KEYCLOAK_JWKS_CACHE_MAX_AGE',
    'KEYCLOAK_JWKS_TIMEOUT',
  ];

  afterEach(() => {
    keys.forEach((key) => {
      delete process.env[key];
    });
  });

  it('aplica padrões quando variáveis estão ausentes', () => {
    expect(keycloakConfig()).toEqual({
      authServerUrl: '',
      realm: '',
      clientId: '',
      jwksCacheMaxAge: 600000,
      jwksTimeout: 5000,
    });
  });

  it('lê variáveis e converte tempos para número', () => {
    process.env.KEYCLOAK_AUTH_SERVER_URL = 'https://auth';
    process.env.KEYCLOAK_REALM = 'realm';
    process.env.KEYCLOAK_CLIENT_ID = 'client';
    process.env.KEYCLOAK_JWKS_CACHE_MAX_AGE = '123';
    process.env.KEYCLOAK_JWKS_TIMEOUT = '456';

    expect(keycloakConfig()).toEqual({
      authServerUrl: 'https://auth',
      realm: 'realm',
      clientId: 'client',
      jwksCacheMaxAge: 123,
      jwksTimeout: 456,
    });
  });
});
