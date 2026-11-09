import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RouteMap from './routes';
import type { AuthContextProps } from 'react-oidc-context';

// Mock da autenticação
const mockUseAuth = vi.fn();

vi.mock('react-oidc-context', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock do serviço de tarefas
vi.mock('./modules/todos/todo.service', () => ({
  todoService: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock do serviço de notificações
vi.mock('./services/notificationService', () => ({
  notificationService: {
    getAll: vi.fn().mockResolvedValue([]),
    markAsRead: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock do serviço de usuários
vi.mock('./services/userService', () => ({
  userService: {
    getMe: vi.fn().mockResolvedValue({
      id: 'user-1',
      name: 'Usuário de Teste',
      email: 'user@cin.ufpe.br',
      role: 'ALUNO',
      photoUrl: null,
      links: [],
      experiences: [],
      projects: [],
      vehicles: [],
    }),
    getProfileByEmail: vi.fn().mockResolvedValue({
      id: 'user-1',
      name: 'Usuário de Teste',
      email: 'user@cin.ufpe.br',
      role: 'ALUNO',
      photoUrl: null,
      links: [],
      experiences: [],
      projects: [],
      vehicles: [],
    }),
  },
}));

// Mock do serviço administrativo
vi.mock('./services/adminService', () => ({
  adminService: {
    getAlerts: vi.fn().mockResolvedValue({
      items: [],
      totalPages: 1,
    }),
    createAlert: vi.fn().mockResolvedValue({
      id: 'alert-1',
      subject: 'Alerta de teste',
      message: 'Mensagem de teste',
      audience: 'ALL',
    }),
    deleteAlert: vi.fn().mockResolvedValue(undefined),
    searchRecipients: vi.fn().mockResolvedValue([]),
  },
  CATEGORY_OPTIONS: [
    {
      id: 'ALL',
      name: 'Todos os Usuários',
      type: 'CATEGORY',
      audience: 'ALL',
    },
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
  ],
}));

// Monta um access_token JWT falso com roles
function fakeToken(roles: string[]): string {
  const payload = btoa(
    JSON.stringify({
      realm_access: { roles },
    }),
  );

  return `header.${payload}.sig`;
}

describe('<RouteMap>', () => {
  let mockSigninRedirect: ReturnType<typeof vi.fn>;

  let mockEvents: {
    addAccessTokenExpired: ReturnType<typeof vi.fn>;
    removeAccessTokenExpired: ReturnType<typeof vi.fn>;
    addSilentRenewError: ReturnType<typeof vi.fn>;
    removeSilentRenewError: ReturnType<typeof vi.fn>;
    addUserSignedOut: ReturnType<typeof vi.fn>;
    removeUserSignedOut: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSigninRedirect = vi.fn();

    mockEvents = {
      addAccessTokenExpired: vi.fn(),
      removeAccessTokenExpired: vi.fn(),
      addSilentRenewError: vi.fn(),
      removeSilentRenewError: vi.fn(),
      addUserSignedOut: vi.fn(),
      removeUserSignedOut: vi.fn(),
    };

    window.history.pushState({}, 'Test', '/');
  });

  it('renderiza a tela de login na rota / quando o usuário não está autenticado e não redireciona', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      user: null,
      signinRedirect: mockSigninRedirect,
      events: mockEvents,
    } as unknown as AuthContextProps);

    render(<RouteMap />);

    expect(
      screen.getByRole('button', { name: /entrar/i }),
    ).toBeInTheDocument();

    expect(mockSigninRedirect).not.toHaveBeenCalled();
  });

  it('redireciona para /profile quando o usuário está autenticado', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      user: {
        access_token: fakeToken(['sys_user-area-student']),
        profile: {
          email: 'user@cin.ufpe.br',
          given_name: 'Test User',
          preferred_username: 'testuser',
        },
      },
      signinRedirect: mockSigninRedirect,
      signinSilent: vi.fn().mockResolvedValue(null),
      removeUser: vi.fn().mockResolvedValue(undefined),
      clearStaleState: vi.fn().mockResolvedValue(undefined),
      events: mockEvents,
    } as unknown as AuthContextProps);

    render(<RouteMap />);

    expect(
      await screen.findByText('Usuário de Teste'),
    ).toBeInTheDocument();

    expect(window.location.pathname).toBe('/profile');

    expect(
      screen.queryByRole('button', { name: /^entrar$/i }),
    ).not.toBeInTheDocument();

    expect(mockSigninRedirect).not.toHaveBeenCalled();
  });

  it('chama signinRedirect ao clicar no botão Entrar na tela de login', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      user: null,
      signinRedirect: mockSigninRedirect,
      events: mockEvents,
    } as unknown as AuthContextProps);

    render(<RouteMap />);

    const button = screen.getByRole('button', {
      name: /entrar/i,
    });

    fireEvent.click(button);

    expect(mockSigninRedirect).toHaveBeenCalledTimes(1);
  });

  it('bloqueia /admin para usuário autenticado sem a role ADMIN', async () => {
    window.history.pushState({}, 'Test', '/admin');

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      user: {
        access_token: fakeToken(['sys_user-area-editor']),
        profile: {
          email: 'editor@cin.ufpe.br',
        },
      },
      signinRedirect: mockSigninRedirect,
      signinSilent: vi.fn().mockResolvedValue(null),
      removeUser: vi.fn().mockResolvedValue(undefined),
      clearStaleState: vi.fn().mockResolvedValue(undefined),
      events: mockEvents,
    } as unknown as AuthContextProps);

    render(<RouteMap />);

    expect(
      await screen.findByText(/You are logged in as/i),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('heading', { name: /Emitir Alerta/i }),
    ).not.toBeInTheDocument();
  });

  it('libera /admin para usuário com a role ADMIN', async () => {
    window.history.pushState({}, 'Test', '/admin');

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      user: {
        access_token: fakeToken(['sys_user-area-admin']),
        profile: {
          email: 'admin@cin.ufpe.br',
        },
      },
      signinRedirect: mockSigninRedirect,
      signinSilent: vi.fn().mockResolvedValue(null),
      removeUser: vi.fn().mockResolvedValue(undefined),
      clearStaleState: vi.fn().mockResolvedValue(undefined),
      events: mockEvents,
    } as unknown as AuthContextProps);

    render(<RouteMap />);

    expect(
      await screen.findByRole('heading', {
        name: /Emitir Alerta/i,
      }),
    ).toBeInTheDocument();
  });

  it('redireciona para / e exibe a tela de login quando usuário não autenticado tenta acessar /profile', () => {
    window.history.pushState({}, 'Test', '/profile');

    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      user: null,
      signinRedirect: mockSigninRedirect,
      events: mockEvents,
    } as unknown as AuthContextProps);

    render(<RouteMap />);

    expect(
      screen.getByRole('button', { name: /entrar/i }),
    ).toBeInTheDocument();

    expect(mockSigninRedirect).not.toHaveBeenCalled();
  });
});
