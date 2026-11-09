import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('deve retornar uma classe quando receber apenas uma classe', () => {
    expect(cn('text-red-500')).toBe('text-red-500');
  });

  it('deve combinar múltiplas classes', () => {
    expect(cn('flex', 'items-center', 'justify-between')).toBe(
      'flex items-center justify-between',
    );
  });

  it('deve remover classes conflitantes do Tailwind', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('deve preservar classes que não possuem conflitos', () => {
    expect(cn('text-red-500', 'font-bold', 'flex')).toBe(
      'text-red-500 font-bold flex',
    );
  });

  it('deve ignorar valores falsos', () => {
    expect(cn('flex', false && 'hidden', null, undefined)).toBe('flex');
  });

  it('deve aceitar objetos com condições booleanas', () => {
    expect(
      cn({
        'bg-red-500': true,
        'bg-blue-500': false,
        'font-bold': true,
      }),
    ).toBe('bg-red-500 font-bold');
  });

  it('deve aceitar arrays de classes', () => {
    expect(cn(['flex', 'items-center'])).toBe('flex items-center');
  });

  it('deve retornar uma string vazia quando não receber classes', () => {
    expect(cn()).toBe('');
  });

  it('deve retornar uma string vazia quando receber apenas valores falsos', () => {
    expect(cn(false, null, undefined, '')).toBe('');
  });

  it('deve combinar classes condicionais e remover conflitos', () => {
    expect(
      cn('p-2', true && 'p-6', false && 'p-8', 'rounded-lg'),
    ).toBe('p-6 rounded-lg');
  });
});
