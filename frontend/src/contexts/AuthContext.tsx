// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { supabase } from '@/services/supabaseClient';

interface AuthContextType {
    currentUser: User | null;
    isLoading: boolean;
    authReady: boolean;
    login: (user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper para normalização consistente de e-mail
export const normalizeEmail = (email: string | undefined | null): string => {
    return (email || '').trim().toLowerCase();
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authReady, setAuthReady] = useState(false);

    const mapUserDataToUser = useCallback((userData: any): User => {
        const papel = String(userData.papel || '').trim().toLowerCase();
        // admin se papel (case-insensitive) contém “admin” => 'admin' senão 'developer'
        const role = papel.includes('admin') ? 'admin' : 'developer';

        return {
            id: String(userData.ID_Colaborador),
            name: userData.NomeColaborador,
            email: userData.email || userData['E-mail'],
            role: role,
            avatarUrl: userData.avatar_url,
            cargo: userData.Cargo || userData.cargo, // Prioriza Cargo (Maiúsculo) do banco
            active: userData.ativo ?? true,
        } as User;
    }, []);

    const loadUserFromSession = useCallback(async (session: any) => {
        if (!session?.user?.email) {
            console.log('[Auth] Sem e-mail na sessão, abortando carga de dados.');
            setCurrentUser(null);
            setAuthReady(true);
            setIsLoading(false);
            return;
        }

        const emailToFind = session.user.email.trim().toLowerCase();
        console.log('[Auth] Carregando dados do banco para:', emailToFind);

        try {
            // Log antes da query
            console.log('[Auth] Iniciando busca em dim_colaboradores...');

            const { data: userData, error: dbErr } = await supabase
                .from('dim_colaboradores')
                .select('*')
                .eq('email', emailToFind)
                .maybeSingle();

            if (dbErr) {
                console.error('[Auth] Erro na query de colaboradores:', dbErr);
                throw dbErr;
            }

            console.log('[Auth] Resposta do banco recebida:', userData ? 'Usuário encontrado' : 'Usuário NÃO encontrado');

            if (userData) {
                setCurrentUser(mapUserDataToUser(userData));
            } else {
                // Fallback mínimo
                setCurrentUser({
                    id: session.user.id,
                    name: session.user.email,
                    email: session.user.email,
                    role: 'developer',
                    active: true,
                } as any);
            }
        } catch (err) {
            console.error('[Auth] Erro crítico no loadUser:', err);
        } finally {
            setAuthReady(true);
            setIsLoading(false);
        }
    }, [mapUserDataToUser]);

    useEffect(() => {
        console.log('[Auth] Inicializando AuthProvider...');

        const safetyTimeout = setTimeout(() => {
            setAuthReady(current => {
                if (!current) {
                    console.warn('[Auth] Safety timeout atingido! Forçando desbloqueio da UI.');
                    setIsLoading(false);
                    return true;
                }
                return current;
            });
        }, 5000);

        // Carga inicial
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                console.log('[Auth] Sessão recuperada:', session ? 'Sim' : 'Não');
                return loadUserFromSession(session);
            })
            .catch(err => {
                console.error('[Auth] Falha crítica ao iniciar sessão:', err);
                setAuthReady(true);
                setIsLoading(false);
            });

        // Listener de eventos
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[Auth] Evento Supabase:', event);

            if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                setAuthReady(true);
                setIsLoading(false);
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                await loadUserFromSession(session);
            }
        });

        return () => {
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, [loadUserFromSession]); // REMOVIDO authReady daqui para evitar loop

    const login = (user: User) => {
        setCurrentUser(user);
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut({ scope: 'global' });
        } catch (err) {
            console.error('[Auth] Erro ao deslogar do Supabase:', err);
        } finally {
            setCurrentUser(null);
            // Limpeza radical de cache local
            try {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-') || key.includes('supabase')) {
                        localStorage.removeItem(key);
                    }
                });
            } catch (e) {
                localStorage.clear();
            }
        }
    };

    const updateUser = (user: User) => {
        setCurrentUser(user);
    };

    return (
        <AuthContext.Provider value={{
            currentUser,
            isLoading: !authReady || isLoading,
            authReady,
            login,
            logout,
            updateUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
