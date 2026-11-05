import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaginationQueryBaseSchema, withSkipTake } from '@/common/pagination/pagination-query.dto';

export const ListNotificationsQuerySchema = PaginationQueryBaseSchema.extend({
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .describe('Quando for "true", só retorna as notificações não lidas'),
}).transform((data) => withSkipTake(data));


export class ListNotificationsQueryDto extends createZodDto(ListNotificationsQuerySchema) {}
