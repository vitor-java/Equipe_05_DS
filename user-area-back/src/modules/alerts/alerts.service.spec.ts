import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AccessRole } from '@/common/auth/access-role.enum';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import {
  PaginationQueryDto,
  PaginationQuerySchema,
} from '@/common/pagination/pagination-query.dto';
import { PrismaService } from '@/database/prisma.service';
import { UsersService } from '../users/users.service';
import { AlertsService } from './alerts.service';
import type { CreateAlertDto } from './dto/create-alert.dto';

type Mock = ReturnType<typeof vi.fn>;

describe('AlertsService', () => {
  let service: AlertsService;
  let prisma: {
    $transaction: Mock;
    alert: {
      create: Mock;
      findMany: Mock;
      count: Mock;
      findUnique: Mock;
      delete: Mock;
    };
    alertRecipient: { groupBy: Mock; deleteMany: Mock };
    user: { count: Mock; findMany: Mock };
  };
  let usersService: { resolveUserId: Mock };

  const ADMIN: CurrentUser = { userId: 'keycloak-admin', role: AccessRole.ADMIN };
  const ADMIN_ID = 'admin-uuid';

  // Monta o corpo de um pedido de criação de alerta. Cada teste muda só o que importa.
  function makeDto(overrides: Record<string, unknown> = {}): CreateAlertDto {
    return {
      audience: 'USERS',
      recipientIds: [],
      severity: 'INFO',
      subject: 'Assunto do alerta',
      message: 'Mensagem do alerta',
      ...overrides,
    } as unknown as CreateAlertDto;
  }

  // Um alerta como o banco devolveria (com quem criou e a contagem de destinatários).
  function makeAlert(overrides: Record<string, unknown> = {}) {
    return {
      id: 'alert-1',
      subject: 'Assunto do alerta',
      message: 'Mensagem do alerta',
      severity: 'HIGH',
      audience: 'USERS',
      createdAt: new Date('2026-11-01T10:00:00Z'),
      createdBy: { id: ADMIN_ID, name: 'Admin' },
      recipients: [],
      _count: { recipients: 0 },
      ...overrides,
    };
  }

  // Passa pelo schema para calcular skip e take de verdade (como na API real).
  function makeQuery() {
    return Object.assign(
      new PaginationQueryDto(),
      PaginationQuerySchema.parse({ page: 1, limit: 20 }),
    );
  }

  beforeEach(async () => {
    prisma = {
      // O service entrega uma lista de consultas; o falso executa todas e devolve os resultados.
      $transaction: vi.fn((operations: unknown[]) => Promise.all(operations)),
      alert: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
      alertRecipient: { groupBy: vi.fn(), deleteMany: vi.fn() },
      user: { count: vi.fn(), findMany: vi.fn() },
    };
    usersService = { resolveUserId: vi.fn().mockResolvedValue(ADMIN_ID) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('cria o alerta com um destinatário para cada usuário selecionado (USERS)', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
      prisma.alert.create.mockResolvedValue(makeAlert({ _count: { recipients: 2 } }));

      const result = await service.create(ADMIN, makeDto({ recipientIds: ['u1', 'u2'] }));

      expect(usersService.resolveUserId).toHaveBeenCalledWith(ADMIN);
      expect(prisma.alert.create).toHaveBeenCalledWith({
        data: {
          subject: 'Assunto do alerta',
          message: 'Mensagem do alerta',
          severity: 'INFO',
          audience: 'USERS',
          createdById: ADMIN_ID,
          recipients: { createMany: { data: [{ userId: 'u1' }, { userId: 'u2' }] } },
        },
        include: { _count: { select: { recipients: true } } },
      });
      expect(result.id).toBe('alert-1');
      expect(result.recipientsCount).toBe(2);
    });

    it('remove IDs repetidos antes de buscar e de criar os destinatários', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
      prisma.alert.create.mockResolvedValue(makeAlert({ _count: { recipients: 2 } }));

      await service.create(ADMIN, makeDto({ recipientIds: ['u1', 'u1', 'u2'] }));

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['u1', 'u2'] } },
        select: { id: true },
      });
      const data = prisma.alert.create.mock.calls[0][0].data;
      expect(data.recipients.createMany.data).toEqual([{ userId: 'u1' }, { userId: 'u2' }]);
    });

    it('lança BadRequestException e não cria nada quando algum destinatário não existe', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]); // u2 não foi encontrado

      await expect(
        service.create(ADMIN, makeDto({ recipientIds: ['u1', 'u2'] })),
      ).rejects.toThrow('Destinatários não encontrados: u2.');
      expect(prisma.alert.create).not.toHaveBeenCalled();
    });

    it('cria sem destinatários quando recipientIds não é informado (USERS)', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.alert.create.mockResolvedValue(makeAlert());

      const result = await service.create(
        ADMIN,
        makeDto({ recipientIds: undefined }),
      );

      const data = prisma.alert.create.mock.calls[0][0].data;
      expect(data).not.toHaveProperty('recipients');
      expect(result.recipientsCount).toBe(0);
    });

    it('envia para todos os estudantes sem criar destinatários um a um (STUDENTS)', async () => {
      prisma.user.count.mockResolvedValue(10);
      prisma.alert.create.mockResolvedValue(makeAlert({ audience: 'STUDENTS' }));

      const result = await service.create(ADMIN, makeDto({ audience: 'STUDENTS' }));

      expect(prisma.user.count).toHaveBeenCalledWith({ where: { role: 'STUDENT' } });
      expect(prisma.user.findMany).not.toHaveBeenCalled();
      const data = prisma.alert.create.mock.calls[0][0].data;
      expect(data).not.toHaveProperty('recipients');
      expect(result.recipientsCount).toBe('Massa / Global');
    });

    it('envia para todos os usuários, sem filtrar por role (ALL)', async () => {
      prisma.user.count.mockResolvedValue(50);
      prisma.alert.create.mockResolvedValue(makeAlert({ audience: 'ALL' }));

      const result = await service.create(ADMIN, makeDto({ audience: 'ALL' }));

      expect(prisma.user.count).toHaveBeenCalledWith({ where: {} });
      expect(result.recipientsCount).toBe('Massa / Global');
    });

    it('lança BadRequestException quando não há nenhum usuário na audiência (STAFF)', async () => {
      prisma.user.count.mockResolvedValue(0);

      await expect(service.create(ADMIN, makeDto({ audience: 'STAFF' }))).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.count).toHaveBeenCalledWith({ where: { role: 'STAFF' } });
      expect(prisma.alert.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('devolve lista vazia e não consulta as leituras quando não há alertas', async () => {
      prisma.alert.findMany.mockResolvedValue([]);
      prisma.alert.count.mockResolvedValue(0);

      const result = await service.findAll(makeQuery());

      expect(prisma.alertRecipient.groupBy).not.toHaveBeenCalled();
      expect(result.items).toEqual([]);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
    });

    it('monta o resumo de alertas USERS com a contagem de leituras (0 quando ninguém leu)', async () => {
      const lidoEm = new Date('2026-11-02T09:00:00Z');
      const ana = { id: 'u1', name: 'Ana', email: 'ana@exemplo.com' };
      prisma.alert.findMany.mockResolvedValue([
        makeAlert({
          id: 'alert-1',
          recipients: [{ readAt: lidoEm, user: ana }],
          _count: { recipients: 1 },
        }),
        makeAlert({ id: 'alert-2', recipients: [], _count: { recipients: 3 } }),
      ]);
      prisma.alert.count.mockResolvedValue(2);
      prisma.alertRecipient.groupBy.mockResolvedValue([
        { alertId: 'alert-1', _count: { _all: 1 } },
      ]);

      const result = await service.findAll(makeQuery());

      expect(prisma.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20, orderBy: { createdAt: 'desc' } }),
      );
      expect(prisma.alertRecipient.groupBy).toHaveBeenCalledWith({
        by: ['alertId'],
        where: { alertId: { in: ['alert-1', 'alert-2'] }, readAt: { not: null } },
        _count: { _all: true },
      });
      // Alerta USERS não consulta a tabela de usuários.
      expect(prisma.user.count).not.toHaveBeenCalled();
      expect(prisma.user.findMany).not.toHaveBeenCalled();

      expect(result.items[0]).toMatchObject({
        id: 'alert-1',
        recipientsCount: 1,
        readCount: 1,
        recipientsPreview: [{ ...ana, readAt: lidoEm }],
      });
      expect(result.items[1]).toMatchObject({
        id: 'alert-2',
        recipientsCount: 3,
        readCount: 0,
        recipientsPreview: [],
      });
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
    });

    it('para audiência STUDENTS sem destinatários, conta os estudantes e monta uma amostra', async () => {
      const ana = { id: 's1', name: 'Ana', email: 'ana@exemplo.com' };
      prisma.alert.findMany.mockResolvedValue([
        makeAlert({ id: 'alert-3', audience: 'STUDENTS', recipients: [] }),
      ]);
      prisma.alert.count.mockResolvedValue(1);
      prisma.alertRecipient.groupBy.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(40);
      prisma.user.findMany.mockResolvedValue([ana]);

      const result = await service.findAll(makeQuery());

      expect(prisma.user.count).toHaveBeenCalledWith({ where: { role: 'STUDENT' } });
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'STUDENT' },
        take: 5,
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      });
      expect(result.items[0].recipientsCount).toBe(40);
      expect(result.items[0].recipientsPreview).toEqual([{ ...ana, readAt: null }]);
    });

    it('para audiência ALL sem destinatários, não filtra por role', async () => {
      prisma.alert.findMany.mockResolvedValue([
        makeAlert({ id: 'alert-4', audience: 'ALL', recipients: [] }),
      ]);
      prisma.alert.count.mockResolvedValue(1);
      prisma.alertRecipient.groupBy.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(100);
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.findAll(makeQuery());

      expect(prisma.user.count).toHaveBeenCalledWith({ where: {} });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
      expect(result.items[0].recipientsCount).toBe(100);
      expect(result.items[0].recipientsPreview).toEqual([]);
    });

    it('para audiência coletiva que já tem destinatários, mantém a prévia e não busca amostra', async () => {
      const lidoEm = new Date('2026-11-03T09:00:00Z');
      const bia = { id: 'f1', name: 'Bia', email: 'bia@exemplo.com' };
      prisma.alert.findMany.mockResolvedValue([
        makeAlert({
          id: 'alert-5',
          audience: 'STAFF',
          recipients: [{ readAt: lidoEm, user: bia }],
        }),
      ]);
      prisma.alert.count.mockResolvedValue(1);
      prisma.alertRecipient.groupBy.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(7);

      const result = await service.findAll(makeQuery());

      expect(prisma.user.count).toHaveBeenCalledWith({ where: { role: 'STAFF' } });
      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(result.items[0].recipientsCount).toBe(7);
      expect(result.items[0].recipientsPreview).toEqual([{ ...bia, readAt: lidoEm }]);
    });
  });

  describe('findOne', () => {
    it('lança ResourceNotFoundException quando o alerta não existe', async () => {
      prisma.alert.findUnique.mockResolvedValue(null);

      await expect(service.findOne('alert-x')).rejects.toThrow(ResourceNotFoundException);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('devolve os destinatários do alerta USERS e conta quantos já leram', async () => {
      const lidoEm = new Date('2026-11-02T09:00:00Z');
      const ana = { id: 'u1', name: 'Ana', email: 'ana@exemplo.com' };
      const caio = { id: 'u2', name: 'Caio', email: 'caio@exemplo.com' };
      prisma.alert.findUnique.mockResolvedValue(
        makeAlert({
          recipients: [
            { readAt: lidoEm, user: ana },
            { readAt: null, user: caio },
          ],
        }),
      );

      const result = await service.findOne('alert-1');

      expect(prisma.alert.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'alert-1' } }),
      );
      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(result.recipientsCount).toBe(2);
      expect(result.readCount).toBe(1);
      expect(result.recipients).toEqual([
        { ...ana, readAt: lidoEm },
        { ...caio, readAt: null },
      ]);
      expect(result.createdBy).toEqual({ id: ADMIN_ID, name: 'Admin' });
    });

    it('para audiência STAFF, lista todos os funcionários como destinatários não lidos', async () => {
      const bia = { id: 'f1', name: 'Bia', email: 'bia@exemplo.com' };
      const davi = { id: 'f2', name: 'Davi', email: 'davi@exemplo.com' };
      prisma.alert.findUnique.mockResolvedValue(makeAlert({ audience: 'STAFF', recipients: [] }));
      prisma.user.findMany.mockResolvedValue([bia, davi]);

      const result = await service.findOne('alert-1');

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'STAFF' },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      });
      expect(result.recipientsCount).toBe(2);
      expect(result.readCount).toBe(0);
      expect(result.recipients).toEqual([
        { ...bia, readAt: null },
        { ...davi, readAt: null },
      ]);
    });

    it('para audiência ALL, lista os usuários sem filtrar por role', async () => {
      prisma.alert.findUnique.mockResolvedValue(makeAlert({ audience: 'ALL', recipients: [] }));
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.findOne('alert-1');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
      expect(result.recipientsCount).toBe(0);
      expect(result.recipients).toEqual([]);
    });
  });

  describe('searchRecipients', () => {
    it('busca por nome, e-mail, placa e modelo, normalizando o termo', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.searchRecipients('  abc-1234 ');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'abc-1234', mode: 'insensitive' } },
              { email: { contains: 'abc-1234', mode: 'insensitive' } },
              { vehicles: { some: { plate: { contains: 'ABC1234' } } } },
              { vehicles: { some: { model: { contains: 'abc-1234', mode: 'insensitive' } } } },
            ],
          },
          orderBy: { name: 'asc' },
          take: 5,
        }),
      );
    });

    it('não aplica filtro quando o termo é vazio ou só espaços', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.searchRecipients('   ');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, take: 5 }),
      );
    });
  });

  describe('remove', () => {
    it('lança ResourceNotFoundException e não apaga nada quando o alerta não existe', async () => {
      prisma.alert.findUnique.mockResolvedValue(null);

      await expect(service.remove('alert-x')).rejects.toThrow(ResourceNotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('apaga os destinatários e o alerta juntos, numa transação', async () => {
      prisma.alert.findUnique.mockResolvedValue({ id: 'alert-1' });

      const result = await service.remove('alert-1');

      expect(prisma.alertRecipient.deleteMany).toHaveBeenCalledWith({
        where: { alertId: 'alert-1' },
      });
      expect(prisma.alert.delete).toHaveBeenCalledWith({ where: { id: 'alert-1' } });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 'alert-1', deleted: true });
    });
  });

  // ------------------------------------------- resolveRecipientIds (privado)
  // O ramo de audiência coletiva deste método privado não é alcançado por create(),
  // que só o chama quando audience === 'USERS'. Por isso o chamamos direto.
  describe('resolveRecipientIds (audiência coletiva)', () => {
    it('devolve os IDs dos usuários do papel da audiência', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

      const ids = await service['resolveRecipientIds'](makeDto({ audience: 'STUDENTS' }));

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'STUDENT' },
        select: { id: true },
      });
      expect(ids).toEqual(['a', 'b']);
    });

    it('não filtra por role quando a audiência é ALL', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'a' }]);

      const ids = await service['resolveRecipientIds'](makeDto({ audience: 'ALL' }));

      expect(prisma.user.findMany).toHaveBeenCalledWith({ where: {}, select: { id: true } });
      expect(ids).toEqual(['a']);
    });

    it('lança BadRequestException quando não há usuários na audiência', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await expect(
        service['resolveRecipientIds'](makeDto({ audience: 'STAFF' })),
      ).rejects.toThrow(BadRequestException);
    });
  });
});