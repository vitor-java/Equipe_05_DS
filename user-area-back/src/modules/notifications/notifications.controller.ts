import { Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { GetCurrentUser } from '@/common/auth/decorators/current-user.decorator';
import { ListNotificationsQueryDto } from './dto/list-notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Notificações do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Lista paginada de notificações' })
  list(@Query() query: ListNotificationsQueryDto, @GetCurrentUser() user: CurrentUser) {
    return this.notificationsService.list(user, query);
  }

  @Get('me/unread-count')
  @ApiOperation({ summary: 'Quantidade de notificações não lidas' })
  @ApiResponse({ status: 200, description: 'Contagem de notificações não lidas' })
  unreadCount(@GetCurrentUser() user: CurrentUser) {
    return this.notificationsService.unreadCount(user);
  }

  @Patch('me/read-all')
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  @ApiResponse({ status: 200, description: 'Quantidade de notificações atualizadas' })
  markAllAsRead(@GetCurrentUser() user: CurrentUser) {
    return this.notificationsService.markAllAsRead(user);
  }

  @Patch('me/:id/read')
  @ApiOperation({ summary: 'Confirmar a leitura de uma notificação específica' })
  @ApiResponse({ status: 200, description: 'Notificação marcada como lida' })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  markAsRead(@Param('id', ParseUUIDPipe) id: string, @GetCurrentUser() user: CurrentUser) {
    return this.notificationsService.markAsRead(user, id);
  }
}
