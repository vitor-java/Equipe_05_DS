import { describe, it, expect } from 'vitest';
import { ShieldCheck, User } from 'lucide-react';
import { sidebar, buildSidebar } from './sidebar';
import { Links } from './enums';

describe('sidebar', () => {
  it('deve possuir o nome correto da aplicação', () => {
    expect(sidebar.appName).toBe('CIn Portal');
  });

  it('deve possuir o caminho do logo', () => {
    expect(sidebar.appLogoSrc).toBeTruthy();
  });

  it('deve possuir o item de perfil na navegação', () => {
    expect(sidebar.navMain).toHaveLength(1);

    expect(sidebar.navMain[0]).toMatchObject({
      id: 'profile',
      title: 'Meu Perfil',
      href: Links.PROFILE,
      IconComponent: User,
    });
  });
});

describe('buildSidebar', () => {
  it('deve retornar a sidebar padrão para usuários não administradores', () => {
    const result = buildSidebar(false);

    expect(result).toBe(sidebar);
    expect(result.navMain).toHaveLength(1);
  });

  it('deve incluir o painel administrativo para administradores', () => {
    const result = buildSidebar(true);

    expect(result.navMain).toHaveLength(2);

    expect(result.navMain[1]).toMatchObject({
      id: 'admin',
      title: 'Painel Admin',
      href: Links.ADMIN,
      IconComponent: ShieldCheck,
    });
  });

  it('não deve modificar a sidebar original ao adicionar o painel administrativo', () => {
    const quantidadeOriginal = sidebar.navMain.length;

    buildSidebar(true);

    expect(sidebar.navMain).toHaveLength(quantidadeOriginal);
    expect(sidebar.navMain).toHaveLength(1);
  });

  it('deve preservar o item de perfil para administradores', () => {
    const result = buildSidebar(true);

    expect(result.navMain[0]).toMatchObject({
      id: 'profile',
      title: 'Meu Perfil',
      href: Links.PROFILE,
      IconComponent: User,
    });
  });

  it('deve retornar uma nova configuração para administradores', () => {
    const result = buildSidebar(true);

    expect(result).not.toBe(sidebar);
    expect(result.navMain).not.toBe(sidebar.navMain);
  });
});
