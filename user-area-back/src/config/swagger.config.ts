import { registerAs } from '@nestjs/config';

export default registerAs('swagger', () => ({
  title: process.env.SWAGGER_TITLE ?? 'Área do Usuário',
  description:
    process.env.SWAGGER_DESCRIPTION ??
    'Sistema de perfis institucionais e comunicação emergencial através de notificações direcionadas',
  version: process.env.SWAGGER_VERSION ?? '1.0.0',
  path: process.env.SWAGGER_PATH ?? 'api/docs',
}));
