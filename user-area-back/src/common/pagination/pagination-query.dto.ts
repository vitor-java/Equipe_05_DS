import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const PaginationQueryBaseSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

export const withSkipTake = <T extends { page: number; limit: number }>(data: T) => ({
  ...data,
  skip: (data.page - 1) * data.limit,
  take: data.limit,
});

export const PaginationQuerySchema = PaginationQueryBaseSchema.transform((data) => withSkipTake(data));

export class PaginationQueryDto extends createZodDto(PaginationQuerySchema) { }