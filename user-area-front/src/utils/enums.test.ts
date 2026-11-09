import { describe, it, expect } from 'vitest';
import { ADMIN_ONLY_LINKS, ALL_ROLES, Links, Roles, WRITE_ROLES } from './enums';

describe('Roles (nomes no realm do Keycloak)', () => {
  it('mantém o prefixo sys_ e os nomes exatos', () => {
    expect(Roles.STUDENT).toBe('sys_user-area-student');
    expect(Roles.STAFF).toBe('sys_user-area-staff');
    expect(Roles.ADMIN).toBe('sys_user-area-admin');
  });

  it('são os nomes puros — no back os mesmos valores levam o prefixo realm:', () => {
    for (const role of Object.values(Roles)) {
      expect(role).toMatch(/^sys_user-area-/);
    }
  });
});

describe('grupos de roles', () => {
  it('ALL_ROLES aceita qualquer role do sistema, ADMIN incluso', () => {
    expect(ALL_ROLES).toEqual([Roles.STUDENT, Roles.STAFF, Roles.ADMIN]);
  });

  it('WRITE_ROLES não é satisfeito só por pertencimento', () => {
    expect(WRITE_ROLES).toEqual([Roles.ADMIN]);
  });
});

describe('ADMIN_ONLY_LINKS', () => {
  it('todo item admin-only do menu tem rota correspondente', () => {
    const routes = Object.values(Links) as string[];
    for (const link of ADMIN_ONLY_LINKS) {
      expect(routes).toContain(link);
    }
  });

  it('a rota de gerenciamento de equipe é admin-only', () => {
    expect(ADMIN_ONLY_LINKS).toContain(Links.TEAM);
  });
});
