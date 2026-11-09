import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from './userService';
import { fetchApi, API_URL } from './api';

vi.mock('./api', () => ({
  API_URL: 'http://localhost:3000/user-area/api/v1',
  fetchApi: vi.fn(),
  getApiErrorMessage: vi.fn().mockResolvedValue('Erro na requisição'),
}));

const mockFetchApi = vi.mocked(fetchApi);

const mockResponse = (
  data: unknown,
  status = 200,
): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchUsers', () => {
    it('deve retornar uma lista vazia quando a busca estiver vazia', async () => {
      const result = await userService.searchUsers('   ');

      expect(result).toEqual([]);
      expect(mockFetchApi).not.toHaveBeenCalled();
    });

    it('deve buscar usuários pelo termo informado', async () => {
      const users = [
        {
          id: '1',
          name: 'João',
          email: 'joao@cin.ufpe.br',
          role: 'STUDENT',
        },
      ];

      mockFetchApi.mockResolvedValueOnce(mockResponse(users));

      const result = await userService.searchUsers('João');

      expect(mockFetchApi).toHaveBeenCalledWith(
        `${API_URL}/users/search?q=Jo%C3%A3o`,
      );
      expect(result).toEqual(users);
    });

    it('deve aceitar respostas com a propriedade data', async () => {
      const users = [
        {
          id: '1',
          name: 'Maria',
          email: 'maria@cin.ufpe.br',
          role: 'STUDENT',
        },
      ];

      mockFetchApi.mockResolvedValueOnce(
        mockResponse({ data: users }),
      );

      const result = await userService.searchUsers('Maria');

      expect(result).toEqual(users);
    });

    it('deve lançar erro quando a busca falhar', async () => {
      mockFetchApi.mockResolvedValueOnce(
        mockResponse({}, 400),
      );

      await expect(
        userService.searchUsers('João'),
      ).rejects.toThrow('Erro na requisição');
    });
  });

  describe('getMe', () => {
    it('deve buscar o perfil do usuário autenticado', async () => {
      const profile = {
        id: '1',
        name: 'João',
        email: 'joao@cin.ufpe.br',
        role: 'STUDENT',
      };

      mockFetchApi.mockResolvedValueOnce(
        mockResponse(profile),
      );

      const result = await userService.getMe();

      expect(mockFetchApi).toHaveBeenCalledWith(
        `${API_URL}/users/me`,
      );
      expect(result).toEqual(profile);
    });

    it('deve aceitar respostas com a propriedade data', async () => {
      const profile = {
        name: 'Maria',
        email: 'maria@cin.ufpe.br',
        role: 'STUDENT',
      };

      mockFetchApi.mockResolvedValueOnce(
        mockResponse({ data: profile }),
      );

      const result = await userService.getMe();

      expect(result).toEqual(profile);
    });

    it('deve lançar erro quando não conseguir carregar o perfil', async () => {
      mockFetchApi.mockResolvedValueOnce(
        mockResponse({}, 500),
      );

      await expect(userService.getMe()).rejects.toThrow(
        'Erro na requisição',
      );
    });
  });

  describe('exportPdf', () => {
    it('deve exportar o perfil em PDF', async () => {
      const pdf = new Blob(['PDF de teste'], {
        type: 'application/pdf',
      });

      mockFetchApi.mockResolvedValueOnce(
        new Response(pdf, { status: 200 }),
      );

      const result = await userService.exportPdf(
        'joao@cin.ufpe.br',
      );

      expect(mockFetchApi).toHaveBeenCalledWith(
        `${API_URL}/users/joao%40cin.ufpe.br/export-pdf`,
      );
      expect(result).toBeInstanceOf(Blob);
    });

    it('deve lançar erro quando a exportação falhar', async () => {
      mockFetchApi.mockResolvedValueOnce(
        mockResponse({}, 500),
      );

      await expect(
        userService.exportPdf('joao@cin.ufpe.br'),
      ).rejects.toThrow('Erro na requisição');
    });
  });

  describe('updateProfile', () => {
    it('deve atualizar os dados do perfil', async () => {
      mockFetchApi.mockResolvedValueOnce(
        mockResponse({}),
      );

      await userService.updateProfile({
        vehicle: {
          plate: 'ABC1234',
          model: 'Honda Civic',
          color: 'Preto',
        },
        links: [
          {
            label: 'GitHub',
            url: 'github.com/usuario',
          },
        ],
        experiences: ['Desenvolvedor'],
        projects: [
          {
            name: 'Projeto',
            description: 'Descrição',
            url: 'https://projeto.com',
          },
        ],
      });

      expect(mockFetchApi).toHaveBeenCalledWith(
        `${API_URL}/users/me`,
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      const options = mockFetchApi.mock.calls[0][1];
      const body = JSON.parse(options?.body as string);

      expect(body).toEqual({
        vehicles: [
          {
            plate: 'ABC1234',
            model: 'Honda Civic',
            color: 'Preto',
          },
        ],
        links: [
          {
            label: 'GitHub',
            url: 'https://github.com/usuario',
          },
        ],
        experiences: [
          {
            description: 'Desenvolvedor',
          },
        ],
        projects: [
          {
            name: 'Projeto',
            description: 'Descrição',
            url: 'https://projeto.com',
          },
        ],
      });
    });

    it('deve remover veículo quando a placa estiver vazia', async () => {
      mockFetchApi.mockResolvedValueOnce(
        mockResponse({}),
      );

      await userService.updateProfile({
        vehicle: {
          plate: '   ',
          model: 'Honda',
          color: 'Preto',
        },
      });

      const options = mockFetchApi.mock.calls[0][1];
      const body = JSON.parse(options?.body as string);

      expect(body.vehicles).toEqual([]);
    });

    it('deve remover links sem URL', async () => {
      mockFetchApi.mockResolvedValueOnce(
        mockResponse({}),
      );

      await userService.updateProfile({
        links: [
          { label: 'GitHub', url: 'github.com/usuario' },
          { label: 'Site', url: '   ' },
        ],
      });

      const options = mockFetchApi.mock.calls[0][1];
      const body = JSON.parse(options?.body as string);

      expect(body.links).toEqual([
        {
          label: 'GitHub',
          url: 'https://github.com/usuario',
        },
      ]);
    });

    it('deve remover experiências vazias', async () => {
      mockFetchApi.mockResolvedValueOnce(
        mockResponse({}),
      );

      await userService.updateProfile({
        experiences: [
          'Desenvolvedor',
          '   ',
          '',
          'Analista',
        ],
      });

      const options = mockFetchApi.mock.calls[0][1];
      const body = JSON.parse(options?.body as string);

      expect(body.experiences).toEqual([
        { description: 'Desenvolvedor' },
        { description: 'Analista' },
      ]);
    });

    it('deve remover projetos sem nome', async () => {
      mockFetchApi.mockResolvedValueOnce(
        mockResponse({}),
      );

      await userService.updateProfile({
        projects: [
          { name: 'Projeto válido' },
          { name: '   ' },
        ],
      });

      const options = mockFetchApi.mock.calls[0][1];
      const body = JSON.parse(options?.body as string);

      expect(body.projects).toEqual([
        {
          name: 'Projeto válido',
          description: undefined,
          url: undefined,
        },
      ]);
    });

    it('deve enviar objeto vazio quando nenhum dado for informado', async () => {
      mockFetchApi.mockResolvedValueOnce(
        mockResponse({}),
      );

      await userService.updateProfile({});

      const options = mockFetchApi.mock.calls[0][1];
      const body = JSON.parse(options?.body as string);

      expect(body).toEqual({});
    });

    it('deve lançar erro quando a atualização falhar', async () => {
      mockFetchApi.mockResolvedValueOnce(
        mockResponse({}, 500),
      );

      await expect(
        userService.updateProfile({
          experiences: ['Desenvolvedor'],
        }),
      ).rejects.toThrow('Erro na requisição');
    });
  });

  describe('getProfileByEmail', () => {
    it('deve buscar um perfil pelo e-mail', async () => {
      const profile = {
        id: '1',
        name: 'João',
        email: 'joao@cin.ufpe.br',
        role: 'STUDENT',
      };

      mockFetchApi.mockResolvedValueOnce(
        mockResponse(profile),
      );

      const result = await userService.getProfileByEmail(
        'joao@cin.ufpe.br',
      );

      expect(mockFetchApi).toHaveBeenCalledWith(
        `${API_URL}/users/joao%40cin.ufpe.br`,
      );
      expect(result).toEqual(profile);
    });

    it('deve lançar erro quando o perfil não for encontrado', async () => {
      mockFetchApi.mockResolvedValueOnce(
        mockResponse({}, 404),
      );

      await expect(
        userService.getProfileByEmail('inexistente@cin.ufpe.br'),
      ).rejects.toThrow('Erro na requisição');
    });
  });

  describe('uploadAvatar', () => {
    it('deve enviar a foto de perfil', async () => {
      const avatar = {
        photoUrl: 'https://exemplo.com/avatar.png',
      };

      mockFetchApi.mockResolvedValueOnce(
        mockResponse(avatar),
      );

      const file = new File(['imagem'], 'avatar.png', {
        type: 'image/png',
      });

      const result = await userService.uploadAvatar(file);

      expect(mockFetchApi).toHaveBeenCalledWith(
        `${API_URL}/users/me/avatar`,
        expect.objectContaining({
          method: 'POST',
        }),
      );

      const options = mockFetchApi.mock.calls[0][1];
      const formData = options?.body as FormData;

      expect(formData).toBeInstanceOf(FormData);
      expect(formData.get('file')).toBe(file);
      expect(result).toEqual(avatar);
    });

    it('deve aceitar respostas com a propriedade data', async () => {
      const avatar = {
        photoUrl: 'https://exemplo.com/avatar.png',
      };

      mockFetchApi.mockResolvedValueOnce(
        mockResponse({ data: avatar }),
      );

      const file = new File(['imagem'], 'avatar.png', {
        type: 'image/png',
      });

      const result = await userService.uploadAvatar(file);

      expect(result).toEqual(avatar);
    });

    it('deve lançar erro quando o envio da foto falhar', async () => {
      mockFetchApi.mockResolvedValueOnce(
        mockResponse({}, 500),
      );

      const file = new File(['imagem'], 'avatar.png', {
        type: 'image/png',
      });

      await expect(
        userService.uploadAvatar(file),
      ).rejects.toThrow('Erro na requisição');
    });
  });
});
