import { useEffect, useState } from 'react';
import { userService, type UserProfile } from '../services/userService';

/** Perfil do usuário logado para o avatar da navbar. */
export function useNavbarProfile(enabled: boolean): UserProfile | null {
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        userService
            .getMe()
            .then((data) => {
                if (!cancelled) setProfile(data);
            })
            .catch((err) => console.error('Erro ao carregar perfil da navbar:', err));
        return () => {
            cancelled = true;
        };
    }, [enabled]);

    return profile;
}