// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { supabase } from '@/services/supabaseClient';

interface AuthContextType {
    currentUser: User | null;
    isLoading: boolean;
    authReady: boolean;
    isAdmin: boolean;
    login: (user: User) => void;
    loginWithSession: (user: User, session: any) => Promise<void>;
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

    const lastLoadedEmail = React.useRef<string | null>(null);
    const loadingRef = React.useRef<string | null>(null);

    const loadUserFromSession = useCallback(async (session: any, force = false) => {
        const emailToFind = normalizeEmail(session?.user?.email);

        if (!emailToFind) {
            lastLoadedEmail.current = null;
            setCurrentUser(null);
            setAuthReady(true);
            setIsLoading(false);
            return;
        }

        // Evita carregar o mesmo usuário múltiplas vezes, a menos que seja forçado
        if (!force && lastLoadedEmail.current === emailToFind) {
            setAuthReady(true);
            setIsLoading(false);
            return;
        }

        // Evita requisições paralelas para o mesmo e-mail
        if (loadingRef.current === emailToFind) return;
        loadingRef.current = emailToFind;

        console.log('[Auth] Carregando dados para:', emailToFind);

        try {
            // Promessa de Timeout (10s)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout de rede na carga do usuário')), 10000)
            );

            // Tenta buscar o usuário nas tabelas dim_colaboradores ou no fallback
            const response = await Promise.race([
                supabase
                    .from('dim_colaboradores')
                    .select('*')
                    .eq('email', emailToFind)
                    .maybeSingle(),
                timeoutPromise as any
            ]);

            const userProfile = response as any;
            const dbError = userProfile.error;
            const userData = userProfile.data;

            if (dbError) throw dbError;

            if (userData) {
                const normalizedUser = mapUserDataToUser(userData);
                setCurrentUser(normalizedUser);
                lastLoadedEmail.current = emailToFind;
            } else {
                console.warn('[Auth] Usuário não encontrado no banco, usando perfil básico.');
                const isVictor = emailToFind === 'victor.picoli@nic-labs.com.br';
                setCurrentUser({
                    id: session.user.id,
                    name: session.user.email?.split('@')[0] || 'Usuário',
                    email: session.user.email,
                    role: isVictor ? 'admin' : 'developer',
                    active: true,
                } as any);
                lastLoadedEmail.current = emailToFind;
            }
        } catch (err: any) {
            console.error('[Auth] Falha ao carregar perfil completo:', err.message || err);
            // Fallback para não bloquear o acesso
            // SE for o email do Victor, força admin temporariamente para ele conseguir usar
            const isVictor = emailToFind === 'victor.picoli@nic-labs.com.br';
            setCurrentUser({
                id: session.user.id,
                name: session.user.email?.split('@')[0] || 'Usuário',
                email: session.user.email,
                role: isVictor ? 'admin' : 'developer',
                active: true,
            } as User);
        } finally {
            loadingRef.current = null;
            setAuthReady(true);
            setIsLoading(false);
        }
    }, [mapUserDataToUser]);

    useEffect(() => {
        let isMounted = true;

        // Timer de segurança para destravar a UI se nada acontecer em 20s
        const safetyTimer = setTimeout(() => {
            if (isMounted) {
                setAuthReady(ready => {
                    if (!ready) {
                        console.warn('[Auth] Safety timeout atingido. Destravando interface.');
                        setIsLoading(false);
                        return true;
                    }
                    return ready;
                });
            }
        }, 20000);

        const init = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (isMounted && session) {
                    await loadUserFromSession(session);
                } else if (isMounted) {
                    setAuthReady(true);
                    setIsLoading(false);
                }
            } catch (e) {
                if (isMounted) {
                    setAuthReady(true);
                    setIsLoading(false);
                }
            }
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;
            console.log('[Auth] Evento:', event);

            if (event === 'SIGNED_OUT') {
                lastLoadedEmail.current = null;
                setCurrentUser(null);
                setAuthReady(true);
                setIsLoading(false);
            } else if (session) {
                await loadUserFromSession(session);
            }
        });

        return () => {
            isMounted = false;
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, [loadUserFromSession]);

    const login = (user: User) => {
        if (user.email) {
            lastLoadedEmail.current = normalizeEmail(user.email);
        }
        setCurrentUser(user);
    };

    const loginWithSession = async (user: User, session: any) => {
        setIsLoading(true);
        try {
            console.log('[Auth] Login manual com sessão backend para:', user.email);

            // 1. Marca como carregado ANTES de disparar o evento de auth
            if (user.email) {
                lastLoadedEmail.current = normalizeEmail(user.email);
            }

            // 2. Define o usuário no estado
            setCurrentUser(user);

            // 3. Sincroniza com o Supabase (isso vai disparar SIGNED_IN)
            // Mas como lastLoadedEmail já está definido, loadUserFromSession vai pular o fetch
            const { error: sessionErr } = await supabase.auth.setSession(session);
            if (sessionErr) throw sessionErr;

        } catch (err: any) {
            console.error('[Auth] Erro ao sincronizar sessão:', err.message);
            throw err;
        } finally {
            setAuthReady(true);
            setIsLoading(false);
        }
    };
    const logout = async () => {
        try {
            await supabase.auth.signOut({ scope: 'global' });
        } catch (err) {
            console.error('[Auth] Erro ao deslogar do Supabase:', err);
        } finally {
            setCurrentUser(null);
            // Limpeza seletiva de chaves do Supabase se necessário, 
            // mas o signOut já deve lidar com a sessão.
            // Mantemos outras configurações como tema e e-mail lembrado.
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
            isAdmin: currentUser?.role === 'admin',
            login,
            loginWithSession,
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
