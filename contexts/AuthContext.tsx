// contexts/AuthContext.tsx
// Context para gerenciar autenticação e usuário logado

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';

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

    // Carregar usuário do localStorage ao iniciar
    useEffect(() => {
        const loadUser = async () => {
            // Primeiro tenta carregar da sessão do Supabase
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                // Buscar dados completos do usuário
                const { data: userData } = await supabase
                    .from('dim_colaboradores')
                    .select('*')
                    .eq('email', session.user.email)
                    .single();

                if (userData) {
                    const user: User = {
                        id: String(userData.ID_Colaborador),
                        name: userData.NomeColaborador,
                        email: userData.email,
                        role: userData.cargo === 'Admin' ? 'admin' : 'developer',
                        avatarUrl: userData.avatar_url,
                        cargo: userData.cargo,
                        active: userData.ativo ?? true,
                    };
                    setCurrentUser(user);
                    localStorage.setItem('currentUser', JSON.stringify(user));
                }
            } else {
                // Fallback para localStorage
                const storedUser = localStorage.getItem('currentUser');
                if (storedUser) {
                    setCurrentUser(JSON.parse(storedUser));
                }
            }

            setIsLoading(false);
        };

        loadUser();
    }, []);

    // Listener para mudanças de autenticação
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                localStorage.removeItem('currentUser');
            } else if (event === 'SIGNED_IN' && session?.user) {
                const { data: userData } = await supabase
                    .from('dim_colaboradores')
                    .select('*')
                    .eq('email', session.user.email)
                    .single();

                if (userData) {
                    const user: User = {
                        id: String(userData.ID_Colaborador),
                        name: userData.NomeColaborador,
                        email: userData.email,
                        role: userData.cargo === 'Admin' ? 'admin' : 'developer',
                        avatarUrl: userData.avatar_url,
                        cargo: userData.cargo,
                        active: userData.ativo ?? true,
                    };
                    setCurrentUser(user);
                    localStorage.setItem('currentUser', JSON.stringify(user));
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        supabase.auth.signOut();
    };

    const updateUser = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
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
