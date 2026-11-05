import { useCallback, useEffect, useState } from 'react';
import { userService, type UserProfile } from '../services/userService';

const DEBOUNCE_MS = 300;

// Dados de alunos hipotéticos para quando a API estiver morta.
const FALLBACK_USERS: UserProfile[] = [
    { name: 'Aluno Um da Silva', email: 'al1@cin.ufpe.br', role: 'STUDENT', photoUrl: '', experiences: [] },
    { name: 'Professor Dois da Silva', email: 'al2@cin.ufpe.br', role: 'STAFF', photoUrl: '', experiences: [] },
    { name: 'Aluno Tão Diolho EmNós da Silva', email: 'al3@cin.ufpe.br', role: 'STUDENT', photoUrl: '', experiences: [] },
];

async function fetchUsers(term: string): Promise<UserProfile[]> {
    try {
        return await userService.searchUsers(term);
    } catch (err) {
        console.error('Erro na busca de usuários:', err);
        const lower = term.toLowerCase();
        return FALLBACK_USERS.filter(
            (u) => u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower),
        );
    }
}

/* Estado da busca de perfis da navbar */
export function useUserSearch(enabled: boolean) {
    const [query, setQuery] = useState('');
    const [dismissed, setDismissed] = useState(false);
    // Resultado da última busca concluída
    const [settled, setSettled] = useState<{ term: string; data: UserProfile[] }>({ term: '', data: [] });

    const term = query.trim();
    const active = enabled && term !== '';

    useEffect(() => {
        if (!active) return;

        let cancelled = false;
        const timer = setTimeout(() => {
            fetchUsers(term).then((data) => {
                if (!cancelled) setSettled({ term, data });
            });
        }, DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [active, term]);

    const changeQuery = useCallback((value: string) => {
        setQuery(value);
        setDismissed(false);
    }, []);
    const clear = useCallback(() => {
        setQuery('');
        setDismissed(true);
    }, []);
    const close = useCallback(() => setDismissed(true), []);
    const reopen = useCallback(() => setDismissed(false), []);

    const isCurrent = settled.term === term;

    return {
        query,
        setQuery: changeQuery,
        clear,
        close,
        reopen,
        results: active && isCurrent ? settled.data : [],
        loading: active && !isCurrent,
        open: active && !dismissed,
    };
}