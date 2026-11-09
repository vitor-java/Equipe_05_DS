import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchApi, getApiErrorMessage } from './api';
import { adminService, CATEGORY_OPTIONS } from './adminService';

vi.mock('./api', () => ({
  fetchApi: vi.fn(),
  getApiErrorMessage: vi.fn(),
}));

describe('adminService', () => {
  const API_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAlerts', () => {
    it('deve buscar alertas com paginação padrão', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            items: [],
            meta: {
              total: 0,
              totalPages: 1,
            },
          },
        }),
      } as any);

      const result = await adminService.getAlerts();

      expect(fetchApi).toHaveBeenCalledWith(
        `${API_URL}/alerts?page=1&limit=10`,
      );

      expect(result).toEqual({
        items: [],
        totalPages: 1,
      });
    });

    it('deve buscar alertas com paginação personalizada', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            items: [],
            meta: {
              total: 0,
              totalPages: 2,
            },
          },
        }),
      } as any);

      await adminService.getAlerts(2, 5);

      expect(fetchApi).toHaveBeenCalledWith(
        `${API_URL}/alerts?page=2&limit=5`,
      );
    });

    it('deve normalizar os dados dos alertas', async () => {
      const alerts = [
        {
          id: '1',
          subject: '',
          message: 'Mensagem de teste',
          audience: '',
          severity: 'HIGH',
          createdAt: '2026-11-08',
          recipientsCount: 5,
          readCount: null,
          recipientsPreview: [
            {
              id: 'user-1',
              name: '',
              email: 'user@email.com',
              readAt: '',
            },
          ],
        },
      ];

      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            items: alerts,
            meta: {
              total: 1,
              totalPages: 1,
            },
          },
        }),
      } as any);

      const result = await adminService.getAlerts();

      expect(result.items[0]).toEqual({
        id: '1',
        subject: 'Sem assunto',
        message: 'Mensagem de teste',
        audience: 'USERS',
        severity: 'HIGH',
        createdAt: '2026-11-08',
        recipientsCount: 5,
        readCount: 0,
        recipientsPreview: [
          {
            id: 'user-1',
            name: 'Usuário',
            email: 'user@email.com',
            readAt: null,
          },
        ],
      });
    });

    it('deve retornar arrays vazios quando os itens forem inválidos', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            items: null,
            meta: {
              total: 0,
              totalPages: 1,
            },
          },
        }),
      } as any);

      const result = await adminService.getAlerts();

      expect(result.items).toEqual([]);
    });

    it('deve calcular o total de páginas usando o total de registros e o limite', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            items: [],
            meta: {
              total: 25,
              totalPages: 0,
            },
          },
        }),
      } as any);

      const result = await adminService.getAlerts(1, 10);

      expect(result.totalPages).toBe(3);
    });

    it('deve calcular a próxima página quando houver itens suficientes', async () => {
      const items = Array.from({ length: 10 }, (_, index) => ({
        id: String(index),
        subject: 'Teste',
        message: 'Mensagem',
        audience: 'ALL',
      }));

      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            items,
            meta: {
              total: 0,
              totalPages: 0,
            },
          },
        }),
      } as any);

      const result = await adminService.getAlerts(2, 10);

      expect(result.totalPages).toBe(3);
    });

    it('deve lançar um erro quando a requisição falhar', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: false,
      } as any);

      await expect(adminService.getAlerts()).rejects.toThrow(
        'Erro ao carregar o histórico de alertas',
      );
    });
  });

  describe('createAlert', () => {
    const payload = {
      subject: 'Novo alerta',
      message: 'Mensagem de teste',
      severity: 'HIGH',
      audience: 'ALL' as const,
      recipientIds: ['user-1'],
    };

    it('deve criar um alerta com sucesso', async () => {
      const responseData = {
        id: 'alert-1',
        subject: 'Novo alerta',
        message: 'Mensagem de teste',
        audience: 'ALL',
        severity: 'HIGH',
        createdAt: '2026-11-08',
      };

      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(responseData),
      } as any);

      const result = await adminService.createAlert(payload);

      expect(fetchApi).toHaveBeenCalledWith(
        `${API_URL}/alerts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      expect(result).toEqual(responseData);
    });

    it('deve utilizar _id quando id não for fornecido', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          _id: 'alert-2',
          subject: 'Teste',
          message: 'Mensagem',
          audience: 'STAFF',
        }),
      } as any);

      const result = await adminService.createAlert(payload);

      expect(result.id).toBe('alert-2');
    });

    it('deve utilizar os valores do payload quando os campos da resposta estiverem ausentes', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'alert-3',
        }),
      } as any);

      const result = await adminService.createAlert(payload);

      expect(result.subject).toBe(payload.subject);
      expect(result.message).toBe(payload.message);
      expect(result.audience).toBe(payload.audience);
      expect(result.severity).toBe(payload.severity);
      expect(result.createdAt).toBeDefined();
    });

    it('deve lançar um erro quando a API retornar uma lista de mensagens', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          message: ['Campo obrigatório', 'Dados inválidos'],
        }),
      } as any);

      await expect(adminService.createAlert(payload)).rejects.toThrow(
        'Campo obrigatório, Dados inválidos',
      );
    });

    it('deve lançar um erro quando a API retornar uma mensagem única', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          message: 'Erro de validação',
        }),
      } as any);

      await expect(adminService.createAlert(payload)).rejects.toThrow(
        'Erro de validação',
      );
    });

    it('deve utilizar detail quando message não for fornecido', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          detail: 'Erro detalhado',
        }),
      } as any);

      await expect(adminService.createAlert(payload)).rejects.toThrow(
        'Erro detalhado',
      );
    });

    it('deve converter o erro para JSON quando message e detail estiverem ausentes', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: 'Internal Server Error',
        }),
      } as any);

      await expect(adminService.createAlert(payload)).rejects.toThrow(
        '{"error":"Internal Server Error"}',
      );
    });
  });

  describe('deleteAlert', () => {
    it('deve excluir um alerta com sucesso', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
      } as any);

      await expect(
        adminService.deleteAlert('alert-1'),
      ).resolves.toBeUndefined();

      expect(fetchApi).toHaveBeenCalledWith(
        `${API_URL}/alerts/alert-1`,
        {
          method: 'DELETE',
        },
      );
    });

    it('deve lançar um erro quando a exclusão falhar', async () => {
      const response = { ok: false };

      vi.mocked(fetchApi).mockResolvedValue(response as any);
      vi.mocked(getApiErrorMessage).mockResolvedValue(
        'Erro ao apagar alerta.',
      );

      await expect(
        adminService.deleteAlert('alert-1'),
      ).rejects.toThrow('Erro ao apagar alerta.');

      expect(getApiErrorMessage).toHaveBeenCalledWith(
        response,
        'Erro ao apagar alerta.',
      );
    });
  });

  describe('searchRecipients', () => {
    it('deve retornar um array vazio quando a pesquisa estiver vazia', async () => {
      const result = await adminService.searchRecipients('', []);

      expect(result).toEqual([]);
      expect(fetchApi).not.toHaveBeenCalled();
    });

    it('deve retornar um array vazio quando a pesquisa contiver apenas espaços', async () => {
      const result = await adminService.searchRecipients('   ', []);

      expect(result).toEqual([]);
      expect(fetchApi).not.toHaveBeenCalled();
    });

    it('deve retornar as categorias correspondentes à pesquisa', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await adminService.searchRecipients('alunos', []);

      expect(result).toEqual([
        CATEGORY_OPTIONS.find((category) => category.id === 'STUDENTS'),
      ]);
    });

    it('deve excluir categorias que já foram selecionadas', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await adminService.searchRecipients('todos', ['ALL']);

      expect(result).toEqual([
        {
          id: 'STUDENTS',
          name: 'Todos os Alunos',
          type: 'CATEGORY',
          audience: 'STUDENTS',
        },
        {
          id: 'STAFF',
          name: 'Todos os Servidores',
          type: 'CATEGORY',
          audience: 'STAFF',
        },
      ]);
    });

    it('deve pesquisar destinatários utilizando uma consulta codificada', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      } as any);

      await adminService.searchRecipients('João Silva', []);

      expect(fetchApi).toHaveBeenCalledWith(
        `${API_URL}/alerts/recipients?q=Jo%C3%A3o%20Silva`,
      );
    });

    it('deve retornar usuários que correspondam aos seus nomes', async () => {
      const users = [
        {
          id: 'user-1',
          name: 'João Silva',
          email: 'joao@email.com',
          role: 'STUDENT',
        },
      ];

      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(users),
      } as any);

      const result = await adminService.searchRecipients('joão', []);

      expect(result).toEqual([
        {
          id: 'user-1',
          name: 'João Silva',
          email: 'joao@email.com',
          type: 'USER',
          role: 'STUDENT',
          vehicle: undefined,
          photoUrl: null,
        },
      ]);
    });

    it('deve retornar usuários que correspondam às placas dos veículos', async () => {
      const users = [
        {
          id: 'user-1',
          name: 'Carlos',
          email: 'carlos@email.com',
          vehicles: [
            {
              plate: 'ABC1234',
              model: 'Civic',
              color: 'Preto',
            },
          ],
        },
      ];

      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(users),
      } as any);

      const result = await adminService.searchRecipients('abc1234', []);

      expect(result[0]).toMatchObject({
        id: 'user-1',
        name: 'Carlos',
        vehicle: {
          plate: 'ABC1234',
          model: 'Civic',
          color: 'Preto',
        },
      });
    });

    it('deve excluir usuários que já foram selecionados', async () => {
      const users = [
        {
          id: 'user-1',
          name: 'João',
        },
      ];

      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(users),
      } as any);

      const result = await adminService.searchRecipients('joão', ['user-1']);

      expect(result).toEqual([]);
    });

    it('deve priorizar usuários que correspondem pelo nome', async () => {
      const users = [
        {
          id: 'user-1',
          name: 'Carlos',
          vehicles: [{ plate: 'JOAO123' }],
        },
        {
          id: 'user-2',
          name: 'João Silva',
        },
        {
          id: 'user-3',
          name: 'João Pedro',
        },
      ];

      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(users),
      } as any);

      const result = await adminService.searchRecipients('joão', []);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('user-2');
      expect(result[1].id).toBe('user-3');
    });

    it('deve aceitar usuários dentro da propriedade data', async () => {
      const users = [
        {
          id: 'user-1',
          name: 'Ana',
        },
      ];

      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: users,
        }),
      } as any);

      const result = await adminService.searchRecipients('ana', []);

      expect(result[0].id).toBe('user-1');
    });

    it('deve utilizar avatarUrl quando photoUrl não estiver disponível', async () => {
      const users = [
        {
          id: 'user-1',
          name: 'Ana',
          avatarUrl: 'https://example.com/avatar.png',
        },
      ];

      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(users),
      } as any);

      const result = await adminService.searchRecipients('ana', []);

      expect(result[0].photoUrl).toBe(
        'https://example.com/avatar.png',
      );
    });

    it('deve retornar photoUrl como null quando nenhuma imagem for fornecida', async () => {
      const users = [
        {
          id: 'user-1',
          name: 'Ana',
        },
      ];

      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(users),
      } as any);

      const result = await adminService.searchRecipients('ana', []);

      expect(result[0].photoUrl).toBeNull();
    });

    it('deve retornar categorias mesmo quando a requisição à API falhar', async () => {
      vi.mocked(fetchApi).mockRejectedValue(new Error('Network error'));

      const result = await adminService.searchRecipients('alunos', []);

      expect(result).toEqual([
        CATEGORY_OPTIONS.find((category) => category.id === 'STUDENTS'),
      ]);
    });

    it('deve retornar categorias quando a API responder com erro', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: false,
      } as any);

      const result = await adminService.searchRecipients('alunos', []);

      expect(result).toEqual([
        CATEGORY_OPTIONS.find((category) => category.id === 'STUDENTS'),
      ]);
    });
  });
});
