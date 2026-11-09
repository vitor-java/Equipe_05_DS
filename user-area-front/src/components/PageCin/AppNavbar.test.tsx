import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextProps } from 'react-oidc-context';
import { AppNavbar } from './AppNavbar';
import { useAuthorization } from '../../hooks/useAuthorization';
import { useNavbarNotifications } from '../../hooks/useNavbarNotifications';
import { useNavbarProfile } from '../../hooks/useNavbarProfile';
import { useUserSearch } from '../../hooks/useUserSearch';
import type { NotificationItem } from '../../services/notificationService';
import type { UserProfile } from '../../services/userService';
import { Links } from '../../utils/enums';

// Mock da navegação
const { navigateMock } = vi.hoisted(() => ({
    navigateMock: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();

    return {
        ...actual,
        useNavigate: () => navigateMock,
    };
});

// Mock dos hooks
vi.mock('../../hooks/useAuthorization', () => ({
    useAuthorization: vi.fn(),
}));

vi.mock('../../hooks/useNavbarNotifications', () => ({
    useNavbarNotifications: vi.fn(),
}));

vi.mock('../../hooks/useNavbarProfile', () => ({
    useNavbarProfile: vi.fn(),
}));

vi.mock('../../hooks/useUserSearch', () => ({
    useUserSearch: vi.fn(),
}));

// Mock dos componentes filhos
vi.mock('./UserSearchResults', () => ({
    UserSearchResults: ({
        open,
        onSelect,
    }: {
        open: boolean;
        onSelect: (user: UserProfile) => void;
    }) =>
        open ? (
            <button
                type="button"
                onClick={() =>
                    onSelect({
                        email: 'ana@email.com',
                    } as UserProfile)
                }
            >
                Selecionar usuário
            </button>
        ) : null,
}));

vi.mock('../UserAvatar', () => ({
    UserAvatar: ({ name }: { name?: string }) => (
        <span data-testid="avatar">{name}</span>
    ),
}));

describe('AppNavbar', () => {
    const closeSearch = vi.fn();
    const reopenSearch = vi.fn();
    const clearSearch = vi.fn();
    const setQuery = vi.fn();

    const reloadNotifications = vi.fn();
    const markAsRead = vi.fn();

    const signoutRedirect = vi.fn();

    const usuario = {
        email: 'ana@email.com',
        name: 'Ana Silva',
    } as UserProfile;

    const notificacao = {
        id: 'notification-1',
        subject: 'Aviso importante',
        message: 'Esta é uma mensagem de teste.',
        severity: 'HIGH',
        createdAt: '2026-11-08T12:00:00.000Z',
        readAt: null,
    } as NotificationItem;

    const configurarMocks = ({
        isAdmin = false,
        searchOpen = false,
        searchLoading = false,
        searchResults = [],
        notificationItems = [],
        notificationLoading = false,
        unreadCount = 0,
        profile = usuario,
    }: {
        isAdmin?: boolean;
        searchOpen?: boolean;
        searchLoading?: boolean;
        searchResults?: UserProfile[];
        notificationItems?: NotificationItem[];
        notificationLoading?: boolean;
        unreadCount?: number;
        profile?: UserProfile | null;
    } = {}) => {
        vi.mocked(useAuthorization).mockReturnValue({
            isAdmin,
        } as ReturnType<typeof useAuthorization>);

        vi.mocked(useUserSearch).mockReturnValue({
            query: '',
            setQuery,
            close: closeSearch,
            open: searchOpen,
            loading: searchLoading,
            results: searchResults,
            reopen: reopenSearch,
            clear: clearSearch,
        } as ReturnType<typeof useUserSearch>);

        vi.mocked(useNavbarNotifications).mockReturnValue({
            reload: reloadNotifications,
            unreadCount,
            items: notificationItems,
            loading: notificationLoading,
            markAsRead,
        } as ReturnType<typeof useNavbarNotifications>);

        vi.mocked(useNavbarProfile).mockReturnValue(
            profile as ReturnType<typeof useNavbarProfile>,
        );
    };

    const renderNavbar = (isAuthenticated = true) => {
        const auth = {
            isAuthenticated,
            signoutRedirect,
        } as unknown as AuthContextProps;

        return render(<AppNavbar auth={auth} />);
    };

    beforeEach(() => {
        vi.clearAllMocks();
        configurarMocks();
    });

    afterEach(() => {
        cleanup();
    });

    // Renderização
    it('deve renderizar a navbar', () => {
        renderNavbar();

        expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('deve renderizar o logo', () => {
        renderNavbar();

        expect(screen.getByAltText('Logo CIn')).toBeInTheDocument();
    });

    it('deve renderizar o campo de pesquisa', () => {
        renderNavbar();

        expect(
            screen.getByPlaceholderText('Pesquisar'),
        ).toBeInTheDocument();
    });

    it('deve renderizar o botão de notificações', () => {
        renderNavbar();

        expect(
            screen.getByRole('button', { name: 'Notificações' }),
        ).toBeInTheDocument();
    });

    it('deve renderizar o botão do menu do usuário', () => {
        renderNavbar();

        expect(
            screen.getByRole('button', { name: 'Abrir menu do usuário' }),
        ).toBeInTheDocument();
    });

    it('deve passar o estado de autenticação para os hooks', () => {
        renderNavbar(false);

        expect(useUserSearch).toHaveBeenCalledWith(false);
        expect(useNavbarNotifications).toHaveBeenCalledWith(false);
        expect(useNavbarProfile).toHaveBeenCalledWith(false);
    });

    // Painel administrativo
    it('deve exibir o botão do painel administrativo para administradores', () => {
        configurarMocks({ isAdmin: true });

        renderNavbar();

        expect(
            screen.getByRole('button', { name: 'Painel Admin' }),
        ).toBeInTheDocument();
    });

    it('não deve exibir o botão do painel administrativo para usuários comuns', () => {
        configurarMocks({ isAdmin: false });

        renderNavbar();

        expect(
            screen.queryByRole('button', { name: 'Painel Admin' }),
        ).not.toBeInTheDocument();
    });

    it('deve navegar para o painel administrativo ao clicar no botão', () => {
        configurarMocks({ isAdmin: true });

        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Painel Admin' }),
        );

        expect(navigateMock).toHaveBeenCalledWith(Links.ADMIN);
    });

    // Pesquisa de usuários
    it('deve atualizar a pesquisa ao digitar', () => {
        renderNavbar();

        fireEvent.change(screen.getByPlaceholderText('Pesquisar'), {
            target: { value: 'Ana' },
        });

        expect(setQuery).toHaveBeenCalledWith('Ana');
    });

    it('deve reabrir a pesquisa ao focar no campo', () => {
        renderNavbar();

        fireEvent.focus(screen.getByPlaceholderText('Pesquisar'));

        expect(reopenSearch).toHaveBeenCalledTimes(1);
    });

    it('deve exibir os resultados da pesquisa quando estiver aberta', () => {
        configurarMocks({ searchOpen: true });

        renderNavbar();

        expect(
            screen.getByRole('button', { name: 'Selecionar usuário' }),
        ).toBeInTheDocument();
    });

    it('deve limpar a pesquisa ao selecionar um usuário', () => {
        configurarMocks({ searchOpen: true });

        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Selecionar usuário' }),
        );

        expect(clearSearch).toHaveBeenCalledTimes(1);
    });

    it('deve navegar para o perfil do usuário selecionado', () => {
        configurarMocks({ searchOpen: true });

        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Selecionar usuário' }),
        );

        expect(navigateMock).toHaveBeenCalledWith(
            `${Links.PROFILE}/ana@email.com`,
        );
    });

    // Notificações
    it('deve abrir o painel de notificações ao clicar no sino', () => {
        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Notificações' }),
        );

        expect(screen.getByText('Notificações')).toBeInTheDocument();
    });

    it('deve carregar as notificações ao abrir o painel', () => {
        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Notificações' }),
        );

        expect(reloadNotifications).toHaveBeenCalledTimes(1);
    });

    it('deve fechar o painel ao clicar novamente no sino', () => {
        renderNavbar();

        const botao = screen.getByRole('button', {
            name: 'Notificações',
        });

        fireEvent.click(botao);

        expect(screen.getByText('Notificações')).toBeInTheDocument();

        fireEvent.click(botao);

        expect(screen.queryByText('Nenhuma notificação por enquanto.'))
            .not.toBeInTheDocument();
    });

    it('deve exibir a quantidade de notificações não lidas', () => {
        configurarMocks({ unreadCount: 5 });

        renderNavbar();

        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('deve exibir 9+ quando houver mais de nove notificações não lidas', () => {
        configurarMocks({ unreadCount: 15 });

        renderNavbar();

        expect(screen.getByText('9+')).toBeInTheDocument();
    });

    it('não deve exibir o contador quando não houver notificações não lidas', () => {
        configurarMocks({ unreadCount: 0 });

        renderNavbar();

        expect(screen.queryByText('9+')).not.toBeInTheDocument();
    });

    it('deve exibir mensagem de carregamento das notificações', () => {
        configurarMocks({ notificationLoading: true });

        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Notificações' }),
        );

        expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('deve exibir mensagem quando não houver notificações', () => {
        configurarMocks({ notificationItems: [] });

        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Notificações' }),
        );

        expect(
            screen.getByText('Nenhuma notificação por enquanto.'),
        ).toBeInTheDocument();
    });

    it('deve exibir as notificações recebidas', () => {
        configurarMocks({
            notificationItems: [notificacao],
        });

        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Notificações' }),
        );

        expect(screen.getByText('Aviso importante')).toBeInTheDocument();
        expect(
            screen.getByText('Esta é uma mensagem de teste.'),
        ).toBeInTheDocument();
    });

    it('deve expandir uma notificação ao clicar nela', () => {
        configurarMocks({
            notificationItems: [notificacao],
        });

        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Notificações' }),
        );

        const botaoNotificacao = screen.getByRole('button', {
            name: /Aviso importante/,
        });

        fireEvent.click(botaoNotificacao);

        expect(botaoNotificacao).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Severidade: Alto')).toBeInTheDocument();
    });

    it('deve marcar automaticamente como lida uma notificação não lida ao expandi-la', () => {
        configurarMocks({
            notificationItems: [notificacao],
        });

        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Notificações' }),
        );

        fireEvent.click(
            screen.getByRole('button', { name: /Aviso importante/ }),
        );

        expect(markAsRead).toHaveBeenCalledWith('notification-1');
    });

    it('deve permitir marcar uma notificação como lida pelo botão específico', () => {
        configurarMocks({
            notificationItems: [notificacao],
        });

        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Notificações' }),
        );

        fireEvent.click(
            screen.getByRole('button', { name: /Marcar como lido/ }),
        );

        expect(markAsRead).toHaveBeenCalledWith('notification-1');
    });

    it('não deve exibir o botão de marcar como lido para notificações já lidas', () => {
        configurarMocks({
            notificationItems: [
                {
                    ...notificacao,
                    readAt: '2026-11-08T13:00:00.000Z',
                },
            ],
        });

        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Notificações' }),
        );

        expect(
            screen.queryByRole('button', { name: /Marcar como lido/ }),
        ).not.toBeInTheDocument();
    });

    // Menu do usuário
    it('deve abrir o menu do usuário ao clicar no avatar', () => {
        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Abrir menu do usuário' }),
        );

        expect(
            screen.getByRole('button', { name: /Acessar Perfil/ }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', { name: /Sair/ }),
        ).toBeInTheDocument();
    });

    it('deve fechar o menu do usuário ao clicar novamente no avatar', () => {
        renderNavbar();

        const botao = screen.getByRole('button', {
            name: 'Abrir menu do usuário',
        });

        fireEvent.click(botao);
        fireEvent.click(botao);

        expect(
            screen.queryByRole('button', { name: /Acessar Perfil/ }),
        ).not.toBeInTheDocument();
    });

    it('deve navegar para o perfil ao clicar em Acessar Perfil', () => {
        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Abrir menu do usuário' }),
        );

        fireEvent.click(
            screen.getByRole('button', { name: /Acessar Perfil/ }),
        );

        expect(navigateMock).toHaveBeenCalledWith(Links.PROFILE);
    });

    it('deve fechar o menu ao acessar o perfil', () => {
        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Abrir menu do usuário' }),
        );

        fireEvent.click(
            screen.getByRole('button', { name: /Acessar Perfil/ }),
        );

        expect(
            screen.queryByRole('button', { name: /Acessar Perfil/ }),
        ).not.toBeInTheDocument();
    });

    it('deve chamar signoutRedirect ao clicar em Sair', () => {
        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Abrir menu do usuário' }),
        );

        fireEvent.click(
            screen.getByRole('button', { name: /Sair/ }),
        );

        expect(signoutRedirect).toHaveBeenCalledTimes(1);
    });

    it('deve fechar o menu ao sair', () => {
        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Abrir menu do usuário' }),
        );

        fireEvent.click(
            screen.getByRole('button', { name: /Sair/ }),
        );

        expect(
            screen.queryByRole('button', { name: /Acessar Perfil/ }),
        ).not.toBeInTheDocument();
    });

    it('deve exibir o nome do usuário no avatar', () => {
        configurarMocks({ profile: usuario });

        renderNavbar();

        expect(screen.getByTestId('avatar')).toHaveTextContent('Ana Silva');
    });

    // Cliques fora dos elementos
    it('deve fechar a pesquisa ao clicar fora dela', () => {
        renderNavbar();

        fireEvent.mouseDown(document.body);

        expect(closeSearch).toHaveBeenCalledTimes(1);
    });

    it('deve fechar o painel de notificações ao clicar fora dele', () => {
        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Notificações' }),
        );

        expect(screen.getByText('Notificações')).toBeInTheDocument();

        fireEvent.mouseDown(document.body);

        expect(
            screen.queryByText('Nenhuma notificação por enquanto.'),
        ).not.toBeInTheDocument();
    });

    it('deve fechar o menu do usuário ao clicar fora dele', () => {
        renderNavbar();

        fireEvent.click(
            screen.getByRole('button', { name: 'Abrir menu do usuário' }),
        );

        expect(
            screen.getByRole('button', { name: /Acessar Perfil/ }),
        ).toBeInTheDocument();

        fireEvent.mouseDown(document.body);

        expect(
            screen.queryByRole('button', { name: /Acessar Perfil/ }),
        ).not.toBeInTheDocument();
    });

    // Logo
    it('deve navegar para o perfil ao clicar no logo', () => {
        renderNavbar();

        fireEvent.click(screen.getByAltText('Logo CIn'));

        expect(navigateMock).toHaveBeenCalledWith(Links.PROFILE);
    });
});
