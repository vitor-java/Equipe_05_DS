import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormModal } from './FormModal';
import { createPortal } from 'react-dom';

vi.mock('@cincoders/cinnamon', () => ({
  Text: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => (
    <span data-testid="modal-title" data-variant={variant}>
      {children}
    </span>
  ),
}));

describe('FormModal', () => {
  const criarProps = () => ({
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    title: 'Modal de teste',
    isSubmitting: false,
    submitLabel: 'Salvar',
    children: <input placeholder="Campo de teste" />,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não deve renderizar o modal quando estiver fechado', () => {
    const props = criarProps();

    render(<FormModal {...props} isOpen={false} />);

    expect(screen.queryByText('Modal de teste')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Campo de teste')).not.toBeInTheDocument();
  });

  it('deve renderizar o modal quando estiver aberto', () => {
    const props = criarProps();

    render(<FormModal {...props} />);

    expect(screen.getByText('Modal de teste')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Campo de teste')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('deve renderizar o título com a variante padrão', () => {
    const props = criarProps();

    render(<FormModal {...props} />);

    expect(screen.getByTestId('modal-title')).toHaveAttribute(
      'data-variant',
      'announce',
    );
  });

  it('deve permitir personalizar a variante do título', () => {
    const props = criarProps();

    render(
      <FormModal
        {...props}
        titleVariant={'body' as any}
      />,
    );

    expect(screen.getByTestId('modal-title')).toHaveAttribute(
      'data-variant',
      'body',
    );
  });

  it('deve renderizar os elementos filhos recebidos', () => {
    const props = criarProps();

    render(
      <FormModal
        {...props}
        children={
          <div>
            <label htmlFor="nome">Nome</label>
            <input id="nome" placeholder="Digite seu nome" />
          </div>
        }
      />,
    );

    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Digite seu nome')).toBeInTheDocument();
  });

  it('deve fechar o modal ao clicar no botão de fechar', () => {
    const props = criarProps();

    render(<FormModal {...props} />);

    const botoes = screen.getAllByRole('button');

    // O primeiro botão corresponde ao ícone de fechar.
    fireEvent.click(botoes[0]);

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('deve fechar o modal ao clicar em cancelar', () => {
    const props = criarProps();

    render(<FormModal {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('não deve permitir cancelar durante o envio', () => {
    const props = criarProps();

    render(<FormModal {...props} isSubmitting={true} />);

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });

  it('deve enviar o formulário ao clicar no botão de submit', () => {
    const props = criarProps();

    const { container } = render(<FormModal {...props} />);

    const formulario = container.querySelector('form');

    expect(formulario).not.toBeNull();

    fireEvent.submit(formulario!);

    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('deve exibir o texto personalizado do botão de envio', () => {
    const props = criarProps();

    render(
      <FormModal
        {...props}
        submitLabel="Criar usuário"
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Criar usuário' }),
    ).toBeInTheDocument();
  });

  it('deve desabilitar o botão de envio durante o carregamento', () => {
    const props = criarProps();

    render(<FormModal {...props} isSubmitting={true} />);

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('deve exibir o indicador de carregamento durante o envio', () => {
    const props = criarProps();

    const { container } = render(
      <FormModal {...props} isSubmitting={true} />,
    );

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('não deve exibir o indicador de carregamento quando não estiver enviando', () => {
    const props = criarProps();

    const { container } = render(
      <FormModal {...props} isSubmitting={false} />,
    );

    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
  });

  it('deve fechar o modal ao clicar no fundo externo', () => {
    const props = criarProps();

    const { container } = render(<FormModal {...props} />);

    const fundo = container.firstChild as HTMLElement;

    fireEvent.mouseDown(fundo);

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('não deve fechar o modal ao clicar dentro do conteúdo', () => {
    const props = criarProps();

    render(<FormModal {...props} />);

    fireEvent.mouseDown(screen.getByPlaceholderText('Campo de teste'));

    expect(props.onClose).not.toHaveBeenCalled();
  });
  
  it('não deve fechar o modal ao clicar em um select renderizado por portal', () => {
    const props = criarProps();

    render(
      <FormModal
        {...props}
        children={createPortal(
          <div data-slot="select-content" data-testid="conteudo-select">
            Opções do select
          </div>,
          document.body,
        )}
      />,
    );

    fireEvent.mouseDown(screen.getByTestId('conteudo-select'));

    expect(props.onClose).not.toHaveBeenCalled();
  });


  it('deve aplicar a largura média por padrão', () => {
    const props = criarProps();

    const { container } = render(<FormModal {...props} />);

    const conteudo = container.querySelector('.max-w-md');

    expect(conteudo).toBeInTheDocument();
  });

  it('deve aplicar a largura grande quando size for lg', () => {
    const props = criarProps();

    const { container } = render(
      <FormModal {...props} size="lg" />,
    );

    const conteudo = container.querySelector('.max-w-lg');

    expect(conteudo).toBeInTheDocument();
  });

  it('deve manter o modal aberto quando o envio estiver em andamento', () => {
    const props = criarProps();

    const { container } = render(
      <FormModal {...props} isSubmitting={true} />,
    );

    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByText('Modal de teste')).toBeInTheDocument();
  });
  
  it('deve fechar o modal ao clicar em outro elemento renderizado por portal', () => {
    const props = criarProps();

    render(
      <FormModal
        {...props}
        children={createPortal(
          <div data-testid="outro-portal">
            Outro conteúdo
          </div>,
          document.body,
        )}
      />,
    );

    fireEvent.mouseDown(screen.getByTestId('outro-portal'));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
