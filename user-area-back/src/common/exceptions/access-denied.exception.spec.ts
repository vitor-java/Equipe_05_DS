import { describe, it, expect} from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { AccessDeniedException } from './access-denied.exception';
import { ErrorCode } from './error-code.enum';
describe('AccessDeniedException', () => {
  it('usa mensagem padrão, código e status 403', () => {
    const error = new AccessDeniedException();
    expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(error.message).toBe('Acesso negado.');
    expect(error).toMatchObject({ code: ErrorCode.ACCESS_DENIED });
  });
  it('aceita mensagem customizada', () => { expect(new AccessDeniedException('Sem acesso').message).toBe('Sem acesso'); });
});
