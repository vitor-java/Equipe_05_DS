import { HttpStatus } from '@nestjs/common';
import { ResourceNotFoundException } from './resource-not-found.exception';
describe('ResourceNotFoundException', () => {
  it('formata recurso sem ID', () => { const e = new ResourceNotFoundException('Usuário'); expect(e.getStatus()).toBe(HttpStatus.NOT_FOUND); expect(e.message).toContain('Usuário'); });
  it('inclui ID quando fornecido', () => { expect(new ResourceNotFoundException('Usuário', '123').message).toContain('123'); });
});
