import { Injectable } from '@nestjs/common';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Busca o perfil do usuário pós-login e cria no primeiro acesso. */ 
  async getOrCreateMe(user: CurrentUser) {
    return this.prisma.user.upsert({
      where: { keycloakId: user.userId },
      create: {
        keycloakId: user.userId,
        name: user.name ?? 'Sem nome',
        email: user.email ?? '',
        role: user.role,
      },
      // Permanece se baseando no keycloak.
      update: {
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        role: user.role,
      },
      include: { links: true, experiences: true, projects: true, vehicles: true },
    });
  }
}