import type { UserProfile } from '../../services/userService';

interface UserSearchResultsProps {
    open: boolean;
    loading: boolean;
    results: UserProfile[];
    onSelect: (user: UserProfile) => void;
}

/** Dropdown dos resultados da busca de perfis. */
export function UserSearchResults({ open, loading, results, onSelect }: UserSearchResultsProps) {
    if (!open) return null;

    return (
        <div
            aria-label="Resultados da pesquisa de perfis"
            className="absolute left-0 top-[42px] z-[1100] max-h-[260px] w-80 overflow-y-auto rounded-[10px] border border-gray-200 bg-white shadow-[0_10px_20px_rgba(0,0,0,0.1)]"
        >
            {loading ? (
                <p className="m-0 p-3 text-center text-[13px] text-gray-500">Buscando...</p>
            ) : results.length === 0 ? (
                <p className="m-0 p-3 text-center text-[13px] text-gray-500">Nenhum perfil encontrado.</p>
            ) : (
                results.map((user) => (
                    <button
                        key={user.email}
                        type="button"
                        onClick={() => onSelect(user)}
                        className="flex w-full cursor-pointer items-center gap-2.5 border-b border-gray-100 bg-white px-3.5 py-2.5 text-left last:border-b-0 hover:bg-gray-50"
                    >
                        {user.photoUrl ? (
                            <img src={user.photoUrl} alt="" className="h-[30px] w-[30px] shrink-0 rounded-full object-cover" />
                        ) : (
                            <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#db1e2f] text-[13px] font-semibold text-white">
                                {user.name.charAt(0).toUpperCase()}
                            </span>
                        )}
                        <span className="min-w-0">
                            <span className="block truncate text-[13px] font-semibold text-gray-800">{user.name}</span>
                            <span className="block truncate text-[11px] text-gray-500">
                                {user.email} | {user.role}
                            </span>
                        </span>
                    </button>
                ))
            )}
        </div>
    );
}