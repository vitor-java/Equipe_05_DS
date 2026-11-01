import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SearchRecipientsSchema = z.object({
  q: z
    .string()
    .trim()
    .max(60)
    .default('')
    .describe('Busca por nome, e-mail, placa ou modelo do veículo'),
});

export class SearchRecipientsDto extends createZodDto(SearchRecipientsSchema) {}
