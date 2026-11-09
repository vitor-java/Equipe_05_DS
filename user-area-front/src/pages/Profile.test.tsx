import {describe,it,expect,vi,beforeEach,afterEach,} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup,} from '@testing-library/react';
import { ProfilePage } from './Profile';
import {userService,type UserProfile,} from '../services/userService';

// Permite controlar o parâmetro email da rota durante os testes.
const { mockEmail } = vi.hoisted(() => ({
  mockEmail: { value: undefined as string | undefined },
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('react-router-dom')>();

  return {
    ...actual,
    useParams: () => ({ email: mockEmail.value }),
  };
});

// Simula os serviços utilizados pela página.
vi.mock('../services/userService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../services/userService')>();

  return {
    ...actual,
    userService: {
      ...actual.userService,
      getMe: vi.fn(),
      getProfileByEmail: vi.fn(),
      exportPdf: vi.fn(),
    },
  };
});

// Simplifica a renderização do avatar.
vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: ({ name }: { name?: string }) => (
    <div data-testid="user-avatar">{name}</div>
  ),
}));

// Simula o modal de edição do perfil.
vi.mock('../components/EditProfileModal', () => ({
  EditProfileModal: ({
    isOpen,
    onClose,
    onSuccess,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }) =>
    isOpen ? (
      <div data-testid="edit-profile-modal">
        <button type="button" onClick={onClose}>
          Fechar edição
        </button>

        <button type="button" onClick={onSuccess}>
          Salvar perfil
        </button>
      </div>
    ) : null,
}));

const criarPerfil = (
  dados: Partial<UserProfile> = {},
): UserProfile =>
  ({
    name: 'Ana Silva',
    email: 'ana@email.com',
    role: 'STUDENT',
    photoUrl: 'https://example.com/avatar.png',
    links: [
      {
        id: 'link-1',
        label: 'LinkedIn',
        url: 'https://linkedin.com/in/ana',
      },
    ],
    experiences: [
      { id: 'exp-1', description: 'Experiência profissional 1' },
      { id: 'exp-2', description: 'Experiência profissional 2' },
      { id: 'exp-3', description: 'Experiência profissional 3' },
      { id: 'exp-4', description: 'Experiência profissional 4' },
      { id: 'exp-5', description: 'Experiência profissional 5' },
    ],
    projects: [
      {
        name: 'Projeto Alpha',
        description: 'Descrição do projeto Alpha.',
        url: 'https://github.com/ana/alpha',
      },
      {
        name: 'Projeto Beta',
        description: 'Descrição do projeto Beta.',
        url: '',
      },
    ],
    ...dados,
  }) as UserProfile;

// Guarda os descritores originais dos métodos da URL.
const createObjectURLOriginal = Object.getOwnPropertyDescriptor(
  URL,
  'createObjectURL',
);

const revokeObjectURLOriginal = Object.getOwnPropertyDescriptor(
  URL,
  'revokeObjectURL',
);

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockEmail.value = undefined;

    vi.mocked(userService.getMe).mockResolvedValue(criarPerfil());

    vi.mocked(userService.getProfileByEmail).mockResolvedValue(
      criarPerfil(),
    );

    vi.mocked(userService.exportPdf).mockResolvedValue(
      new Blob(['PDF de teste'], {
        type: 'application/pdf',
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();

    // Restaura os métodos originais da URL.
    if (createObjectURLOriginal) {
      Object.defineProperty(
        URL,
        'createObjectURL',
        createObjectURLOriginal,
      );
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }

    if (revokeObjectURLOriginal) {
      Object.defineProperty(
        URL,
        'revokeObjectURL',
        revokeObjectURLOriginal,
      );
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  });

  it('deve exibir a mensagem de carregamento enquanto busca o perfil', () => {
    vi.mocked(userService.getMe).mockReturnValue(
      new Promise(() => {}),
    );

    render(<ProfilePage />);

    expect(
      screen.getByText('Carregando perfil institucional...'),
    ).toBeInTheDocument();
  });

  it('deve carregar o perfil do usuário autenticado', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(userService.getMe).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByTestId('user-avatar')).toHaveTextContent(
      'Ana Silva',
    );

    expect(screen.getByText('ana@email.com')).toBeInTheDocument();
  });

  it('deve carregar o perfil de outro usuário quando houver email na rota', async () => {
    mockEmail.value = 'carlos@email.com';

    render(<ProfilePage />);

    await waitFor(() => {
      expect(userService.getProfileByEmail).toHaveBeenCalledWith(
        'carlos@email.com',
      );
    });

    expect(userService.getMe).not.toHaveBeenCalled();

    expect(await screen.findByTestId('user-avatar')).toHaveTextContent(
      'Ana Silva',
    );
  });

  it('deve exibir o nome e o email do usuário', async () => {
    render(<ProfilePage />);

    expect(await screen.findByTestId('user-avatar')).toHaveTextContent(
      'Ana Silva',
    );

    expect(screen.getByText('ana@email.com')).toBeInTheDocument();
  });

  it('deve formatar o papel STUDENT como Aluno', async () => {
    render(<ProfilePage />);

    expect(await screen.findByText('Aluno')).toBeInTheDocument();
  });

  it('deve formatar o papel ADMIN como Administrador', async () => {
    vi.mocked(userService.getMe).mockResolvedValue(
      criarPerfil({ role: 'ADMIN' }),
    );

    render(<ProfilePage />);

    expect(
      await screen.findByText('Administrador'),
    ).toBeInTheDocument();
  });

  it('deve formatar o papel STAFF como Servidor', async () => {
    vi.mocked(userService.getMe).mockResolvedValue(
      criarPerfil({ role: 'STAFF' }),
    );

    render(<ProfilePage />);

    expect(await screen.findByText('Servidor')).toBeInTheDocument();
  });

  it('deve exibir o papel original quando não houver uma tradução', async () => {
    vi.mocked(userService.getMe).mockResolvedValue(
      criarPerfil({ role: 'VISITOR' }),
    );

    render(<ProfilePage />);

    expect(await screen.findByText('VISITOR')).toBeInTheDocument();
  });

  it('deve exibir o avatar com o nome do usuário', async () => {
    render(<ProfilePage />);

    expect(await screen.findByTestId('user-avatar')).toHaveTextContent(
      'Ana Silva',
    );
  });

  it('deve exibir a seção de links do perfil', async () => {
    render(<ProfilePage />);

    expect(await screen.findByText('Links')).toBeInTheDocument();

    expect(screen.getByText('LinkedIn:')).toBeInTheDocument();

    const link = screen.getByRole('link', {
      name: 'linkedin.com/in/ana',
    });

    expect(link).toHaveAttribute(
      'href',
      'https://linkedin.com/in/ana',
    );

    expect(link).toHaveAttribute('target', '_blank');
  });

  it('deve remover o protocolo HTTPS da exibição dos links', async () => {
    render(<ProfilePage />);

    expect(
      await screen.findByText('linkedin.com/in/ana'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('https://linkedin.com/in/ana'),
    ).not.toBeInTheDocument();
  });

  it('deve exibir as três primeiras experiências inicialmente', async () => {
    render(<ProfilePage />);

    expect(
      await screen.findByText('Experiência profissional 1'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Experiência profissional 2'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Experiência profissional 3'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Experiência profissional 4'),
    ).not.toBeInTheDocument();
  });

  it('deve exibir todas as experiências ao clicar em mostrar mais', async () => {
    render(<ProfilePage />);

    const botao = await screen.findByRole('button', {
      name: 'Mostrar mais experiências',
    });

    fireEvent.click(botao);

    expect(
      screen.getByText('Experiência profissional 4'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Experiência profissional 5'),
    ).toBeInTheDocument();
  });

  it('deve ocultar as experiências adicionais ao clicar em mostrar menos', async () => {
    render(<ProfilePage />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Mostrar mais experiências',
      }),
    );

    expect(
      screen.getByText('Experiência profissional 4'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Mostrar menos experiências',
      }),
    );

    expect(
      screen.queryByText('Experiência profissional 4'),
    ).not.toBeInTheDocument();
  });

  it('não deve exibir o botão de expandir quando houver três experiências ou menos', async () => {
    vi.mocked(userService.getMe).mockResolvedValue(
      criarPerfil({
        experiences: [
          { description: 'Experiência 1' },
          { description: 'Experiência 2' },
          { description: 'Experiência 3' },
        ],
      }),
    );

    render(<ProfilePage />);

    await screen.findByText('Experiência 1');

    expect(
      screen.queryByRole('button', {
        name: 'Mostrar mais experiências',
      }),
    ).not.toBeInTheDocument();
  });

  it('deve exibir os projetos do usuário', async () => {
    render(<ProfilePage />);

    expect(await screen.findByText('Projetos')).toBeInTheDocument();

    expect(screen.getByText('Projeto Alpha')).toBeInTheDocument();
    expect(screen.getByText('Projeto Beta')).toBeInTheDocument();

    expect(
      screen.getByText('Descrição do projeto Alpha.'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Descrição do projeto Beta.'),
    ).toBeInTheDocument();
  });

  it('deve transformar o nome do projeto em link quando houver URL', async () => {
    render(<ProfilePage />);

    const link = await screen.findByRole('link', {
      name: 'Projeto Alpha',
    });

    expect(link).toHaveAttribute(
      'href',
      'https://github.com/ana/alpha',
    );

    expect(link).toHaveAttribute('target', '_blank');
  });

  it('não deve criar um link para projeto sem URL', async () => {
    render(<ProfilePage />);

    await screen.findByText('Projeto Beta');

    expect(
      screen.queryByRole('link', { name: 'Projeto Beta' }),
    ).not.toBeInTheDocument();
  });

  it('deve permitir abrir o modal de edição do próprio perfil', async () => {
    render(<ProfilePage />);

    await screen.findByTestId('user-avatar');

    fireEvent.click(
      screen.getByRole('button', { name: 'Editar perfil' }),
    );

    expect(
      screen.getByTestId('edit-profile-modal'),
    ).toBeInTheDocument();
  });

  it('deve permitir fechar o modal de edição', async () => {
    render(<ProfilePage />);

    await screen.findByTestId('user-avatar');

    fireEvent.click(
      screen.getByRole('button', { name: 'Editar perfil' }),
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Fechar edição' }),
    );

    expect(
      screen.queryByTestId('edit-profile-modal'),
    ).not.toBeInTheDocument();
  });

  it('não deve exibir o botão de edição no perfil de outro usuário', async () => {
    mockEmail.value = 'carlos@email.com';

    render(<ProfilePage />);

    await screen.findByTestId('user-avatar');

    expect(
      screen.queryByRole('button', { name: 'Editar perfil' }),
    ).not.toBeInTheDocument();
  });

  it('deve atualizar o perfil ao executar o sucesso da edição', async () => {
    render(<ProfilePage />);

    await screen.findByTestId('user-avatar');

    fireEvent.click(
      screen.getByRole('button', { name: 'Editar perfil' }),
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Salvar perfil' }),
    );

    await waitFor(() => {
      expect(userService.getMe).toHaveBeenCalledTimes(2);
    });
  });

  it('deve utilizar o perfil alternativo quando falhar a busca do próprio perfil', async () => {
    vi.mocked(userService.getMe).mockRejectedValue(
      new Error('Erro de conexão'),
    );

    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ProfilePage />);

    expect(
      await screen.findAllByText('Aluno do CIn'),
    ).toHaveLength(2);
    
    expect(
      screen.getByText('acin123@cin.ufpe.br'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Bolsista de iniciação científica.'),
    ).toBeInTheDocument();

    expect(screen.getByText('TaskFlow')).toBeInTheDocument();
    expect(screen.getByText('AutoBot')).toBeInTheDocument();
  });

  it('deve exibir o erro ao falhar a busca do perfil de outro usuário', async () => {
    mockEmail.value = 'inexistente@email.com';

    vi.mocked(userService.getProfileByEmail).mockRejectedValue(
      new Error('Perfil não encontrado'),
    );

    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ProfilePage />);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        'Erro ao carregar perfil:',
        expect.any(Error),
      );
    });

    expect(
      screen.queryByText('Aluno do CIn'),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText('Carregando perfil institucional...'),
    ).not.toBeInTheDocument();
  });

  it('deve exportar o currículo em PDF usando o email do perfil', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:pdf-teste');
    const revokeObjectURL = vi.fn();

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });

    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });

    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(<ProfilePage />);

    await screen.findByTestId('user-avatar');

    fireEvent.click(
      screen.getByRole('button', {
        name: /Exportar como PDF/i,
      }),
    );

    await waitFor(() => {
      expect(userService.exportPdf).toHaveBeenCalledWith('me');
      expect(createObjectURL).toHaveBeenCalledWith(
        expect.any(Blob),
      );
      expect(click).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith(
        'blob:pdf-teste',
      );
    });
  });

  it('deve exportar o PDF utilizando o email quando estiver no perfil de outro usuário', async () => {
    mockEmail.value = 'carlos@email.com';

    const createObjectURL = vi.fn().mockReturnValue('blob:pdf-teste');
    const revokeObjectURL = vi.fn();

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });

    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });

    vi.spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(<ProfilePage />);

    await screen.findByTestId('user-avatar');

    fireEvent.click(
      screen.getByRole('button', {
        name: /Exportar como PDF/i,
      }),
    );

    await waitFor(() => {
      expect(userService.exportPdf).toHaveBeenCalledWith(
        'carlos@email.com',
      );
    });
  });

  it('deve exibir uma mensagem quando a exportação do PDF falhar', async () => {
    const alerta = vi
      .spyOn(window, 'alert')
      .mockImplementation(() => {});

    vi.mocked(userService.exportPdf).mockRejectedValue(
      new Error('Falha na exportação'),
    );

    render(<ProfilePage />);

    await screen.findByTestId('user-avatar');

    fireEvent.click(
      screen.getByRole('button', {
        name: /Exportar como PDF/i,
      }),
    );

    await waitFor(() => {
      expect(alerta).toHaveBeenCalledWith(
        'Erro ao exportar como PDF: Falha na exportação',
      );
    });
  });

  it('deve exibir uma mensagem padrão quando a exportação falhar sem mensagem de erro', async () => {
    const alerta = vi
      .spyOn(window, 'alert')
      .mockImplementation(() => {});

    vi.mocked(userService.exportPdf).mockRejectedValue({});

    render(<ProfilePage />);

    await screen.findByTestId('user-avatar');

    fireEvent.click(
      screen.getByRole('button', {
        name: /Exportar como PDF/i,
      }),
    );

    await waitFor(() => {
      expect(alerta).toHaveBeenCalledWith(
        'Erro ao exportar como PDF: Tente novamente mais tarde.',
      );
    });
  });
});
