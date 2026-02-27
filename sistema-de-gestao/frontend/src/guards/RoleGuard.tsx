// frontend/src/guards/RoleGuard.tsx
// Route guard para proteger rotas baseado em roles

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/types';

interface RoleGuardProps {
    allowedRoles: Role[];
    children: React.ReactNode;
    redirectTo?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
    allowedRoles,
    children,
    redirectTo = '/unauthorized'
}) => {
    const { currentUser, isLoading } = useAuth();
    const location = useLocation();

    // Aguardar carregamento da autenticação
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Verificando permissões...</p>
                </div>
            </div>
        );
    }

    // Redirecionar para login se não autenticado
    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Verificar se o role do usuário está na lista de permitidos
    const userRole = currentUser.role || 'resource';

    if (!allowedRoles.includes(userRole as Role)) {
        console.warn(`Acesso negado: usuário com role "${userRole}" tentou acessar rota que requer: ${allowedRoles.join(', ')}`);
        return <Navigate to={redirectTo} replace />;
    }

    // Usuário autorizado, renderizar children
    return <>{children}</>;
};

// Hook personalizado para verificar permissões
export const useRoleCheck = () => {
    const { currentUser } = useAuth();

    const hasRole = (roles: Role | Role[]): boolean => {
        if (!currentUser) return false;

        const userRole = currentUser.role || 'resource';
        const rolesArray = Array.isArray(roles) ? roles : [roles];

        return rolesArray.includes(userRole as Role);
    };

    const hasAnyRole = (roles: Role[]): boolean => {
        return hasRole(roles);
    };

    const hasAllRoles = (roles: Role[]): boolean => {
        if (!currentUser) return false;
        const userRole = currentUser.role || 'resource';
        return roles.every(role => role === userRole);
    };

    return {
        hasRole,
        hasAnyRole,
        hasAllRoles,
        userRole: currentUser?.role || 'resource'
    };
};
