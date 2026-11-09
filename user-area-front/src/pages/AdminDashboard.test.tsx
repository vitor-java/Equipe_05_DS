
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor} from '@testing-library/react';
import { within } from '@testing-library/react';
import { AdminDashboard } from './AdminDashboard';
import {
  adminService,
  CATEGORY_OPTIONS,
  type RecipientOption,
  type AlertItem,
} from '../services/adminService';

// Simula os serviços da API.
vi.mock('../services/adminService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/adminService')>();

  return {
    ...actual,
    adminService: {
      getAlerts: vi.fn(),
      searchRecipients: vi.fn(),
      createAlert: vi.fn(),
      deleteAlert: vi.fn(),
    },
  };
});

// Evita duplicidade de nomes nos testes.
vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: () => null,
}));

const criarDestinatario = (
  dados: Partial<RecipientOption> = {},
): RecipientOption =>
  ({
    id: 'user-1',
    name: 'Ana Silva',
    email: 'ana@email.com',
    role: 'STUDENT',
    type: 'USER',
    photoUrl: null,
    ...dados,
  }) as RecipientOption;

const criarAlerta = (
  dados: Partial<AlertItem> = {},
): AlertItem =>
  ({
    id: 'alert-1',
    subject: 'Manutenção do estacionamento',
    message: 'O estacionamento estará fechado amanhã.',
    audience: 'USERS',
    severity: 'HIGH',
    createdAt: '2026-10-20T10:00:00.000Z',
    recipientsCount: 1,
    recipientsPreview: [],
    ...dados,
  }) as AlertItem;

const preencherFormulario = () => {
  fireEvent.change(
    screen.getByPlaceholderText(
      'Ex: Toyota Corolla - Estacionamento Irregular',
    ),
    {
      target: { value: 'Aviso importante' },
    },
  );

  fireEvent.change(
    screen.getByPlaceholderText('Descreva o conteúdo do aviso...'),
    {
      target: { value: 'Esta é uma mensagem de teste.' },
    },
  );
};

const selecionarDestinatario = async (
  destinatario = criarDestinatario(),
) => {
  vi.mocked(adminService.searchRecipients).mockResolvedValue([destinatario]);

  const placeholderInicial =
    'Pesquisar por nome ou placa do veículo...';

  const campoPesquisa = screen.getByPlaceholderText(placeholderInicial);

  fireEvent.change(campoPesquisa, {
    target: { value: destinatario.name },
  });

  const resultado = await screen.findByText(destinatario.name);

  fireEvent.click(resultado);

  await waitFor(() => {
    expect(screen.getByText(destinatario.name)).toBeInTheDocument();
  });
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(adminService.getAlerts).mockResolvedValue({
      items: [],
      totalPages: 1,
    });

    vi.mocked(adminService.searchRecipients).mockResolvedValue([]);
    vi.mocked(adminService.createAlert).mockResolvedValue(undefined as never);
    vi.mocked(adminService.deleteAlert).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve renderizar o título e a descrição do painel', async () => {
    render(<AdminDashboard />);

    expect(screen.getByText('Emitir Alerta')).toBeInTheDocument();

    expect(
      screen.getByText(
        'Selecione múltiplos públicos-alvo ou usuários específicos por nome ou placa do veículo.',
      ),
    ).toBeInTheDocument();

    expect(
      await screen.findByText('Nenhum alerta registado no sistema.'),
    ).toBeInTheDocument();
  });

  it('deve carregar os alertas ao iniciar o componente', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(adminService.getAlerts).toHaveBeenCalledWith(1, 5);
    });
  });

  it('deve exibir uma mensagem quando não existirem alertas', async () => {
    render(<AdminDashboard />);

    expect(
      await screen.findByText('Nenhum alerta registado no sistema.'),
    ).toBeInTheDocument();
  });

  it('deve exibir os alertas retornados pela API', async () => {
    vi.mocked(adminService.getAlerts).mockResolvedValue({
      items: [criarAlerta()],
      totalPages: 1,
    });

    render(<AdminDashboard />);

    expect(
      await screen.findByText('Manutenção do estacionamento'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('O estacionamento estará fechado amanhã.'),
    ).toBeInTheDocument();
  });

  it('deve exibir a quantidade de destinatários do alerta', async () => {
    vi.mocked(adminService.getAlerts).mockResolvedValue({
      items: [criarAlerta({ recipientsCount: 5 })],
      totalPages: 1,
    });

    render(<AdminDashboard />);

    expect(
      await screen.findByText('Qtd. Destinatários: 5'),
    ).toBeInTheDocument();
  });

  it('deve pesquisar destinatários após digitar uma consulta', async () => {
    const destinatario = criarDestinatario();

    vi.mocked(adminService.searchRecipients).mockResolvedValue([
      destinatario,
    ]);

    render(<AdminDashboard />);

    fireEvent.change(
      screen.getByPlaceholderText(
        'Pesquisar por nome ou placa do veículo...',
      ),
      {
        target: { value: 'Ana' },
      },
    );

    expect(
      await screen.findByText('Ana Silva'),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(adminService.searchRecipients).toHaveBeenCalledWith(
        'Ana',
        [],
      );
    });
  });

  it('não deve pesquisar destinatários quando a consulta estiver vazia', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(adminService.getAlerts).toHaveBeenCalled();
    });

    expect(adminService.searchRecipients).not.toHaveBeenCalled();
  });

  it('deve adicionar um destinatário selecionado', async () => {
    render(<AdminDashboard />);

    await selecionarDestinatario();

    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
  });

  it('deve remover um destinatário selecionado', async () => {
    render(<AdminDashboard />);

    await selecionarDestinatario();

    const nomeDestinatario = screen.getByText('Ana Silva');
    const recipiente = nomeDestinatario.parentElement;

    expect(recipiente).not.toBeNull();

    const botaoRemover = within(recipiente!).getByRole('button');

    fireEvent.click(botaoRemover);

    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
  });

  it('deve fechar a lista de pesquisa ao clicar fora dela', async () => {
    vi.mocked(adminService.searchRecipients).mockResolvedValue([
      criarDestinatario(),
    ]);

    render(<AdminDashboard />);

    fireEvent.change(
      screen.getByPlaceholderText(
        'Pesquisar por nome ou placa do veículo...',
      ),
      {
        target: { value: 'Ana' },
      },
    );

    expect(
      await screen.findByText('Ana Silva'),
    ).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
    });
  });

  it('deve permitir alterar o nível de severidade', async () => {
    render(<AdminDashboard />);

    // Aguarda a conclusão do carregamento inicial.
    await screen.findByText('Nenhum alerta registado no sistema.');

    const select = screen.getByDisplayValue('Alto');

    fireEvent.change(select, {
      target: { value: 'LOW' },
    });

    expect(screen.getByDisplayValue('Baixo')).toBeInTheDocument();
  });

  it('deve validar o formulário quando os campos estiverem vazios', async () => {
    const alerta = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<AdminDashboard />);

    await screen.findByText('Nenhum alerta registado no sistema.');

    fireEvent.submit(
      screen.getByRole('button', { name: /enviar/i }).closest('form')!,
    );

    expect(alerta).toHaveBeenCalledWith(
      'Preencha o assunto, a mensagem e selecione pelo menos um destinatário.',
    );

    expect(adminService.createAlert).not.toHaveBeenCalled();
  });
  it('deve enviar um alerta para usuários selecionados', async () => {
    render(<AdminDashboard />);

    await selecionarDestinatario();
    preencherFormulario();

    fireEvent.submit(
      screen.getByPlaceholderText(
        'Ex: Toyota Corolla - Estacionamento Irregular',
      ).closest('form')!,
    );

    await waitFor(() => {
      expect(adminService.createAlert).toHaveBeenCalledWith({
        subject: 'Aviso importante',
        message: 'Esta é uma mensagem de teste.',
        severity: 'HIGH',
        audience: 'USERS',
        recipientIds: ['user-1'],
      });
    });

    expect(
      await screen.findByText('Alerta emitido com sucesso!'),
    ).toBeInTheDocument();
  });

  it('deve limpar os campos após enviar um alerta com sucesso', async () => {
    render(<AdminDashboard />);

    await selecionarDestinatario();
    preencherFormulario();

    fireEvent.submit(
      screen.getByPlaceholderText(
        'Ex: Toyota Corolla - Estacionamento Irregular',
      ).closest('form')!,
    );

    await waitFor(() => {
      expect(adminService.createAlert).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(
          'Ex: Toyota Corolla - Estacionamento Irregular',
        ),
      ).toHaveValue('');

      expect(
        screen.getByPlaceholderText('Descreva o conteúdo do aviso...'),
      ).toHaveValue('');
    });
  });

  it('deve enviar um alerta para uma categoria selecionada', async () => {
    const categoria = {
      ...CATEGORY_OPTIONS[0],
      type: 'CATEGORY',
    } as RecipientOption;

    render(<AdminDashboard />);

    await selecionarDestinatario(categoria);
    preencherFormulario();

    fireEvent.submit(
      screen.getByPlaceholderText(
        'Ex: Toyota Corolla - Estacionamento Irregular',
      ).closest('form')!,
    );

    await waitFor(() => {
      expect(adminService.createAlert).toHaveBeenCalledWith({
        subject: 'Aviso importante',
        message: 'Esta é uma mensagem de teste.',
        severity: 'HIGH',
        audience: categoria.id,
        recipientIds: [],
      });
    });
  });

  it('deve exibir um aviso ao selecionar usuário já abrangido por categoria', async () => {
    const alerta = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const categoria = {
      ...CATEGORY_OPTIONS[0],
      type: 'CATEGORY',
    } as RecipientOption;

    const usuario = criarDestinatario({
      role: categoria.role,
    });

    render(<AdminDashboard />);

    await selecionarDestinatario(categoria);

    vi.mocked(adminService.searchRecipients).mockResolvedValue([usuario]);

    fireEvent.change(screen.getByPlaceholderText(''), {
      target: { value: usuario.name },
    });

    const resultado = await screen.findByText(usuario.name);

    fireEvent.click(resultado);

    expect(alerta).toHaveBeenCalledWith(
      expect.stringContaining('Este utilizador já está abrangido'),
    );
  });

  it('deve exibir um alerta de erro quando o envio falhar', async () => {
    const alerta = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const erro = new Error('Falha ao publicar alerta.');

    vi.mocked(adminService.createAlert).mockRejectedValue(erro);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<AdminDashboard />);

    await selecionarDestinatario();
    preencherFormulario();

    fireEvent.submit(
      screen.getByPlaceholderText(
        'Ex: Toyota Corolla - Estacionamento Irregular',
      ).closest('form')!,
    );

    await waitFor(() => {
      expect(alerta).toHaveBeenCalledWith('Falha ao publicar alerta.');
    });
  });

  it('deve excluir um alerta', async () => {
    vi.mocked(adminService.getAlerts).mockResolvedValue({
      items: [criarAlerta()],
      totalPages: 1,
    });

    render(<AdminDashboard />);

    await screen.findByText('Manutenção do estacionamento');

    fireEvent.click(screen.getByTitle('Apagar comunicado'));

    await waitFor(() => {
      expect(adminService.deleteAlert).toHaveBeenCalledWith('alert-1');
    });

    expect(adminService.getAlerts).toHaveBeenCalledWith(1, 5);
  });

  it('deve permitir expandir os detalhes dos destinatários', async () => {
    const alerta = criarAlerta({
      recipientsPreview: [
        {
          id: 'user-1',
          name: 'Ana Silva',
          readAt: null,
        },
        {
          id: 'user-2',
          name: 'Carlos Souza',
          readAt: '2026-10-20T11:00:00.000Z',
        },
      ] as AlertItem['recipientsPreview'],
    });

    vi.mocked(adminService.getAlerts).mockResolvedValue({
      items: [alerta],
      totalPages: 1,
    });

    render(<AdminDashboard />);

    fireEvent.click(await screen.findByText('Abrir detalhes'));

    expect(
      await screen.findByText('Estado dos Destinatários:'),
    ).toBeInTheDocument();

    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('Carlos Souza')).toBeInTheDocument();
  });

  it('deve fechar os detalhes dos destinatários ao clicar novamente', async () => {
    const alerta = criarAlerta({
      recipientsPreview: [
        {
          id: 'user-1',
          name: 'Ana Silva',
          readAt: null,
        },
        {
          id: 'user-2',
          name: 'Carlos Souza',
          readAt: null,
        },
      ] as AlertItem['recipientsPreview'],
    });

    vi.mocked(adminService.getAlerts).mockResolvedValue({
      items: [alerta],
      totalPages: 1,
    });

    render(<AdminDashboard />);

    fireEvent.click(await screen.findByText('Abrir detalhes'));

    expect(
      await screen.findByText('Estado dos Destinatários:'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('Fechar detalhes'));

    await waitFor(() => {
      expect(
        screen.queryByText('Estado dos Destinatários:'),
      ).not.toBeInTheDocument();
    });
  });

  it('deve exibir os controles de paginação quando houver mais de uma página', async () => {
    vi.mocked(adminService.getAlerts).mockResolvedValue({
      items: [criarAlerta()],
      totalPages: 3,
    });

    render(<AdminDashboard />);

    expect(
      await screen.findByText('Página 1 de 3'),
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Seguinte' })).toBeEnabled();
  });

  it('deve carregar a próxima página ao clicar em Seguinte', async () => {
    vi.mocked(adminService.getAlerts).mockResolvedValue({
      items: [criarAlerta()],
      totalPages: 3,
    });

    render(<AdminDashboard />);

    fireEvent.click(await screen.findByRole('button', { name: 'Seguinte' }));

    await waitFor(() => {
      expect(adminService.getAlerts).toHaveBeenCalledWith(2, 5);
    });

    expect(
      await screen.findByText('Página 2 de 3'),
    ).toBeInTheDocument();
  });

  it('deve carregar a página anterior ao clicar em Anterior', async () => {
    vi.mocked(adminService.getAlerts).mockResolvedValue({
      items: [criarAlerta()],
      totalPages: 3,
    });

    render(<AdminDashboard />);

    fireEvent.click(await screen.findByRole('button', { name: 'Seguinte' }));

    await screen.findByText('Página 2 de 3');

    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));

    await waitFor(() => {
      expect(adminService.getAlerts).toHaveBeenLastCalledWith(1, 5);
    });

    expect(
      await screen.findByText('Página 1 de 3'),
    ).toBeInTheDocument();
  });

  it('deve tratar erros ao carregar os alertas', async () => {
    vi.mocked(adminService.getAlerts).mockRejectedValue(
      new Error('Erro de conexão'),
    );

    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        'Erro ao carregar alertas:',
        expect.any(Error),
      );
    });
  });

  it('deve tratar erros ao excluir um alerta', async () => {
    vi.mocked(adminService.getAlerts).mockResolvedValue({
      items: [criarAlerta()],
      totalPages: 1,
    });

    vi.mocked(adminService.deleteAlert).mockRejectedValue(
      new Error('Erro ao excluir'),
    );

    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<AdminDashboard />);

    await screen.findByText('Manutenção do estacionamento');

    fireEvent.click(screen.getByTitle('Apagar comunicado'));

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        'Erro ao apagar alerta:',
        expect.any(Error),
      );
    });
  });
});
