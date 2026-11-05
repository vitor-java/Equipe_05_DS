import {Body, Controller, Get, Header, Param, Patch, Query, StreamableFile, Post, UploadedFile, 
  UseInterceptors, BadRequestException, } from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetCurrentUser } from '@/common/auth/decorators/current-user.decorator';
import { CurrentUser } from '@/common/auth/current-user.interface';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

export const avatarDirectory = join(process.cwd(), 'uploads', 'avatars');

mkdirSync(avatarDirectory, { recursive: true });

export const imageExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@ApiTags('Users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil do usuário autenticado (cria um default no primeiro acesso)' })
  @ApiResponse({ status: 200, description: 'Perfil retornado' })
  getMe(@GetCurrentUser() user: CurrentUser) {
    return this.usersService.getOrCreateMe(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar o perfil do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil atualizado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  updateMe(@Body() dto: UpdateProfileDto, @GetCurrentUser() user: CurrentUser) {
    return this.usersService.updateMe(user, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Busca de perfis por nome ou e-mail (usada na navbar)' })
  @ApiResponse({ status: 200, description: 'Lista de perfis encontrados' })
  search(@Query('q') q?: string) {
    return this.usersService.search(q);
  }

  @Get(':email')
  @ApiOperation({ summary: 'Perfil público de outro usuário (somente leitura)' })
  @ApiResponse({ status: 200, description: 'Perfil retornado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  getPublicProfile(@Param('email') email: string) {
    return this.usersService.findPublicProfile(email);
  }

  @Get(':email/export-pdf')
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Currículo institucional em PDF (use :email ou "me" para o usuário logado)' })
  @ApiResponse({ status: 200, description: 'Arquivo PDF' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async exportPdf(
    @Param('email') emailParam: string,
    @GetCurrentUser() currentUser: CurrentUser
  ) {
    const buffer = await this.usersService.buildResumePdf(emailParam, currentUser);


    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="curriculo.pdf"',
    });
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: avatarDirectory,
        filename: (_req, file, callback) => {
          const user = _req.user as CurrentUser;
          callback(null, `avatar-${file.originalname}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!imageExtensions[file.mimetype]) {
          return callback(new BadRequestException('Formato de imagem não permitido.'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @GetCurrentUser() user: CurrentUser,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhuma imagem foi enviada.');
    }

    return this.usersService.updateAvatar(user, file);
  }
}
