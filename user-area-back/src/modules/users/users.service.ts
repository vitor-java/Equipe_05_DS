import { ConflictException, Injectable } from '@nestjs/common';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { PrismaService } from '@/database/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';


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

  async updateMe(user: CurrentUser, dto: UpdateProfileDto) {
    const me = await this.getOrCreateMe(user);

    await this.prisma.$transaction(async (tx) => {
      if (dto.birthDate !== undefined) {
        await tx.user.update({
          where: { id: me.id },
          data: { birthDate: dto.birthDate === null ? null : new Date(dto.birthDate) },
        });
      }

      // OBS: cada lista que for enviada substitui completamente a anterior/atual
      if (dto.links) {
        await tx.profileLink.deleteMany({ where: { userId: me.id } });
        await tx.profileLink.createMany({
          data: dto.links.map((l) => ({ ...l, userId: me.id })),
        });
      }
      if (dto.experiences) {
        await tx.experience.deleteMany({ where: { userId: me.id } });
        await tx.experience.createMany({
          data: dto.experiences.map((e, position) => ({ ...e, position, userId: me.id })),
        });
      }
      if (dto.projects) {
        await tx.project.deleteMany({ where: { userId: me.id } });
        await tx.project.createMany({
          data: dto.projects.map((p) => ({ ...p, userId: me.id })),
        });
      }
      if (dto.vehicles) {
        const vehicles = dto.vehicles.map((v) => ({
          ...v,
          plate: v.plate.toUpperCase().replace('-', ''),
        }));
        const plates = vehicles.map((v) => v.plate);

        if (new Set(plates).size !== plates.length) {
          throw new ConflictException('Placas repetidas na lista de veiculos');
        }

        // // Considerando que qualquer pessoa pode registrar veiculo, essa parte
        // // não será adicionada sem antes consultar o cliente.
        //
        // const takenByOther = await tx.vehicle.findFirst({
        //   where: { plate: { in: plates }, userId: { not: me.id } },
        // });
        //
        // if (takenByOther) {
        //    throw new ConflictException('Placa já cadastrada por outro usuário');
        // }

        await tx.vehicle.deleteMany({
          where: { userId: me.id, plate: { notIn: plates } },
        });

        for (const v of vehicles) {
          await tx.vehicle.upsert({
            where: { plate: v.plate },
            create: { ...v, userId: me.id },
            update: { model: v.model, color: v.color },
          });
        }
      }
    });

    return this.getOrCreateMe(user);
  }
  
}