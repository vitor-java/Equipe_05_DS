import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('aceita uma configuração vazia', () => {
    const resultado = validateEnv({});

    expect(resultado).toEqual({});
  });

  it('aceita o Keycloak configurado por completo', () => {
    const config = {
      KEYCLOAK_AUTH_SERVER_URL: 'http://localhost:8080/auth',
      KEYCLOAK_REALM: 'Local',
    };

    const resultado = validateEnv(config);

    expect(resultado).toEqual(config);
  });

  it('dá erro quando falta o REALM do Keycloak', () => {
    const config = {
      KEYCLOAK_AUTH_SERVER_URL: 'http://localhost:8080/auth',
    };

    expect(() => validateEnv(config)).toThrow('KEYCLOAK_REALM');
  });

  it('dá erro quando o timeout não é um número', () => {
    const config = {
      KEYCLOAK_JWKS_TIMEOUT: 'abc',
    };

    expect(() => validateEnv(config)).toThrow('KEYCLOAK_JWKS_TIMEOUT');
  });
});