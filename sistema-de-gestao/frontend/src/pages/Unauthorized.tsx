// frontend/src/pages/Unauthorized.tsx
// Página exibida quando usuário tenta acessar recurso sem permissão

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_DISPLAY_NAMES } from '@/constants/roles';

const Unauthorized: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const userRoleDisplay = currentUser?.role
        ? ROLE_DISPLAY_NAMES[currentUser.role] || currentUser.role
        : 'Não autenticado';

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
            <div className="max-w-md w-full text-center">
                {/* Ícone de Alerta */}
                <div className="mb-8 flex justify-center">
                    <div className="p-6 rounded-full bg-red-100 dark:bg-red-900/20">
                        <ShieldAlert className="w-16 h-16 text-red-600" />
                    </div>
                </div>

                {/* Título */}
                <h1 className="text-3xl font-black mb-4" style={{ color: 'var(--text)' }}>
                    Acesso Negado
                </h1>

                {/* Mensagem */}
                <p className="text-lg mb-2" style={{ color: 'var(--muted)' }}>
                    Você não tem permissão para acessar este recurso.
                </p>

                {/* Informação do Role */}
                <div className="mb-8 p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
                        Seu perfil atual:
                    </p>
                    <p className="text-base font-black text-purple-600">
                        {userRoleDisplay}
                    </p>
                </div>

                {/* Ações */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border transition-all"
                        style={{
                            backgroundColor: 'var(--surface)',
                            borderColor: 'var(--border)',
                            color: 'var(--text)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-600/20"
                    >
                        <Home className="w-4 h-4" />
                        Ir para Início
                    </button>
                </div>

                {/* Informação Adicional */}
                <div className="mt-8 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        Se você acredita que deveria ter acesso a este recurso, entre em contato com o administrador do sistema.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;
