import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { GetCurrentUser } from '@/common/auth/decorators/current-user.decorator';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil do usuário autenticado (cria no primeiro acesso)' })
  @ApiResponse({ status: 200, description: 'Perfil retornado' })
  getMe(@GetCurrentUser() user: CurrentUser) {
    return this.usersService.getOrCreateMe(user);
  }
}