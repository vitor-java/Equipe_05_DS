import { fetchApi, getApiErrorMessage } from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface RecipientOption {
  id: string;
  name: string;
  type: 'USER' | 'CATEGORY';
  email?: string;
  role?: string;
  audience?: 'ALL' | 'STUDENTS' | 'STAFF' | 'USERS';
  vehicle?: {
    plate: string;
    model: string;
    color: string;
  };
  photoUrl?: string | null;
}

export interface RecipientPreviewItem {
  id: string;
  name: string;
  email: string;
  readAt: string | null;
}

export interface AlertItem {
  id: string;
  subject: string;
  message: string;
  audience: string;
  severity?: string;
  createdAt?: string;
  recipientsCount?: number | string;
  readCount?: number;
  recipientsPreview?: RecipientPreviewItem[];
}

export interface CreateAlertPayload {
  subject: string;
  message: string;
  severity?: string;
  audience: 'ALL' | 'STUDENTS' | 'STAFF' | 'USERS';
  recipientIds?: string[];
}

export const CATEGORY_OPTIONS: RecipientOption[] = [
  { id: 'ALL', name: 'Todos os Usuários', type: 'CATEGORY', audience: 'ALL' },
  { id: 'STUDENTS', name: 'Todos os Alunos', type: 'CATEGORY', audience: 'STUDENTS' },
  { id: 'STAFF', name: 'Todos os Servidores', type: 'CATEGORY', audience: 'STAFF' },
];

export const adminService = {
  async getAlerts(page: number = 1, limit: number = 10): Promise<{ items: AlertItem[]; totalPages: number }> {
    const response = await fetchApi(`${API_URL}/alerts?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Erro ao carregar o histórico de alertas');

    const json = await response.json();

    const payload = json.data;
    const rawItems = payload?.items;
    const safeItems: any[] = Array.isArray(rawItems) ? rawItems : [];

    const meta = payload.meta;
    const total = meta.total;
    let totalPages = meta.totalPages;

    if (!totalPages && total) totalPages = Math.ceil(total / limit);
    if (!totalPages) totalPages = safeItems.length >= limit ? page + 1 : page;

    const items = safeItems.map((item: any) => (
      {
      id: item.id,
      subject: item.subject || 'Sem assunto',
      message: item.message,
      audience: item.audience || 'USERS',
      severity: item.severity,
      createdAt: item.createdAt,
      recipientsCount: item.recipientsCount,
      readCount: item.readCount ?? 0,
      recipientsPreview: Array.isArray(item.recipientsPreview)
        ? item.recipientsPreview.map((r: any) => ({
          id: r.id,
          name: r.name || 'Usuário',
          email: r.email,
          readAt: r.readAt || null,
        }))
        : [],
    }));

    return { items, totalPages };
  },

  async createAlert(payload: CreateAlertPayload): Promise<AlertItem> {
    const response = await fetchApi(`${API_URL}/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json();
      const detailedMessage = err.message
        ? (Array.isArray(err.message) ? err.message.join(', ') : err.message)
        : (err.detail || JSON.stringify(err));

      throw new Error(detailedMessage);
    }

    const item = await response.json();

    return {
      id: item.id || item._id,
      subject: item.subject || payload.subject,
      message: item.message || payload.message,
      audience: item.audience || payload.audience,
      severity: item.severity || payload.severity,
      createdAt: item.createdAt || new Date().toISOString(),
    };
  },

  async deleteAlert(id: string): Promise<void> {
    const response = await fetchApi(`${API_URL}/alerts/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(await getApiErrorMessage(response, 'Erro ao apagar alerta.'));
    }
  },

  // Sistema de pesquisa
  async searchRecipients(query: string, selectedIds: string[]): Promise<RecipientOption[]> {
    if (!query.trim()) return [];

    const cleanQuery = query.toLowerCase().trim();

    // Filtra categorias globais
    const matchedCategories = CATEGORY_OPTIONS.filter(
      cat => cat.name.toLowerCase().includes(cleanQuery) && !selectedIds.includes(cat.id)
    );

    // Busca usuarios
    let users: RecipientOption[] = [];
    try {
      const response = await fetchApi(`${API_URL}/alerts/recipients?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        users = Array.isArray(data) ? data : (data.data || []);

        console.log('Resposta completa da API:', data);
        console.log('Primeiro usuário:', users[0]);
      }
    } catch (err) {
      console.warn('Erro ao consultar pesquisa de destinatários na API:', err);
    }

    // Filtra e ordena Nome primeiro, Placa em segundo, excluindo ja selecionados
    const filteredUsers = users
      .filter((user: any) => {
        const matchesName = user.name?.toLowerCase().includes(cleanQuery);
        const matchesPlate = user.vehicles?.some((v: any) => v.plate?.toLowerCase().includes(cleanQuery));
        const notSelected = !selectedIds.includes(user.id);
        return (matchesName || matchesPlate) && notSelected;
      })
      .map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        type: 'USER' as const,
        role: user.role,
        vehicle: user.vehicles?.[0]
          ? {
            plate: user.vehicles[0].plate,
            model: user.vehicles[0].model,
            color: user.vehicles[0].color
          }
          : undefined,
        photoUrl: user.photoUrl || user.avatarUrl || null
      }))
      .sort((a, b) => {
        const aNameMatch = a.name.toLowerCase().includes(cleanQuery);
        const bNameMatch = b.name.toLowerCase().includes(cleanQuery);
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        return 0;
      });

    return [...matchedCategories, ...filteredUsers];
  }
};