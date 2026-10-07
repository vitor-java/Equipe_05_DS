import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const PLATE_REGEX = /^[A-Za-z]{3}-?[0-9][A-Za-z0-9][0-9]{2}$/;

const httpUrl = z
  .string()
  .url()
  .max(500)
  .refine((u) => /^https?:\/\//i.test(u), 'A URL deve começar com http:// ou https://');

// Todas essas informações abaixo são substituidas ao chamar esse método.

export const UpdateProfileSchema = z.object({
  birthDate: z.string().date().nullable().optional().describe('YYYY-MM-DD'),
  
  links: z
    .array(z.object({ label: z.string().min(1).max(50), url: httpUrl }))
    .max(10)
    .optional()
    .describe('Lista de links para a pagina institucional'),

  experiences: z
    .array(z.object({ description: z.string().min(1).max(500) }))
    .max(20)
    .optional()
    .describe('Lista de experiências para a pagina institucional'),

  projects: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        url: httpUrl.optional(),
      }),
    )
    .max(20)
    .optional()
    .describe('Lista de projetos para a pagina institucional'),

  vehicles: z
    .array(
      z.object({
        plate: z.string().regex(PLATE_REGEX, 'Placa inválida'),
        model: z.string().min(1).max(60).describe('Ex.: Toyota Corolla'),
        color: z.string().min(1).max(30),
      }),
    )
    .max(5)
    .optional()
    .describe('Lista completa de veículos'),
});

export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}