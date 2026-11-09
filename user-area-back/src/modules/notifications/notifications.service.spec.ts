import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { AccessRole } from '@/common/auth/access-role.enum';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { PrismaService } from '@/database/prisma.service';
import { UsersService } from '../users/users.service';
import {ListNotificationsQueryDto,ListNotificationsQuerySchema,} from './dto/list-notifications.dto';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    alertRecipient: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let usersService: { resolveUserId: ReturnType<typeof vi.fn> };

  const user: CurrentUser = { userId: 'keycloak-1', role: AccessRole.STUDENT };
  const USER_ID = 'user-uuid-1';
  const NOTIFICATION_ID = 'notif-uuid-1';

  // Uma linha como o banco devolve: a notificação com o alerta dentro.
  function makeRow(readAt: Date | null = null) {
    return {
      id: NOTIFICATION_ID,
      readAt,
      alert: {
        id: 'alert-uuid-1',
        subject: 'Alerta de teste',
        message: 'Mensagem do alerta',
        severity: 'HIGH',
        createdAt: new Date('2026-11-01T10:00:00Z'),
      },
    };
  }

  // Cria a query passando pelo schema, para calcular skip e take de verdade.
  function makeQuery(input: { page?: number; limit?: number; unreadOnly?: 'true' | 'false' } = {}) {
    return Object.assign(
      new ListNotificationsQueryDto(),
      ListNotificationsQuerySchema.parse({ page: 1, limit: 20, ...input }),
    );
  }

  beforeEach(async () => {
    prisma = {
      // O service passa uma lista de consultas; o falso as executa e devolve os resultados.
      $transaction: vi.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
      alertRecipient: {
        findMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };
    usersService = { resolveUserId: vi.fn().mockResolvedValue(USER_ID) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('filtra só as não lidas quando unreadOnly é "true"', async () => {
      prisma.alertRecipient.findMany.mockResolvedValue([makeRow()]);
      prisma.alertRecipient.count.mockResolvedValue(1);

      await service.list(user, makeQuery({ unreadOnly: 'true' }));

      expect(prisma.alertRecipient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID, readAt: null } }),
      );
      expect(prisma.alertRecipient.count).toHaveBeenCalledWith({
        where: { userId: USER_ID, readAt: null },
      });
    });

    it('traz todas as notificações quando unreadOnly não é informado', async () => {
      const row = makeRow(new Date('2026-11-02T10:00:00Z'));
      prisma.alertRecipient.findMany.mockResolvedValue([row]);
      prisma.alertRecipient.count.mockResolvedValue(1);

      const result = await service.list(user, makeQuery());

      expect(prisma.alertRecipient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID }, skip: 0, take: 20 }),
      );
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
      expect(result.items).toEqual([
        {
          id: NOTIFICATION_ID,
          alertId: 'alert-uuid-1',
          subject: 'Alerta de teste',
          message: 'Mensagem do alerta',
          severity: 'HIGH',
          createdAt: row.alert.createdAt,
          readAt: row.readAt,
        },
      ]);
    });
  });

  describe('unreadCount', () => {
    it('devolve a quantidade de notificações não lidas do usuário', async () => {
      prisma.alertRecipient.count.mockResolvedValue(3);

      const result = await service.unreadCount(user);

      expect(usersService.resolveUserId).toHaveBeenCalledWith(user);
      expect(prisma.alertRecipient.count).toHaveBeenCalledWith({
        where: { userId: USER_ID, readAt: null },
      });
      expect(result).toEqual({ count: 3 });
    });
  });

  describe('markAsRead', () => {
    it('lança ResourceNotFoundException quando a notificação não existe ou é de outro usuário', async () => {
      prisma.alertRecipient.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead(user, NOTIFICATION_ID)).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(prisma.alertRecipient.update).not.toHaveBeenCalled();
    });

    it('não atualiza de novo quando a notificação já estava lida', async () => {
      const alreadyRead = makeRow(new Date('2026-11-02T10:00:00Z'));
      prisma.alertRecipient.findFirst.mockResolvedValue(alreadyRead);

      const result = await service.markAsRead(user, NOTIFICATION_ID);

      expect(prisma.alertRecipient.update).not.toHaveBeenCalled();
      expect(result.readAt).toEqual(alreadyRead.readAt); // a data da primeira leitura é preservada
    });

    it('marca como lida quando ainda não tinha sido lida', async () => {
      const readNow = new Date('2026-11-07T12:00:00Z');
      prisma.alertRecipient.findFirst.mockResolvedValue(makeRow(null));
      prisma.alertRecipient.update.mockResolvedValue(makeRow(readNow));

      const result = await service.markAsRead(user, NOTIFICATION_ID);

      expect(prisma.alertRecipient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: NOTIFICATION_ID },
          data: { readAt: expect.any(Date) },
        }),
      );
      expect(result.readAt).toEqual(readNow);
    });
  });

  describe('markAllAsRead', () => {
    it('marca todas as pendentes como lidas e devolve quantas foram atualizadas', async () => {
      prisma.alertRecipient.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead(user);

      expect(prisma.alertRecipient.updateMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, readAt: null },
        data: { readAt: expect.any(Date) },
      });
      expect(result).toEqual({ updated: 5 });
    });
  });
});