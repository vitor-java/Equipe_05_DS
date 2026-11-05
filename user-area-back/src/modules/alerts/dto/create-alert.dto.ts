import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ALERT_SEVERITIES = ['INFO', 'LOW', 'MEDIUM', 'HIGH'] as const;
export const ALERT_AUDIENCES = ['USERS', 'ALL', 'STUDENTS', 'STAFF'] as const;

export const MAX_ALERT_RECIPIENTS = 500;
export const MAX_SUBJECT_LENGTH = 120;
export const MAX_MESSAGE_LENGTH = 2000;

export const CreateAlertSchema = z
  .object({
    audience: z
      .enum(ALERT_AUDIENCES)
      .default('USERS')
      .describe('USERS = destinatários selecionados; ALL/STUDENTS/STAFF = envio coletivo'),

    recipientIds: z
      .array(z.string().uuid())
      .max(MAX_ALERT_RECIPIENTS)
      .default([])
      .describe('Os IDs dos usuários (obrigatório quando audience = USERS)'),

    severity: z.enum(ALERT_SEVERITIES).default('INFO'),
    subject: z.string().trim().min(1).max(MAX_SUBJECT_LENGTH),
    message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  })
  .superRefine((data, ctx) => {
    const recipients = Array.isArray(data.recipientIds) ? data.recipientIds : [];
    const hasRecipients = recipients.length > 0;

    if (data.audience === 'USERS' && !hasRecipients) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipientIds'],
        message: 'Selecione ao menos um destinatário.',
      });
    }

    if (data.audience !== 'USERS' && hasRecipients) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipientIds'],
        message: 'Não é possível selecionar um destinatário quando a audiência é coletiva.',
      });
    }
  });

export class CreateAlertDto extends createZodDto(CreateAlertSchema) { }