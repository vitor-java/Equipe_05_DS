import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessRole } from '@/common/auth/access-role.enum';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { GetCurrentUser } from '@/common/auth/decorators/current-user.decorator';
import { Roles } from '@/common/auth/decorators/roles.decorator';
import { PaginationQueryDto } from '@/common/pagination/pagination-query.dto';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { SearchRecipientsDto } from './dto/search-recipients.dto';

// Sistema de envio de alertas que só a adminstração pode ter acesso.

@ApiTags('Alerts')
@ApiBearerAuth()
@Roles(AccessRole.ADMIN)
@Controller({ path: 'alerts', version: '1' })
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}
  

  @Post()
  @ApiOperation({ summary: 'Emitir um alerta (apenas admin)' })
  @ApiResponse({ status: 201, description: 'Alerta emitido' })
  @ApiResponse({ status: 400, description: 'Destinatários inexistentes ou audiência vazia' })
  @ApiResponse({ status: 403, description: 'Apenas administradores podem emitir alertas' })
  @ApiResponse({ status: 422, description: 'Dados inválidos' })
  create(@Body() dto: CreateAlertDto, @GetCurrentUser() user: CurrentUser) {
    return this.alertsService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Histórico de alertas enviados (apenas admin)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de alertas' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.alertsService.findAll(query);
  }

  // Aparece antes para evitar que "recipients" seja lido como um ID.
  @Get('recipients')
  @ApiOperation({
    summary: 'Buscar destinatários por nome, e-mail, placa ou modelo (apenas admin)',
  })
  @ApiResponse({ status: 200, description: 'Até 10 usuários, com seus veículos' })
  searchRecipients(@Query() query: SearchRecipientsDto) {
    return this.alertsService.searchRecipients(query.q);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalhe de um alerta com a leitura de cada destinatário (apenas admin)',
  })
  @ApiResponse({ status: 200, description: 'Alerta encontrado' })
  @ApiResponse({ status: 404, description: 'Alerta não encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.findOne(id);
  }
}
