import { ConflictException, Injectable } from '@nestjs/common';
import type { CurrentUser } from '@/common/auth/current-user.interface';
import { PrismaService } from '@/database/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import PDFDocument = require('pdfkit');
import { renameSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { avatarDirectory, imageExtensions } from './users.controller';



const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  STUDENT: 'Aluno',
  STAFF: 'Servidor',
};

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

  async resolveUserId(user: CurrentUser): Promise<string> {
    const existing = await this.prisma.user.findUnique({
      where: { keycloakId: user.userId },
      select: { id: true },
    });
    if (existing) {
      return existing.id;
    }

    const created = await this.prisma.user.upsert({
      ...this.syncFromToken(user),
      select: { id: true },
    });
    return created.id;
  }

  private syncFromToken(user: CurrentUser) {
    return {
      where: { keycloakId: user.userId },
      create: {
        keycloakId: user.userId,
        name: user.name ?? 'Sem nome',
        email: user.email ?? '',
        role: user.role,
      },
      update: {
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        role: user.role,
      },
    };
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

  async search(q?: string) {
    const term = (q ?? '').trim().slice(0, 60);
    if (!term) return [];

    return this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
      take: 10,
    });
  }

  async findPublicProfile(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        links: { select: { id: true, label: true, url: true } },
        experiences: { select: { id: true, description: true, position: true }, orderBy: { position: 'asc' } },
        projects: { select: { id: true, name: true, description: true, url: true } },
      },
    });

    if (!user) {
      throw new ResourceNotFoundException('Usuário', email);
    }
    return user;
  }

  async buildResumePdf(emailParam: string, currentUser: CurrentUser): Promise<Buffer> {
    let me;

    if (emailParam === 'me') {
      me = await this.getOrCreateMe(currentUser);
    } else {
      me = await this.findPublicProfile(emailParam);
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    const bufferPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));
    });
    

    doc.fontSize(22).fillColor('#b91c1c').text(me.name);
    doc.fontSize(11).fillColor('#4b5563').text(me.email);
    doc.text((ROLE_LABELS[me.role] ?? me.role) + " — Centro de Informática - UFPE");

    this.pdfSection(
      doc,
      'Links',
      me.links.map((l) => `${l.label}: ${l.url}`),
    );

    this.pdfSection(
      doc,
      'Experiências',
      [...me.experiences]
        .sort((a, b) => a.position - b.position)
        .map((e) => e.description),
    );

    this.pdfSection(
      doc,
      'Projetos',
      me.projects.map((p) => {
        const parts = [p.name];
        if (p.description) parts.push(p.description);
        if (p.url) parts.push(p.url);
        return parts.join(' — ');
      }),
    );

    doc.end();

    return await bufferPromise;
  }

  private pdfSection(doc: PDFKit.PDFDocument, title: string, lines: string[]) {
    if (lines.length === 0) return;

    doc.moveDown(1.2);
    doc.fontSize(14).fillColor('#111827').text(title);
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#374151');
    for (const line of lines) {
      doc.text(`• ${line}`);
    }
  }

  async updateAvatar(user: CurrentUser, file: Express.Multer.File) {
    const me = await this.getOrCreateMe(user);

    const ext = imageExtensions[file.mimetype] || '.jpg';

    const fileName = `${me.id}${ext}`;
    const targetPath = join(avatarDirectory, fileName);

    ['.jpg', '.png', '.webp'].forEach((possibleExt) => {
      const oldPath = join(avatarDirectory, `${me.id}${possibleExt}`);
      if (possibleExt !== ext && existsSync(oldPath)) {
        try { unlinkSync(oldPath); } catch (e) { }
      }
    });

    if (file.path !== targetPath) {
      if (existsSync(targetPath)) {
        try { unlinkSync(targetPath); } catch (e) { }
      }
      renameSync(file.path, targetPath);
    }

    const photoUrl = `/user-area/uploads/avatars/${fileName}`;

    return this.prisma.user.update({
      where: { id: me.id },
      data: { photoUrl },
      select: { photoUrl: true },
    });
  }
}
