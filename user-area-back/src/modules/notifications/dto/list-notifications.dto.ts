import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaginationQuerySchema } from '@/common/pagination/pagination-query.dto';

export const ListNotificationsQuerySchema = PaginationQuerySchema.extend({
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .describe('Quando for "true", só retorna as notificações não lidas'),
});

export class ListNotificationsQueryDto extends createZodDto(ListNotificationsQuerySchema) {
  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  get take(): number {
    return this.limit;
  }
}
