import { API_URL, fetchApi, getApiErrorMessage } from './api';


export interface NotificationItem {
  id: string;
  alertId: string;
  subject: string;
  message: string;
  severity: string;
  createdAt: string;
  readAt: string | null;
}

export const notificationService = {

  // busca de notificações
  async getAll(page = 1, limit = 20): Promise<NotificationItem[]> {
    const response = await fetchApi(`${API_URL}/notifications/me?page=${page}&limit=${limit}`);
    if (!response.ok) {
      throw new Error(await getApiErrorMessage(response, 'Erro ao buscar notificações.'));
    }

    const json = await response.json();
    const payload = json?.data ?? json;
    const rows: NotificationItem[] = Array.isArray(payload) ? payload : (payload?.items ?? []);
    return rows;
  },


  // marcar notificação como lida
  async markAsRead(id: string): Promise<void> {
    const response = await fetchApi(`${API_URL}/notifications/me/${id}/read`, {
      method: 'PATCH',
    });
    if (!response.ok) {
      throw new Error(await getApiErrorMessage(response, 'Erro ao atualizar notificação.'));
    }
  },
};