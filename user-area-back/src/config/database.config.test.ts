import databaseConfig from './database.config';
import {describe,it,expect,beforeEach,afterEach,} from 'vitest';

describe('database config', () => {
  const keys = [
    'DATABASE_URL',
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
  ];

  let previous: Record<string, string | undefined>;

  beforeEach(() => {
    previous = Object.fromEntries(
      keys.map((key) => [key, process.env[key]]),
    );

    keys.forEach((key) => {
      delete process.env[key];
    });
  });

  afterEach(() => {
    keys.forEach((key) => {
      const value = previous[key];

      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  it('usa DATABASE_URL quando fornecida', () => {
    process.env.DATABASE_URL = 'postgresql://test';

    expect(databaseConfig().url).toBe('postgresql://test');
  });

  it('monta URL com valores padrão', () => {
    expect(databaseConfig().url).toBe(
      'postgresql://postgres:postgres@localhost:5432/database',
    );
  });

  it('monta URL com variáveis DB_*', () => {
    process.env.DB_HOST = 'db';
    process.env.DB_PORT = '5555';
    process.env.DB_USERNAME = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.DB_DATABASE = 'd';

    expect(databaseConfig().url).toBe(
      'postgresql://u:p@db:5555/d',
    );
  });

  it('propaga URL montada para DATABASE_URL', () => {
    databaseConfig();

    expect(process.env.DATABASE_URL).toContain('postgresql://');
  });
});
