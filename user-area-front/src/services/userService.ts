import { API_URL, fetchApi, getApiErrorMessage } from './api';


export interface ProfileLink {
  id?: string;
  label: string;
  url: string;
}

export interface Experience {
  id?: string;
  description: string;
  position?: number;
}

export interface Project {
  id?: string;
  name: string;
  description?: string | null;
  url?: string | null;
}

export interface Vehicle {
  id?: string;
  plate: string;
  model: string;
  color: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: string;
  photoUrl?: string | null;
  birthDate?: string | null;
  links?: ProfileLink[];
  experiences?: Experience[];
  projects?: Project[];
  vehicles?: Vehicle[];
}

// Para o EditProfileModal
export interface UpdateProfilePayload {
  vehicle?: { plate: string; model: string; color: string };
  links?: { label: string; url: string }[];
  experiences?: string[];
  projects?: { name: string; description?: string; url?: string }[];
}

const toHttpUrl = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};



function toBackendPayload(data: UpdateProfilePayload) {
  const body: Record<string, unknown> = {};

  if (data.vehicle !== undefined) {
    const plate = data.vehicle.plate?.trim();
    body.vehicles = plate
      ? [{ plate, model: data.vehicle.model.trim(), color: data.vehicle.color.trim() }]
      : [];
  }

  if (data.links !== undefined) {
    body.links = data.links
      .map((l) => ({ label: l.label.trim() || 'Link', url: toHttpUrl(l.url) }))
      .filter((l): l is { label: string; url: string } => Boolean(l.url));
  }

  if (data.experiences !== undefined) {
    body.experiences = data.experiences
      .map((text) => text.trim())
      .filter(Boolean)
      .map((description) => ({ description }));
  }

  if (data.projects !== undefined) {
    body.projects = data.projects
      .filter((p) => p.name.trim() !== '')
      .map((p) => ({
        name: p.name.trim(),
        description: p.description?.trim() || undefined,
        url: toHttpUrl(p.url),
      }));
  }

  return body;
}

const unwrap = <T>(json: any): T => (json?.data ?? json) as T;


export const userService = {

  // Há um método semelhante em adminService.ts
  // Entretanto, aqui é mais simples, pois procura apenas pelo nome e e-mail.
  async searchUsers(query: string): Promise<UserProfile[]> {
    if (!query.trim()) return [];

    const response = await fetchApi(`${API_URL}/users/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(await getApiErrorMessage(response, 'Erro ao buscar perfis.'));
    }
    return unwrap<UserProfile[]>(await response.json());
  },


  // carregamento de dados do perfil institucional
  async getMe(): Promise<UserProfile> {
    const response = await fetchApi(`${API_URL}/users/me`);
    if (!response.ok) {
      throw new Error(await getApiErrorMessage(response, 'Erro ao carregar dados do perfil.'));
    }
    return unwrap<UserProfile>(await response.json());
  },

  // exportação do perfil institucional como pdf
  async exportPdf(email: string): Promise<Blob> {
    const response = await fetchApi(`${API_URL}/users/${encodeURIComponent(email)}/export-pdf`);
    if (!response.ok) {
      throw new Error(await getApiErrorMessage(response, 'Erro ao gerar PDF do currículo.'));
    }
    return response.blob();
  },

  async updateProfile(data: UpdateProfilePayload): Promise<void> {
    const response = await fetchApi(`${API_URL}/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toBackendPayload(data)),
    });

    if (!response.ok) {
      throw new Error(await getApiErrorMessage(response, 'Erro ao atualizar dados do perfil.'));
    }
  },

  async getProfileByEmail(email: string): Promise<UserProfile> {
    const response = await fetchApi(`${API_URL}/users/${encodeURIComponent(email)}`);
    if (!response.ok) {
      throw new Error(await getApiErrorMessage(response, 'Perfil não encontrado.'));
    }
    return unwrap<UserProfile>(await response.json());
  },

  async uploadAvatar(file: File): Promise<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchApi(`${API_URL}/users/me/avatar`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(response, 'Erro ao enviar foto de perfil.'),
      );
    }

    return unwrap<{ photoUrl: string }>(await response.json());
  },


};