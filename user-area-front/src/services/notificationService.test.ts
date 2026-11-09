
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_URL, fetchApi, getApiErrorMessage } from './api';
import { notificationService } from './notificationService';

vi.mock('./api', () => ({
  API_URL: 'http://localhost:3000',
  fetchApi: vi.fn(),
  getApiErrorMessage: vi.fn(),
}));

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('deve buscar notificações com paginação padrão', async () => {
      const notifications = [
        {
          id: '1',
          alertId: 'alert-1',
          subject: 'Teste',
          message: 'Mensagem de teste',
          severity: 'HIGH',
          createdAt: '2026-11-08T10:00:00Z',
          readAt: null,
        },
      ];

      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: notifications }),
      } as any);

      const result = await notificationService.getAll();

      expect(fetchApi).toHaveBeenCalledWith(
        `${API_URL}/notifications/me?page=1&limit=20`,
      );
      expect(result).toEqual(notifications);
    });

    it('deve buscar notificações com paginação personalizada', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [] }),
      } as any);

      const result = await notificationService.getAll(2, 10);

      expect(fetchApi).toHaveBeenCalledWith(
        `${API_URL}/notifications/me?page=2&limit=10`,
      );
      expect(result).toEqual([]);
    });

    it('deve retornar o payload quando ele for um array', async () => {
      const notifications = [{ id: '1', subject: 'Teste' }];

      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(notifications),
      } as any);

      const result = await notificationService.getAll();

      expect(result).toEqual(notifications);
    });

    it('deve retornar os itens quando o payload possuir a propriedade items', async () => {
      const notifications = [{ id: '1', subject: 'Teste' }];

      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            items: notifications,
          },
        }),
      } as any);

      const result = await notificationService.getAll();

      expect(result).toEqual(notifications);
    });

    it('deve retornar um array vazio quando o payload não possuir itens', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {},
        }),
      } as any);

      const result = await notificationService.getAll();

      expect(result).toEqual([]);
    });

    it('deve lançar um erro quando a requisição falhar', async () => {
      const response = { ok: false };

      vi.mocked(fetchApi).mockResolvedValue(response as any);
      vi.mocked(getApiErrorMessage).mockResolvedValue(
        'Erro ao buscar notificações.',
      );

      await expect(notificationService.getAll()).rejects.toThrow(
        'Erro ao buscar notificações.',
      );

      expect(getApiErrorMessage).toHaveBeenCalledWith(
        response,
        'Erro ao buscar notificações.',
      );
    });
  });

  describe('markAsRead', () => {
    it('deve marcar uma notificação como lida', async () => {
      vi.mocked(fetchApi).mockResolvedValue({
        ok: true,
      } as any);

      await expect(
        notificationService.markAsRead('notification-1'),
      ).resolves.toBeUndefined();

      expect(fetchApi).toHaveBeenCalledWith(
        `${API_URL}/notifications/me/notification-1/read`,
        {
          method: 'PATCH',
        },
      );
    });

    it('deve lançar um erro quando a requisição falhar', async () => {
      const response = { ok: false };

      vi.mocked(fetchApi).mockResolvedValue(response as any);
      vi.mocked(getApiErrorMessage).mockResolvedValue(
        'Erro ao atualizar notificação.',
      );

      await expect(
        notificationService.markAsRead('notification-1'),
      ).rejects.toThrow('Erro ao atualizar notificação.');

      expect(getApiErrorMessage).toHaveBeenCalledWith(
        response,
        'Erro ao atualizar notificação.',
      );
    });
  });
});
