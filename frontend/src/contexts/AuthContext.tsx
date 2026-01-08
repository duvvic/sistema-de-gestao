// contexts/AuthContext.tsx
// Context para gerenciar autenticação e usuário logado

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { supabase } from '@/services/supabaseClient';

interface AuthContextType {
    currentUser: User | null;
    isLoading: boolean;
    login: (user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Carregar usuário do sessionStorage ao iniciar
    useEffect(() => {
        const loadUser = async () => {
            console.log('[Auth] Iniciando loadUser...');
            try {
                // Verifica sessão do Supabase sem timeout manual
                const { data, error } = await supabase.auth.getSession();
                if (error) {
                    console.warn('[Auth] Erro ao verificar sessão Supabase:', error);
                }
                const session = data?.session;

                if (session?.user) {
                    // === CAMINHO 1: Login via Supabase Auth (OTP/Magic Link) ===
                    console.log('[Auth] Sessão Supabase encontrada:', session.user.email);

                    const { data: userData } = await supabase
                        .from('dim_colaboradores')
                        .select('*')
                        .eq('E-mail', session.user.email)
                        .maybeSingle();

                    if (userData) {
                        const user: User = {
                            id: String(userData.ID_Colaborador),
                            name: userData.NomeColaborador,
                            email: userData['E-mail'] || userData.email,
                            role: userData.papel === 'Administrador' ? 'admin' : 'developer',
                            avatarUrl: userData.avatar_url,
                            cargo: userData.cargo,
                            active: userData.ativo ?? true,
                        };
                        setCurrentUser(user);
                        sessionStorage.setItem('currentUser', JSON.stringify(user));
                    }
                } else {
                    // === CAMINHO 2: Login Customizado (Senha/Tabela) ===
                    // Como o Login por senha NÃO cria sessão no Supabase (apenas verifica hash no banco),
                    // dependemos exclusivamente do sessionStorage para persistir o login.

                    console.log('[Auth] Nenhuma sessão Supabase ativa. Verificando fallback local...');
                    const storedUser = sessionStorage.getItem('currentUser');

                    if (storedUser) {
                        console.log('[Auth] Usuário recuperado do armazenamento local (Login Customizado).');
                        try {
                            const parsedUser = JSON.parse(storedUser);
                            setCurrentUser(parsedUser);
                        } catch (err) {
                            console.error('[Auth] Erro ao parsear usuário armazenado:', err);
                            sessionStorage.removeItem('currentUser');
                        }
                    } else {
                        console.log('[Auth] Nenhum usuário logado.');
                        setCurrentUser(null);
                    }
                }
            } catch (error) {
                console.error('[Auth] Erro geral ao carregar usuário:', error);
                // Não deslogar forçadamente aqui para não atrapalhar UX em erros transientes
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    // Listener para mudanças de autenticação
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                sessionStorage.removeItem('currentUser');
            } else if (event === 'SIGNED_IN' && session?.user) {
                const { data: userData } = await supabase
                    .from('dim_colaboradores')
                    .select('*')
                    .eq('E-mail', session.user.email)
                    .maybeSingle();

                if (userData) {
                    const user: User = {
                        id: String(userData.ID_Colaborador),
                        name: userData.NomeColaborador,
                        email: userData['E-mail'] || userData.email,
                        role: userData.papel === 'Administrador' ? 'admin' : 'developer',
                        avatarUrl: userData.avatar_url,
                        cargo: userData.cargo,
                        active: userData.ativo ?? true,
                    };
                    setCurrentUser(user);
                    sessionStorage.setItem('currentUser', JSON.stringify(user));
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = (user: User) => {
        setCurrentUser(user);
        sessionStorage.setItem('currentUser', JSON.stringify(user));
    };

    const logout = () => {
        setCurrentUser(null);
        sessionStorage.removeItem('currentUser');
        supabase.auth.signOut();
    };

    const updateUser = (user: User) => {
        setCurrentUser(user);
        sessionStorage.setItem('currentUser', JSON.stringify(user));
    };

    return (
        <AuthContext.Provider value={{ currentUser, isLoading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
