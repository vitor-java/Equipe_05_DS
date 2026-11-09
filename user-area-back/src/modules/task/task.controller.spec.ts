import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskController } from './task.controller';

describe('TaskController', () => {
  const service: any = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  const controller = new TaskController(service);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar uma tarefa utilizando o ID do usuário autenticado', async () => {
    service.create.mockResolvedValue({ id: '1' });

    const dto: any = { title: 'x' };

    await expect(
      controller.create(dto, { userId: 'u' } as any),
    ).resolves.toEqual({ id: '1' });

    expect(service.create).toHaveBeenCalledWith(dto, 'u');
  });

  it('deve criar uma tarefa sem usuário quando o contexto estiver ausente', () => {
    controller.create({} as any);

    expect(service.create).toHaveBeenCalledWith({}, undefined);
  });

  it('deve delegar a listagem, consulta, atualização e remoção ao serviço', async () => {
    const query: any = { page: 1 };

    service.findAll.mockResolvedValue([]);
    service.findOne.mockResolvedValue({ id: '1' });
    service.update.mockResolvedValue({ id: '1' });
    service.remove.mockResolvedValue(undefined);

    await controller.findAll(query);
    await controller.findOne('1');
    await controller.update('1', {} as any);
    await controller.remove('1');

    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(service.findOne).toHaveBeenCalledWith('1');
    expect(service.update).toHaveBeenCalledWith('1', {});
    expect(service.remove).toHaveBeenCalledWith('1');
  });
});