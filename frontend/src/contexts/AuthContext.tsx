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
                // Tenta recuperar sessão do Supabase (localStorage do browser)
                const sessionPromise = supabase.auth.getSession();

                // Opção: Aumentar timeout para conexão lenta ou remover se desnecessário. 
                // Mantendo race para evitar hang eterno, mas tratando falha como logout.
                let session = null;

                try {
                    const { data, error } = await Promise.race([
                        sessionPromise,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000)) // Aumentado para 10s
                    ]) as any;

                    if (error) throw error;
                    session = data?.session;
                } catch (e) {
                    console.warn('[Auth] Falha ou Timeout ao buscar sessão:', e);
                    // Se falhar a verificação de sessão, não podemos confiar no sessionStorage
                    // pois o token de acesso (JWT) estaria inválido/ausente.
                }

                if (session?.user) {
                    console.log('[Auth] Sessão encontrada para:', session.user.email);

                    // Buscar dados completos do usuário no banco
                    const { data: userData, error } = await supabase
                        .from('dim_colaboradores')
                        .select('*')
                        .eq('E-mail', session.user.email)
                        .maybeSingle();

                    if (error) {
                        console.error('[Auth] Erro ao buscar dados do usuário:', error);
                    }

                    if (userData) {
                        console.log('[Auth] Dados do usuário carregados:', userData.NomeColaborador);
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
                    } else {
                        console.warn('[Auth] Usuário não encontrado no banco de dados');
                        setCurrentUser(null);
                        sessionStorage.removeItem('currentUser');
                        await supabase.auth.signOut(); // Forçar logout limpo
                    }
                } else {
                    console.log('[Auth] Nenhuma sessão ativa encontrada.');
                    // IMPORTANTE: Remover fallback para sessionStorage aqui. 
                    // Se o Supabase não tem sessão, o sessionStorage tem apenas dados "visuais" sem token válido.
                    setCurrentUser(null);
                    sessionStorage.removeItem('currentUser');
                }
            } catch (error) {
                console.error('[Auth] Erro FATAL ao carregar usuário:', error);
                setCurrentUser(null);
                sessionStorage.removeItem('currentUser');
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
