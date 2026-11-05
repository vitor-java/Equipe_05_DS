import { useCallback, useEffect, useState } from 'react';
import { notificationService, type NotificationItem } from '../services/notificationService';

// Notificações hipotéticas para quando a API estiver morta
const FALLBACK_NOTIFICATIONS: NotificationItem[] = [
    {
        id: '00000000-0000-0000-0000-000000000001',
        alertId: 'fallback-1',
        subject: 'Notificação 2',
        message: 'Esse é um exemplo de notificação.',
        severity: 'HIGH',
        createdAt: new Date().toISOString(),
        readAt: null,
    },
    {
        id: '00000000-0000-0000-0000-000000000002',
        alertId: 'fallback-2',
        subject: 'Notificação 1',
        message: 'Esse é um exemplo de notificação.',
        severity: 'LOW',
        createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
        readAt: new Date().toISOString(),
    },
];

async function fetchNotifications(): Promise<NotificationItem[]> {
    try {
        return await notificationService.getAll();
    } catch (err) {
        console.error('Erro ao carregar notificações:', err);
        return FALLBACK_NOTIFICATIONS;
    }
}

/* Lista de notificações da navbar */
export function useNavbarNotifications(enabled: boolean) {
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Carrega no mount, para a bolinha vermelha já aparecer
    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        fetchNotifications().then((data) => {
            if (cancelled) return;
            setItems(data);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [enabled]);

    const reload = useCallback(async () => {
        setLoading(true);
        const data = await fetchNotifications();
        setItems(data);
        setLoading(false);
    }, []);

    const markAsRead = useCallback(
        async (id: string) => {
            const previous = items;
            setItems((prev) =>
                prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
            );
            try {
                await notificationService.markAsRead(id);
            } catch (err) {
                console.error('Erro ao marcar como lida:', err);
                setItems(previous);
            }
        },
        [items],
    );

    const unreadCount = items.filter((n) => n.readAt === null).length;

    return { items, loading, unreadCount, reload, markAsRead };
}