import { BadRequestException, Injectable } from '@nestjs/common';
import type { UserRole } from '@prisma/client';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { PaginatedResponseDto } from '@/common/pagination/paginated-response.dto';
import type { PaginationQueryDto } from '@/common/pagination/pagination-query.dto';
import { PrismaService } from '@/database/prisma.service';
import { UsersService } from '../users/users.service';
import type { CreateAlertDto } from './dto/create-alert.dto';

/** Quantos destinatários aparecem no resumo de cada alerta do histórico. */
const RECIPIENTS_PREVIEW_SIZE = 5;
/** Máximo de resultados no autocomplete de destinatários. */
const RECIPIENT_SEARCH_LIMIT = 10;

/** Audiência coletiva → role dos destinatários (`undefined` = todos os usuários). */
const AUDIENCE_TO_ROLE: Record<'ALL' | 'STUDENTS' | 'STAFF', UserRole | undefined> = {
  ALL: undefined,
  STUDENTS: 'STUDENT',
  STAFF: 'STAFF',
};

const USER_SUMMARY = { id: true, name: true, email: true } as const;

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  /** Emite um alerta: cria o alerta e uma notificação pendente para cada destinatário. */
  async create(admin: CurrentUser, dto: CreateAlertDto) {
    const createdById = await this.usersService.resolveUserId(admin);
    const recipientIds = await this.resolveRecipientIds(dto);

    const alert = await this.prisma.alert.create({
      data: {
        subject: dto.subject,
        message: dto.message,
        severity: dto.severity,
        audience: dto.audience,
        createdById,
        recipients: { createMany: { data: recipientIds.map((userId) => ({ userId })) } },
      },
      include: { _count: { select: { recipients: true } } },
    });

    return {
      id: alert.id,
      subject: alert.subject,
      message: alert.message,
      severity: alert.severity,
      audience: alert.audience,
      createdAt: alert.createdAt,
      recipientsCount: alert._count.recipients,
    };
  }

  /** Histórico de alertas enviados, do mais recente para o mais antigo. */
  async findAll(query: PaginationQueryDto) {
    const [alerts, total] = await this.prisma.$transaction([
      this.prisma.alert.findMany({
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: {
          createdBy: { select: { id: true, name: true } },
          recipients: {
            take: RECIPIENTS_PREVIEW_SIZE,
            orderBy: { createdAt: 'asc' },
            include: { user: { select: USER_SUMMARY } },
          },
          _count: { select: { recipients: true } },
        },
      }),
      this.prisma.alert.count(),
    ]);

    const readCounts =
      alerts.length === 0
        ? []
        : await this.prisma.alertRecipient.groupBy({
            by: ['alertId'],
            where: { alertId: { in: alerts.map((a) => a.id) }, readAt: { not: null } },
            _count: { _all: true },
          });
    const readByAlert = new Map(readCounts.map((row) => [row.alertId, row._count._all]));

    const items = alerts.map((alert) => ({
      id: alert.id,
      subject: alert.subject,
      message: alert.message,
      severity: alert.severity,
      audience: alert.audience,
      createdAt: alert.createdAt,
      createdBy: alert.createdBy,
      recipientsCount: alert._count.recipients,
      readCount: readByAlert.get(alert.id) ?? 0,
      recipientsPreview: alert.recipients.map((r) => ({ ...r.user, readAt: r.readAt })),
    }));

    return PaginatedResponseDto.of(items, total, query);
  }

  /** Detalhe de um alerta, com todos os destinatários e a data de leitura de cada um. */
  async findOne(id: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        recipients: {
          orderBy: { user: { name: 'asc' } },
          include: { user: { select: USER_SUMMARY } },
        },
      },
    });

    if (!alert) {
      throw new ResourceNotFoundException('Alerta', id);
    }

    return {
      id: alert.id,
      subject: alert.subject,
      message: alert.message,
      severity: alert.severity,
      audience: alert.audience,
      createdAt: alert.createdAt,
      createdBy: alert.createdBy,
      recipientsCount: alert.recipients.length,
      readCount: alert.recipients.filter((r) => r.readAt !== null).length,
      recipients: alert.recipients.map((r) => ({ ...r.user, readAt: r.readAt })),
    };
  }

  /** Autocomplete de destinatários: por nome, e-mail, placa ou modelo do veículo. */
  async searchRecipients(q: string) {
    const term = q.trim();
    const plate = term.toUpperCase().replace('-', '');

    return this.prisma.user.findMany({
      where: term
        ? {
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
              { vehicles: { some: { plate: { contains: plate } } } },
              { vehicles: { some: { model: { contains: term, mode: 'insensitive' } } } },
            ],
          }
        : {},
      orderBy: { name: 'asc' },
      take: RECIPIENT_SEARCH_LIMIT,
      select: {
        ...USER_SUMMARY,
        role: true,
        vehicles: { select: { plate: true, model: true, color: true } },
      },
    });
  }

  private async resolveRecipientIds(dto: CreateAlertDto): Promise<string[]> {
    if (dto.audience === 'USERS') {
      const ids = [...new Set(dto.recipientIds ?? [])];
      const found = await this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true },
      });

      if (found.length !== ids.length) {
        const foundIds = new Set(found.map((u) => u.id));
        const missing = ids.filter((id) => !foundIds.has(id));
        throw new BadRequestException(`Destinatários não encontrados: ${missing.join(', ')}.`);
      }
      return ids;
    }

    const role = AUDIENCE_TO_ROLE[dto.audience];
    const users = await this.prisma.user.findMany({
      where: role ? { role } : {},
      select: { id: true },
    });

    if (users.length === 0) {
      throw new BadRequestException('Nenhum usuário encontrado para a audiência selecionada.');
    }
    return users.map((u) => u.id);
  }
}
