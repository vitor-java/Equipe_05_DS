import { Injectable } from '@nestjs/common';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { PaginatedResponseDto } from '@/common/pagination/paginated-response.dto';
import { PrismaService } from '@/database/prisma.service';
import { UsersService } from '../users/users.service';
import type { ListNotificationsQueryDto } from './dto/list-notifications.dto';

const ALERT_FIELDS = {
  id: true,
  subject: true,
  message: true,
  severity: true,
  createdAt: true,
} as const;

interface NotificationRow {
  id: string;
  readAt: Date | null;
  alert: {
    id: string;
    subject: string;
    message: string;
    severity: string;
    createdAt: Date;
  };
}

// ID é o id da notificação (usado em "marcar como lido"), e não o do alerta.
function toNotification(row: NotificationRow) {
  return {
    id: row.id,
    alertId: row.alert.id,
    subject: row.alert.subject,
    message: row.alert.message,
    severity: row.alert.severity,
    createdAt: row.alert.createdAt,
    readAt: row.readAt,
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  // Notificações do usuário autenticado, ordenado pela data (mais recente até a mais antiga).
  async list(user: CurrentUser, query: ListNotificationsQueryDto) {
    const userId = await this.usersService.resolveUserId(user);
    const where = { userId, ...(query.unreadOnly === 'true' ? { readAt: null } : {}) };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.alertRecipient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: { alert: { select: ALERT_FIELDS } },
      }),
      this.prisma.alertRecipient.count({ where }),
    ]);

    return PaginatedResponseDto.of(rows.map(toNotification), total, query);
  }

  // Quantidade de notificações não lidas (para a bolinha do sininho).
  async unreadCount(user: CurrentUser) {
    const userId = await this.usersService.resolveUserId(user);
    const count = await this.prisma.alertRecipient.count({ where: { userId, readAt: null } });
    return { count };
  }

  // Confirma a leitura. A data da primeira leitura é preservada.
  async markAsRead(user: CurrentUser, notificationId: string) {
    const userId = await this.usersService.resolveUserId(user);

    // Para filtrar pelo dono. Ninguém pode ler a notificação de outro usuário.
    const notification = await this.prisma.alertRecipient.findFirst({
      where: { id: notificationId, userId },
      include: { alert: { select: ALERT_FIELDS } },
    });

    if (!notification) {
      throw new ResourceNotFoundException('Notificação', notificationId);
    }
    if (notification.readAt) {
      return toNotification(notification);
    }

    const updated = await this.prisma.alertRecipient.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
      include: { alert: { select: ALERT_FIELDS } },
    });
    return toNotification(updated);
  }

  // Marca todas as notificações pendentes como lidas.
  async markAllAsRead(user: CurrentUser) {
    const userId = await this.usersService.resolveUserId(user);
    const { count } = await this.prisma.alertRecipient.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: count };
  }
}
