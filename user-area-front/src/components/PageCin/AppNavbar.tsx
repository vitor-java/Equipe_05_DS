import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthContextProps } from 'react-oidc-context';
import { AlertCircle, AlertTriangle, Bell, BellOff, Check, Info, LogOut, Search, User, type LucideIcon } from 'lucide-react';
import { useAuthorization } from '../../hooks/useAuthorization';
import { useNavbarNotifications } from '../../hooks/useNavbarNotifications';
import { useNavbarProfile } from '../../hooks/useNavbarProfile';
import { useUserSearch } from '../../hooks/useUserSearch';
import type { NotificationItem } from '../../services/notificationService';
import { Links } from '../../utils/enums';
import { UserSearchResults } from './UserSearchResults';
import { UserAvatar } from '../UserAvatar';
import type { UserProfile } from '@/services/userService';

const LOGO_SRC = `${import.meta.env.BASE_URL}/apple-touch-icon.png`;

const formatDate = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR');
};

interface AppNavbarProps {
    auth: AuthContextProps;
}

/* Navbar */
/* Esquerda: logo e busca.
* Direita: foto de perfil e o sininho (das notificações)
*/

export function AppNavbar({ auth }: AppNavbarProps) {
    const navigate = useNavigate();
    const { isAdmin } = useAuthorization();
    const enabled = auth.isAuthenticated;

    const search = useUserSearch(enabled);
    const notifications = useNavbarNotifications(enabled);
    const profile = useNavbarProfile(enabled);

    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    const searchRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Fecha o dropdown ao clicar fora dele.
    const { close: closeSearch } = search;
    useEffect(() => {
        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!searchRef.current?.contains(target)) closeSearch();
            if (!notificationsRef.current?.contains(target)) setShowNotifications(false);
            if (!userMenuRef.current?.contains(target)) setShowUserMenu(false);
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [closeSearch]);

    const toggleNotifications = () => {
        const next = !showNotifications;
        setShowNotifications(next);
        if (next) void notifications.reload();
    };

    const goToProfile = () => {
        setShowUserMenu(false);
        navigate(Links.PROFILE);
    };

    const handleSelectUser = (user: UserProfile) => {
        search.clear();
        navigate(`${Links.PROFILE}/${user.email}`);
    };

    const handleLogout = () => {
        setShowUserMenu(false);
        void auth.signoutRedirect?.();
    };

    return (
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            {/* Esquerda: logo + busca */}
            <div className="flex items-center gap-6">
                <img
                    src={LOGO_SRC}
                    alt="Logo CIn"
                    onClick={goToProfile}
                    className="h-12 cursor-pointer object-contain"
                />

                <div ref={searchRef} className="relative flex items-center">
                    <Search size={18} color="#9ca3af" className="pointer-events-none absolute left-3 z-10" />
                    <input
                        type="text"
                        placeholder="Pesquisar"
                        value={search.query}
                        onChange={(e) => search.setQuery(e.target.value)}
                        onFocus={search.reopen}
                        className="h-9 w-[280px] rounded-[20px] border border-gray-300 bg-gray-50 pl-[38px] pr-10 text-sm outline-none focus:border-gray-400"
                    />

                    <UserSearchResults
                        open={search.open}
                        loading={search.loading}
                        results={search.results}
                        onSelect={handleSelectUser}
                    />
                </div>
            </div>

            {/* Direita: painel admin, sino e avatar */}
            <div className="flex items-center gap-5">
                {isAdmin && (
                    <button
                        type="button"
                        onClick={() => navigate(Links.ADMIN)}
                        className="cursor-pointer rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 text-[13px] font-medium text-gray-700"
                    >
                        Painel Admin
                    </button>
                )}

                <div ref={notificationsRef} className="relative">
                    <button
                        type="button"
                        aria-label="Notificações"
                        onClick={toggleNotifications}
                        className={`relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full hover:bg-gray-100 ${showNotifications ? 'bg-gray-100' : ''
                            }`}
                    >
                        <Bell size={20} color="#374151" />
                        {notifications.unreadCount > 0 && (
                            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                                {notifications.unreadCount > 9 ? '9+' : notifications.unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <NotificationsPanel
                            items={notifications.items}
                            loading={notifications.loading}
                            onMarkAsRead={notifications.markAsRead}
                        />
                    )}
                </div>

                <div ref={userMenuRef} className="relative">
                    <button
                        type="button"
                        aria-label="Abrir menu do usuário"
                        title="Opções do perfil"
                        onClick={() => setShowUserMenu((open) => !open)}
                        className="cursor-pointer rounded-full"
                    >
                        <UserAvatar
                            photoUrl={profile?.photoUrl}
                            name={profile?.name}
                            size={38}
                            className="border-2 border-gray-200"
                        />
                    </button>

                    {showUserMenu && (
                        <div className="absolute right-0 top-12 z-[1100] w-40 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
                            <button
                                type="button"
                                onClick={goToProfile}
                                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <User size={16} color="#4b5563" />
                                Acessar Perfil
                            </button>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <LogOut size={16} color="#4b5563" />
                                Sair
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

interface NotificationsPanelProps {
    items: NotificationItem[];
    loading: boolean;
    onMarkAsRead: (id: string) => void;
}

const SEVERITY_STYLE: Record<string, { label: string; Icon: LucideIcon; color: string }> = {
    HIGH: { label: 'Alto', Icon: AlertTriangle, color: '#dc2626' },
    MEDIUM: { label: 'Médio', Icon: AlertCircle, color: '#ea580c' },
    LOW: { label: 'Baixo', Icon: Info, color: '#2563eb' },
    INFO: { label: 'Informativo', Icon: Info, color: '#6b7280' },
};

function NotificationsPanel({ items, loading, onMarkAsRead }: NotificationsPanelProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const unread = items.filter((n) => n.readAt === null).length;

    // Abrir uma notificação não lida já marca como lida automaticamente
    const handleToggle = (n: NotificationItem) => {
        const opening = expandedId !== n.id;
        setExpandedId(opening ? n.id : null);
        if (opening && n.readAt === null) onMarkAsRead(n.id);
    };

    return (
        <div className="absolute right-0 top-[45px] z-[1000] w-[340px] rounded-xl border border-gray-200 bg-white p-4 shadow-[0_10px_25px_rgba(0,0,0,0.15)]">
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2.5">
                <h4 className="m-0 text-[15px] font-semibold text-gray-800">Notificações</h4>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{unread} novas</span>
            </div>

            <div className="flex max-h-[350px] flex-col gap-2.5 overflow-y-auto">
                {loading ? (
                    <p className="m-0 py-5 text-center text-[13px] text-gray-500">Carregando...</p>
                ) : items.length === 0 ? (
                    <div className="py-6 text-center text-gray-500">
                        <BellOff size={28} className="mx-auto mb-2 opacity-50" />
                        <p className="m-0 text-[13px]">Nenhuma notificação por enquanto.</p>
                    </div>
                ) : (
                    items.map((n) => {
                        const isRead = n.readAt !== null;
                        const isExpanded = expandedId === n.id;
                        const { label, Icon, color } = SEVERITY_STYLE[n.severity] ?? SEVERITY_STYLE.INFO;

                        return (
                            <div
                                key={n.id}
                                className={`rounded-lg border p-3 ${isRead ? 'border-gray-200 bg-gray-50' : 'border-red-200 bg-red-50/40'}`}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleToggle(n)}
                                    aria-expanded={isExpanded}
                                    className="block w-full cursor-pointer bg-transparent p-0 text-left"
                                >
                                    <div className="mb-1 flex items-start justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-1.5">
                                            <span title={`Severidade: ${label}`} aria-label={`Severidade: ${label}`} className="flex shrink-0">
                                                <Icon size={16} color={color} />
                                            </span>
                                            <span className={`text-[13px] font-semibold text-gray-800 ${isExpanded ? '' : 'truncate'}`}>
                                                {n.subject}
                                            </span>
                                        </div>
                                        <span className="shrink-0 text-[11px] text-gray-400">{formatDate(n.createdAt)}</span>
                                    </div>
                                    <p className={`m-0 text-[13px] leading-snug text-gray-600 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                        {n.message}
                                    </p>
                                </button>

                                {isExpanded && (
                                    <div className="mt-2 space-y-0.5 border-t border-gray-200 pt-2 text-[12px] text-gray-500">
                                        <p className="m-0">Severidade: {label}</p>
                                        <p className="m-0">Recebida em: {formatDate(n.createdAt)}</p>
                                        {n.readAt && <p className="m-0">Lida em: {formatDate(n.readAt)}</p>}
                                    </div>
                                )}

                                {!isRead && (
                                    <button
                                        type="button"
                                        onClick={() => onMarkAsRead(n.id)}
                                        className="mt-2 flex cursor-pointer items-center gap-1 text-[11px] font-medium text-blue-600"
                                    >
                                        <Check size={12} /> Marcar como lido
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}