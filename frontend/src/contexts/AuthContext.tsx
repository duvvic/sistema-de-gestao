// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, PropsWithChildren } from 'react';
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

const USER_CACHE_KEY = 'nic_labs_user_profile';

export function AuthProvider({ children }: PropsWithChildren) {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        // Inicialização síncrona do cache para evitar "flash" de carregamento se possível
        try {
            const cached = localStorage.getItem(USER_CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [authReady, setAuthReady] = useState(() => {
        // Se temos cache, podemos dizer que estamos "prontos" para renderizar as rotas básicas.
        // O loadUserFromSession vai atualizar o perfil em background.
        try {
            return !!localStorage.getItem(USER_CACHE_KEY);
        } catch {
            return false;
        }
    });

    const mapUserDataToUser = useCallback((userData: any): User => {
        const papel = String(userData.papel || '').trim().toLowerCase();
        // admin se papel (case-insensitive) contém “admin” ou “administrador”
        const role = (papel.includes('admin') || papel.includes('administrador')) ? 'admin' : 'developer';

        return {
            id: String(userData.ID_Colaborador),
            name: userData.NomeColaborador,
            email: userData.email || userData['E-mail'],
            role: role,
            avatarUrl: userData.avatar_url,
            cargo: userData.Cargo || userData.cargo,
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

        console.log(`[Auth] Buscando perfil para: ${emailToFind}...`);

        try {
            // Tenta buscar o usuário nas tabelas dim_colaboradores buscando primeiro na coluna indexada 'email'
            // O timeout agora é de 10s para ser mais ágil, e temos fallback
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout de rede (10s)')), 10000)
            );

            const response = await Promise.race([
                supabase
                    .from('dim_colaboradores')
                    .select('*')
                    .or(`email.eq.${emailToFind},"E-mail".eq.${emailToFind}`)
                    .maybeSingle(),
                timeoutPromise as any
            ]);

            const { data: userData, error: dbError } = response as any;

            if (dbError) throw dbError;

            if (userData) {
                const normalizedUser = mapUserDataToUser(userData);
                setCurrentUser(normalizedUser);
                localStorage.setItem(USER_CACHE_KEY, JSON.stringify(normalizedUser));
                lastLoadedEmail.current = emailToFind;
                console.log('[Auth] Perfil carregado com sucesso.');
            } else {
                console.warn('[Auth] Usuário não encontrado no banco, usando fallback do Supabase.');
                const isVictor = emailToFind === 'victor.picoli@nic-labs.com.br';
                const fallbackUser = {
                    id: session.user.id,
                    name: session.user.email?.split('@')[0] || 'Usuário',
                    email: session.user.email,
                    role: isVictor ? 'admin' : 'developer',
                    active: true,
                } as any;
                setCurrentUser(fallbackUser);
                localStorage.setItem(USER_CACHE_KEY, JSON.stringify(fallbackUser));
                lastLoadedEmail.current = emailToFind;
            }
        } catch (err: any) {
            console.error('[Auth] Erro ao carregar perfil:', err.message || err);

            // Se já temos um currentUser (do cache), não fazemos nada, mantemos o que tem
            if (!currentUser) {
                const isVictor = emailToFind === 'victor.picoli@nic-labs.com.br';
                const fallbackUser = {
                    id: session.user.id,
                    name: session.user.email?.split('@')[0] || 'Usuário',
                    email: session.user.email,
                    role: isVictor ? 'admin' : 'developer',
                    active: true,
                } as User;
                setCurrentUser(fallbackUser);
            }
        } finally {
            loadingRef.current = null;
            setAuthReady(true);
            setIsLoading(false);
        }
    }, [mapUserDataToUser, currentUser]);

    useEffect(() => {
        let isMounted = true;

        // Timer de segurança para destravar a UI se nada acontecer em 15s (reduzido de 20s)
        const safetyTimer = setTimeout(() => {
            if (isMounted) {
                setAuthReady(ready => {
                    if (!ready) {
                        console.warn('[Auth] Safety timeout atingido (15s). Destravando interface.');
                        setIsLoading(false);
                        return true;
                    }
                    return ready;
                });
            }
        }, 15000);

        const init = async () => {
            try {
                // getSession é geralmente rápido pois lê do localStorage local do Supabase
                const { data: { session } } = await supabase.auth.getSession();

                if (isMounted) {
                    if (session) {
                        // Se já temos o usuário do cache e o e-mail bate, libera a UI imediatamente
                        const cachedEmail = currentUser?.email ? normalizeEmail(currentUser.email) : null;
                        const sessionEmail = normalizeEmail(session.user.email);

                        if (cachedEmail === sessionEmail) {
                            console.log('[Auth] Usuário validado via cache, liberando interface...');
                            setAuthReady(true);
                            setIsLoading(false);
                            // Atualiza em background sem dar await
                            loadUserFromSession(session);
                        } else {
                            // Senão, carrega de forma bloqueante para garantir dados corretos
                            await loadUserFromSession(session);
                        }
                    } else {
                        // Sem sessão, libera a UI para mostrar tela de login
                        setAuthReady(true);
                        setIsLoading(false);
                    }
                }
            } catch (e) {
                console.error('[Auth] Erro na inicialização:', e);
                if (isMounted) {
                    setAuthReady(true);
                    setIsLoading(false);
                }
            }
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;
            console.log(`[Auth] Evento: ${event}`);

            if (event === 'SIGNED_OUT') {
                lastLoadedEmail.current = null;
                setCurrentUser(null);
                localStorage.removeItem(USER_CACHE_KEY);
                setAuthReady(true);
                setIsLoading(false);
            } else if (session) {
                // Atualização silenciosa em background se já estivermos prontos
                if (authReady) {
                    loadUserFromSession(session);
                } else {
                    await loadUserFromSession(session);
                }
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
            // 1. Marca como carregado ANTES de disparar o evento de auth
            if (user.email) {
                lastLoadedEmail.current = normalizeEmail(user.email);
            }

            // 2. Define o usuário no estado e cache
            setCurrentUser(user);
            localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));

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
            localStorage.removeItem(USER_CACHE_KEY);
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
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
