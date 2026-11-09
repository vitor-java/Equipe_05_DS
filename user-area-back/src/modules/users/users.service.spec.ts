import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { join } from 'path';
import { UsersService } from './users.service';
import { AccessRole } from '@/common/auth/access-role.enum';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { renameSync, unlinkSync, existsSync } from 'fs';

vi.mock('fs', () => ({
  renameSync: vi.fn(),
  unlinkSync: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock('./users.controller', () => ({
  avatarDirectory: '/tmp/avatars',
  imageExtensions: {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  },
}));

vi.mock('pdfkit', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(() => createPdfMock()),
}));

function createPdfMock() {
  const handlers: Record<string, (value?: any) => void> = {};
  const doc: any = {
    on: vi.fn((event: string, callback: (value?: any) => void) => {
      handlers[event] = callback;
      return doc;
    }),
    fontSize: vi.fn().mockReturnThis(),
    fillColor: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    moveDown: vi.fn().mockReturnThis(),
    end: vi.fn(() => handlers.end?.()),
  };
  return doc;
}

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  const user = {
    userId: 'keycloak-123',
    name: 'Ana',
    email: 'ana@test.com',
    role: AccessRole.STUDENT,
  };

  const me = {
    id: 'user-123',
    keycloakId: 'keycloak-123',
    name: 'Ana',
    email: 'ana@test.com',
    role: AccessRole.STUDENT,
    links: [],
    experiences: [],
    projects: [],
    vehicles: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = {
      user: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      profileLink: { deleteMany: vi.fn(), createMany: vi.fn() },
      experience: { deleteMany: vi.fn(), createMany: vi.fn() },
      project: { deleteMany: vi.fn(), createMany: vi.fn() },
      vehicle: { deleteMany: vi.fn(), upsert: vi.fn() },
      $transaction: vi.fn(async (callback: (tx: any) => any) => callback(prisma)),
    };
    service = new UsersService(prisma);
  });

  describe('getOrCreateMe', () => {
    it('cria ou atualiza o usuário com os dados do Keycloak', async () => {
      prisma.user.upsert.mockResolvedValue(me);
      await expect(service.getOrCreateMe(user)).resolves.toEqual(me);
      expect(prisma.user.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { keycloakId: user.userId },
        create: { keycloakId: user.userId, name: user.name, email: user.email, role: user.role },
        update: { name: user.name, email: user.email, role: user.role },
      }));
    });

    it('usa valores padrão quando nome e email não existem', async () => {
      prisma.user.upsert.mockResolvedValue(me);
      await service.getOrCreateMe({ ...user, name: undefined, email: undefined });
      expect(prisma.user.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({ name: 'Sem nome', email: '' }),
      }));
    });
  });

  describe('resolveUserId', () => {
    it('retorna o ID quando o usuário já existe', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-123' });
      await expect(service.resolveUserId(user)).resolves.toBe('user-123');
      expect(prisma.user.upsert).not.toHaveBeenCalled();
    });

    it('cria o usuário quando ele ainda não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.upsert.mockResolvedValue({ id: 'new-user-123' });
      await expect(service.resolveUserId(user)).resolves.toBe('new-user-123');
      expect(prisma.user.upsert).toHaveBeenCalled();
    });
  });

  describe('updateMe', () => {
    beforeEach(() => prisma.user.upsert.mockResolvedValue(me));

    it('atualiza a data de nascimento', async () => {
      await service.updateMe(user, { birthDate: '2000-01-01' } as any);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: me.id }, data: { birthDate: new Date('2000-01-01') },
      });
    });

    it('permite remover a data de nascimento', async () => {
      await service.updateMe(user, { birthDate: null } as any);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: me.id }, data: { birthDate: null },
      });
    });

    it('substitui os links existentes', async () => {
      const links = [{ label: 'GitHub', url: 'https://github.com/ana' }];
      await service.updateMe(user, { links } as any);
      expect(prisma.profileLink.deleteMany).toHaveBeenCalledWith({ where: { userId: me.id } });
      expect(prisma.profileLink.createMany).toHaveBeenCalledWith({
        data: [{ ...links[0], userId: me.id }],
      });
    });

    it('substitui experiências e atribui posições', async () => {
      const experiences = [{ description: 'Experiência 1' }, { description: 'Experiência 2' }];
      await service.updateMe(user, { experiences } as any);
      expect(prisma.experience.createMany).toHaveBeenCalledWith({ data: [
        { description: 'Experiência 1', position: 0, userId: me.id },
        { description: 'Experiência 2', position: 1, userId: me.id },
      ] });
    });

    it('substitui os projetos existentes', async () => {
      const projects = [{ name: 'Projeto', description: 'Descrição', url: 'https://example.com' }];
      await service.updateMe(user, { projects } as any);
      expect(prisma.project.deleteMany).toHaveBeenCalledWith({ where: { userId: me.id } });
      expect(prisma.project.createMany).toHaveBeenCalledWith({
        data: [{ ...projects[0], userId: me.id }],
      });
    });

    it('normaliza placas dos veículos', async () => {
      await service.updateMe(user, { vehicles: [{ plate: 'abc-1234', model: 'Carro', color: 'Azul' }] } as any);
      expect(prisma.vehicle.upsert).toHaveBeenCalledWith({
        where: { plate: 'ABC1234' },
        create: { plate: 'ABC1234', model: 'Carro', color: 'Azul', userId: me.id },
        update: { model: 'Carro', color: 'Azul' },
      });
    });

    it('remove veículos que não estão mais na lista', async () => {
      await service.updateMe(user, { vehicles: [{ plate: 'ABC1234', model: 'Carro', color: 'Azul' }] } as any);
      expect(prisma.vehicle.deleteMany).toHaveBeenCalledWith({
        where: { userId: me.id, plate: { notIn: ['ABC1234'] } },
      });
    });

    it('lança ConflictException quando existem placas repetidas', async () => {
      await expect(service.updateMe(user, { vehicles: [
        { plate: 'ABC-1234', model: 'Carro 1', color: 'Azul' },
        { plate: 'ABC1234', model: 'Carro 2', color: 'Vermelho' },
      ] } as any)).rejects.toThrow(ConflictException);
    });

    it('executa as alterações dentro de uma transação', async () => {
      await service.updateMe(user, {} as any);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('retorna lista vazia quando o termo está vazio', async () => {
      await expect(service.search('   ')).resolves.toEqual([]);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('busca usuários pelo nome ou email', async () => {
      prisma.user.findMany.mockResolvedValue([me]);
      await expect(service.search('Ana')).resolves.toEqual([me]);
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { OR: [
          { name: { contains: 'Ana', mode: 'insensitive' } },
          { email: { contains: 'Ana', mode: 'insensitive' } },
        ] },
        take: 10,
      }));
    });

    it('limita o termo de pesquisa a 60 caracteres', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await service.search('a'.repeat(100));
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { OR: [
          { name: { contains: 'a'.repeat(60), mode: 'insensitive' } },
          { email: { contains: 'a'.repeat(60), mode: 'insensitive' } },
        ] },
      }));
    });
  });

  describe('findPublicProfile', () => {
    it('retorna o perfil público encontrado', async () => {
      prisma.user.findFirst.mockResolvedValue(me);
      await expect(service.findPublicProfile('ana@test.com')).resolves.toEqual(me);
      expect(prisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { email: { equals: 'ana@test.com', mode: 'insensitive' } },
      }));
    });

    it('lança ResourceNotFoundException quando o usuário não existe', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.findPublicProfile('inexistente@test.com')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('buildResumePdf', () => {
    it('gera PDF utilizando o perfil do usuário atual', async () => {
      prisma.user.upsert.mockResolvedValue(me);
      const result = await service.buildResumePdf('me', user);
      expect(result).toBeInstanceOf(Buffer);
      expect(prisma.user.upsert).toHaveBeenCalled();
    });

    it('gera PDF utilizando um perfil público', async () => {
      prisma.user.findFirst.mockResolvedValue(me);
      const result = await service.buildResumePdf('ana@test.com', user);
      expect(result).toBeInstanceOf(Buffer);
      expect(prisma.user.findFirst).toHaveBeenCalled();
    });
  });

  describe('updateAvatar', () => {
    const file: any = { path: '/tmp/upload/temp-file', mimetype: 'image/png' };
    const targetPath = join('/tmp/avatars', 'user-123.png');

    beforeEach(() => {
      prisma.user.upsert.mockResolvedValue(me);
      prisma.user.update.mockResolvedValue({ photoUrl: '/user-area/uploads/avatars/user-123.png' });
      vi.mocked(existsSync).mockReturnValue(false);
    });

    it('atualiza o avatar e retorna a URL da imagem', async () => {
      const result = await service.updateAvatar(user, file);
      expect(renameSync).toHaveBeenCalledWith(file.path, targetPath);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: me.id },
        data: { photoUrl: '/user-area/uploads/avatars/user-123.png' },
        select: { photoUrl: true },
      });
      expect(result.photoUrl).toBe('/user-area/uploads/avatars/user-123.png');
    });

    it('remove avatares antigos com outras extensões', async () => {
      vi.mocked(existsSync).mockImplementation((path: any) => String(path).endsWith('.jpg'));
      await service.updateAvatar(user, file);
      expect(unlinkSync).toHaveBeenCalledWith(join('/tmp/avatars', 'user-123.jpg'));
    });

    it('remove arquivo de destino existente antes de renomear', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      await service.updateAvatar(user, file);
      expect(unlinkSync).toHaveBeenCalledWith(targetPath);
      expect(renameSync).toHaveBeenCalledWith(file.path, targetPath);
    });

    it('não renomeia quando o arquivo já está no destino', async () => {
      await service.updateAvatar(user, { ...file, path: targetPath });
      expect(renameSync).not.toHaveBeenCalled();
    });

    it('utiliza jpg quando o mimetype não é reconhecido', async () => {
      const unknownFile = { ...file, mimetype: 'application/octet-stream' };
      await service.updateAvatar(user, unknownFile);
      expect(renameSync).toHaveBeenCalledWith(unknownFile.path, join('/tmp/avatars', 'user-123.jpg'));
    });
  });
});
