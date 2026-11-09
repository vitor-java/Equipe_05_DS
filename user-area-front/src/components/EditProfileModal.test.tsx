import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EditProfileModal } from './EditProfileModal';
import { userService } from '../services/userService';
import type { UserProfile } from '../services/userService';

vi.mock('../services/userService', () => ({
  userService: {
    uploadAvatar: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

vi.mock('./UserAvatar', () => ({
  getAvatarUrl: vi.fn((photoUrl) => photoUrl || ''),
  UserAvatar: ({ name }: { name: string }) => (
    <div data-testid="user-avatar">{name}</div>
  ),
}));

const perfil = {
  name: 'João Silva',
  email: 'joao@email.com',
  photoUrl: 'https://exemplo.com/foto.png',
  vehicles: [
    {
      plate: 'ABC1234',
      model: 'Civic',
      color: 'Preto',
    },
  ],
  links: [
    {
      label: 'GitHub',
      url: 'github.com/joao',
    },
  ],
  experiences: [
    {
      description: 'Desenvolvedor',
    },
  ],
  projects: [
    {
      name: 'Projeto 1',
      description: 'Descrição do projeto',
      url: 'github.com/joao/projeto',
    },
  ],
} as UserProfile;

const criarProps = () => ({
  isOpen: true,
  onClose: vi.fn(),
  currentProfile: perfil,
  onSuccess: vi.fn(),
});

describe('EditProfileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Disponibiliza a criação de URLs temporárias para imagens nos testes.
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => 'blob:imagem-teste'),
    });

    vi.mocked(userService.uploadAvatar).mockResolvedValue({} as any);
    vi.mocked(userService.updateProfile).mockResolvedValue(undefined);
  });

  it('não deve renderizar o modal quando estiver fechado', () => {
    const props = criarProps();

    render(<EditProfileModal {...props} isOpen={false} />);

    expect(screen.queryByText('Editar Perfil')).not.toBeInTheDocument();
  });

  it('deve renderizar o modal quando estiver aberto', () => {
    const props = criarProps();

    render(<EditProfileModal {...props} />);

    expect(screen.getByText('Editar Perfil')).toBeInTheDocument();
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByDisplayValue('joao@email.com')).toBeInTheDocument();
    expect(screen.getByText('Veículo para Comunicação Emergencial (Informação Privada)')).toBeInTheDocument();
  });

  it('deve exibir o nome e o email como campos desabilitados', () => {
    const props = criarProps();

    render(<EditProfileModal {...props} />);

    expect(screen.getByDisplayValue('João Silva')).toBeDisabled();
    expect(screen.getByDisplayValue('joao@email.com')).toBeDisabled();
  });

  it('deve preencher os campos com os dados atuais do perfil', () => {
    const props = criarProps();

    render(<EditProfileModal {...props} />);

    expect(screen.getByDisplayValue('ABC1234')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Civic')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Preto')).toBeInTheDocument();
    expect(screen.getByDisplayValue('GitHub')).toBeInTheDocument();
    expect(screen.getByDisplayValue('github.com/joao')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Desenvolvedor')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Projeto 1')).toBeInTheDocument();
  });

  it('deve fechar o modal ao clicar no botão de fechar', () => {
    const props = criarProps();

    render(<EditProfileModal {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('deve fechar o modal ao clicar no fundo externo', () => {
    const props = criarProps();

    const { container } = render(<EditProfileModal {...props} />);

    const fundo = container.firstChild as HTMLElement;

    fireEvent.mouseDown(fundo);

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('não deve fechar o modal ao clicar dentro do conteúdo', () => {
    const props = criarProps();

    render(<EditProfileModal {...props} />);

    fireEvent.mouseDown(screen.getByText('Editar Perfil'));

    expect(props.onClose).not.toHaveBeenCalled();
  });

  describe('Validação da placa', () => {
    it('deve converter a placa para letras maiúsculas', () => {
      const props = criarProps();

      render(<EditProfileModal {...props} />);

      const placa = screen.getByPlaceholderText('ABC1234');

      fireEvent.change(placa, {
        target: { value: 'abc1234' },
      });

      expect(placa).toHaveValue('ABC1234');
    });

    it('deve remover caracteres inválidos da placa', () => {
      const props = criarProps();

      render(<EditProfileModal {...props} />);

      const placa = screen.getByPlaceholderText('ABC1234');

      fireEvent.change(placa, {
        target: { value: 'ab@c-12#34' },
      });

      expect(placa).toHaveValue('ABC1234');
    });

    it('deve limitar a placa a três letras e quatro números', () => {
      const props = criarProps();

      render(<EditProfileModal {...props} />);

      const placa = screen.getByPlaceholderText('ABC1234');

      fireEvent.change(placa, {
        target: { value: 'ABCD12345' },
      });

      expect(placa).toHaveValue('ABC1234');
    });

    it('deve exibir um erro quando a placa estiver em formato inválido', async () => {
      const props = criarProps();

      render(<EditProfileModal {...props} />);

      const placa = screen.getByPlaceholderText('ABC1234');

      fireEvent.change(placa, {
        target: { value: 'ABC123' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

      expect(
        await screen.findByText(
          'A placa deve ter 3 letras e 4 números (ex.: ABC1234).',
        ),
      ).toBeInTheDocument();

      expect(userService.updateProfile).not.toHaveBeenCalled();
    });

    it('deve permitir salvar quando a placa estiver vazia', async () => {
      const props = criarProps();

      render(<EditProfileModal {...props} />);

      fireEvent.change(screen.getByPlaceholderText('ABC1234'), {
        target: { value: '' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

      await waitFor(() => {
        expect(userService.updateProfile).toHaveBeenCalled();
      });
    });
  });

  describe('Gerenciamento de links', () => {
    it('deve adicionar um novo link', () => {
      const props = criarProps();

      render(<EditProfileModal {...props} />);

      const botoesAdicionar = screen.getAllByRole('button', { name: 'Adicionar' });

      fireEvent.click(botoesAdicionar[0]);

      expect(
        screen.getAllByPlaceholderText('Nome (ex: GitHub)'),
      ).toHaveLength(2);
    });

    it('deve remover um link', () => {
      const props = criarProps();

      render(<EditProfileModal {...props} />);

      const botoesRemover = screen.getAllByRole('button', { name: /Remover/ });

      fireEvent.click(botoesRemover[0]);

      expect(screen.queryByDisplayValue('GitHub')).not.toBeInTheDocument();
    });

    it('deve permitir atualizar o nome e a URL de um link', () => {
      const props = criarProps();

      render(<EditProfileModal {...props} />);

      fireEvent.change(screen.getByDisplayValue('GitHub'), {
        target: { value: 'LinkedIn' },
      });

      fireEvent.change(screen.getByDisplayValue('github.com/joao'), {
        target: { value: 'linkedin.com/in/joao' },
      });

      expect(screen.getByDisplayValue('LinkedIn')).toBeInTheDocument();
      expect(screen.getByDisplayValue('linkedin.com/in/joao')).toBeInTheDocument();
    });

    it('deve impedir adicionar mais de dez links', () => {
      const props = criarProps();

      const perfilComDezLinks = {
        ...perfil,
        links: Array.from({ length: 10 }, (_, index) => ({
          label: `Link ${index + 1}`,
          url: `https://exemplo.com/${index + 1}`,
        })),
      } as UserProfile;

      render(
        <EditProfileModal
          {...props}
          currentProfile={perfilComDezLinks}
        />,
      );

      const botoesAdicionar = screen.getAllByRole('button', { name: 'Adicionar' });

      expect(botoesAdicionar[0]).toBeDisabled();
    });
  });

  describe('Gerenciamento de experiências', () => {
    it('deve adicionar uma experiência', () => {
      const props = criarProps();

      render(<EditProfileModal {...props} />);

      const botoesAdicionar = screen.getAllByRole('button', { name: 'Adicionar' });

      fireEvent.click(botoesAdicionar[1]);

      expect(
        screen.getAllByPlaceholderText('Ex: Bolsista de iniciação científica'),
      ).toHaveLength(2);
    });

    it('deve atualizar uma experiência', () => {
      const props = criarProps();

      render(<EditProfileModal {...props} />);

      fireEvent.change(screen.getByDisplayValue('Desenvolvedor'), {
        target: { value: 'Desenvolvedor Full Stack' },
      });

      expect(screen.getByDisplayValue('Desenvolvedor Full Stack')).toBeInTheDocument();
    });

    it('deve remover uma experiência', () => {
      const props = criarProps();

      render(<EditProfileModal {...props} />);

      const botoesRemover = screen.getAllByRole('button', { name: /Remover/ });

      fireEvent.click(botoesRemover[1]);

      expect(
        screen.queryByDisplayValue('Desenvolvedor'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Gerenciamento de projetos', () => {
    it('deve adicionar um projeto', () => {
      const props = criarProps();

      render(<EditProfileModal {...props} />);

      const botoesAdicionar = screen.getAllByRole('button', { name: 'Adicionar' });

      fireEvent.click(botoesAdicionar[2]);

      expect(
        screen.getAllByPlaceholderText('Nome do Projeto (ex: TaskFlow)'),
      ).toHaveLength(2);
    });

    it('deve atualizar os dados de um projeto', () => {
      const props = criarProps();

      render(<EditProfileModal {...props} />);

      fireEvent.change(screen.getByDisplayValue('Projeto 1'), {
        target: { value: 'Novo Projeto' },
      });

      fireEvent.change(screen.getByDisplayValue('Descrição do projeto'), {
        target: { value: 'Nova descrição' },
      });

      fireEvent.change(screen.getByDisplayValue('github.com/joao/projeto'), {
        target: { value: 'github.com/joao/novo-projeto' },
      });

      expect(screen.getByDisplayValue('Novo Projeto')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Nova descrição')).toBeInTheDocument();
      expect(screen.getByDisplayValue('github.com/joao/novo-projeto')).toBeInTheDocument();
    });

    it('deve remover um projeto', () => {
      const props = criarProps();

      render(<EditProfileModal {...props} />);

      const botoesRemover = screen.getAllByRole('button', { name: /Remover/ });

      fireEvent.click(botoesRemover[2]);

      expect(screen.queryByDisplayValue('Projeto 1')).not.toBeInTheDocument();
    });
  });

  describe('Alteração de foto', () => {
    it('deve exibir erro ao selecionar um formato inválido', async () => {
      const props = criarProps();

      const { container } = render(<EditProfileModal {...props} />);

      const arquivo = new File(['conteúdo'], 'arquivo.gif', {
        type: 'image/gif',
      });

      const input = container.querySelector('#avatar-upload') as HTMLInputElement;

      fireEvent.change(input, {
        target: { files: [arquivo] },
      });

      expect(await screen.findByText('Formato de imagem inválido.')).toBeInTheDocument();

      expect(userService.uploadAvatar).not.toHaveBeenCalled();
    });

    it('deve exibir erro quando a imagem ultrapassar cinco MB', async () => {
      const props = criarProps();

      const { container } = render(<EditProfileModal {...props} />);

      const arquivo = new File(
        [new Uint8Array(5 * 1024 * 1024 + 1)],
        'foto.png',
        { type: 'image/png' },
      );

      const input = container.querySelector('#avatar-upload') as HTMLInputElement;

      fireEvent.change(input, {
        target: { files: [arquivo] },
      });

      expect(
        await screen.findByText('A imagem deve ter no máximo 5 MB.'),
      ).toBeInTheDocument();

      expect(userService.uploadAvatar).not.toHaveBeenCalled();
    });

    it('deve aceitar uma imagem PNG e atualizar a prévia', () => {
      const props = criarProps();

      const criarUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:foto-teste');

      const { container } = render(<EditProfileModal {...props} />);

      const arquivo = new File(['imagem'], 'foto.png', {
        type: 'image/png',
      });

      const input = container.querySelector('#avatar-upload') as HTMLInputElement;

      fireEvent.change(input, {
        target: { files: [arquivo] },
      });

      expect(criarUrl).toHaveBeenCalledWith(arquivo);
      expect(screen.getByRole('img', { name: 'João Silva' })).toHaveAttribute(
        'src',
        'blob:foto-teste',
      );

      criarUrl.mockRestore();
    });

    it('deve aceitar uma imagem JPEG', () => {
      const props = criarProps();

      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:foto-jpeg');

      const { container } = render(<EditProfileModal {...props} />);

      const arquivo = new File(['imagem'], 'foto.jpg', {
        type: 'image/jpeg',
      });

      const input = container.querySelector('#avatar-upload') as HTMLInputElement;

      fireEvent.change(input, {
        target: { files: [arquivo] },
      });

      expect(screen.getByRole('img', { name: 'João Silva' })).toBeInTheDocument();

      vi.restoreAllMocks();
    });

    it('deve aceitar uma imagem WEBP', () => {
      const props = criarProps();

      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:foto-webp');

      const { container } = render(<EditProfileModal {...props} />);

      const arquivo = new File(['imagem'], 'foto.webp', {
        type: 'image/webp',
      });

      const input = container.querySelector('#avatar-upload') as HTMLInputElement;

      fireEvent.change(input, {
        target: { files: [arquivo] },
      });

      expect(screen.getByRole('img', { name: 'João Silva' })).toBeInTheDocument();

      vi.restoreAllMocks();
    });
  });

  describe('Salvamento do perfil', () => {
    it('deve salvar as alterações do perfil', async () => {
      const props = criarProps();

      render(<EditProfileModal {...props} />);

      fireEvent.change(screen.getByPlaceholderText('Modelo'), {
        target: { value: 'Corolla' },
      });

      fireEvent.change(screen.getByPlaceholderText('Cor'), {
        target: { value: 'Branco' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

      await waitFor(() => {
        expect(userService.updateProfile).toHaveBeenCalledWith({
          vehicle: {
            plate: 'ABC1234',
            model: 'Corolla',
            color: 'Branco',
          },
          links: [
            {
              label: 'GitHub',
              url: 'github.com/joao',
            },
          ],
          experiences: ['Desenvolvedor'],
          projects: [
            {
              name: 'Projeto 1',
              description: 'Descrição do projeto',
              url: 'github.com/joao/projeto',
            },
          ],
        });
      });

      expect(props.onSuccess).toHaveBeenCalledTimes(1);
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('deve enviar a foto antes de atualizar o perfil', async () => {
      const props = criarProps();

      const ordemChamadas: string[] = [];

      vi.mocked(userService.uploadAvatar).mockImplementation(async () => {
        ordemChamadas.push('foto');

        return undefined as unknown as Awaited<
          ReturnType<typeof userService.uploadAvatar>
        >;
      });

      vi.mocked(userService.updateProfile).mockImplementation(async () => {
        ordemChamadas.push('perfil');
      });

      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:foto-teste');

      const { container } = render(<EditProfileModal {...props} />);

      const arquivo = new File(['imagem'], 'foto.png', {
        type: 'image/png',
      });

      const input = container.querySelector('#avatar-upload') as HTMLInputElement;

      fireEvent.change(input, {
        target: { files: [arquivo] },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

      await waitFor(() => {
        expect(userService.uploadAvatar).toHaveBeenCalledWith(arquivo);
        expect(userService.updateProfile).toHaveBeenCalled();
      });

      expect(ordemChamadas).toEqual(['foto', 'perfil']);
    });

    it('deve exibir uma mensagem de erro quando o salvamento falhar', async () => {
      const props = criarProps();

      vi.mocked(userService.updateProfile).mockRejectedValue(
        new Error('Falha ao atualizar perfil'),
      );

      render(<EditProfileModal {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

      expect(
        await screen.findByText('Falha ao atualizar perfil'),
      ).toBeInTheDocument();

      expect(props.onSuccess).not.toHaveBeenCalled();
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('deve exibir uma mensagem padrão quando o erro não possuir mensagem', async () => {
      const props = criarProps();

      vi.mocked(userService.updateProfile).mockRejectedValue({});

      render(<EditProfileModal {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

      expect(
        await screen.findByText('Erro ao salvar as alterações do perfil.'),
      ).toBeInTheDocument();
    });

    it('deve encerrar o estado de carregamento após uma falha', async () => {
      const props = criarProps();

      vi.mocked(userService.updateProfile).mockRejectedValue(
        new Error('Erro de teste'),
      );

      render(<EditProfileModal {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

      await screen.findByText('Erro de teste');

      expect(
        screen.getByRole('button', { name: 'Salvar Alterações' }),
      ).toBeEnabled();
    });
  });

  it('deve desabilitar o botão de salvar durante o carregamento', async () => {
    const props = criarProps();

    let concluirRequisicao!: () => void;

    vi.mocked(userService.updateProfile).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          concluirRequisicao = resolve;
        }),
    );

    render(<EditProfileModal {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    expect(
      await screen.findByRole('button', { name: 'Salvando...' }),
    ).toBeDisabled();

    concluirRequisicao();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Salvar Alterações' }),
      ).toBeEnabled();
    });
  });
});
