// hooks/useSmartNavigation.ts
import { useNavigate, useLocation } from 'react-router-dom';
import { useRef, useEffect } from 'react';

interface NavigationOptions {
    /** Rota de fallback caso não haja histórico */
    fallbackRoute?: string;
    /** Se true, força usar a rota de fallback ao invés do histórico */
    forceFallback?: boolean;
    /** Preserva a posição de scroll ao navegar */
    preserveScroll?: boolean;
}

/**
 * Hook personalizado para navegação inteligente
 * - Mantém histórico de navegação
 * - Preserva posição de scroll
 * - Gerencia voltar de forma consistente
 */
export const useSmartNavigation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const scrollPositions = useRef<Map<string, number>>(new Map());

    // Salva a posição de scroll antes de navegar
    useEffect(() => {
        const saveScrollPosition = () => {
            scrollPositions.current.set(location.pathname, window.scrollY);
        };

        window.addEventListener('beforeunload', saveScrollPosition);
        return () => {
            saveScrollPosition();
            window.removeEventListener('beforeunload', saveScrollPosition);
        };
    }, [location.pathname]);

    // Restaura a posição de scroll ao voltar
    useEffect(() => {
        const savedPosition = scrollPositions.current.get(location.pathname);
        if (savedPosition !== undefined) {
            // Usa setTimeout para garantir que o conteúdo foi renderizado
            setTimeout(() => {
                window.scrollTo(0, savedPosition);
            }, 0);
        }
    }, [location.pathname]);

    /**
     * Navega para uma rota, salvando a posição atual
     */
    const navigateTo = (path: string, options?: { replace?: boolean; state?: any }) => {
        scrollPositions.current.set(location.pathname, window.scrollY);
        navigate(path, options);
    };

    /**
     * Volta para a página anterior de forma inteligente
     */
    const goBack = (options?: NavigationOptions) => {
        const { fallbackRoute = '/', forceFallback = false } = options || {};

        // Verifica se há histórico disponível
        const hasHistory = window.history.length > 1;

        if (forceFallback || !hasHistory) {
            navigate(fallbackRoute, { replace: true });
        } else {
            // Salva posição atual antes de voltar
            scrollPositions.current.set(location.pathname, window.scrollY);
            navigate(-1);
        }
    };

    /**
     * Retorna a rota de fallback baseada no contexto atual
     */
    const getContextualFallback = (): string => {
        const path = location.pathname;

        // Admin routes
        if (path.includes('/admin/clients/')) return '/admin/clients';
        if (path.includes('/admin/projects/')) return '/admin/projects';
        if (path.includes('/admin/team/')) return '/admin/team';
        if (path.includes('/admin/timesheet')) return '/admin/timesheet';
        if (path.includes('/admin/')) return '/admin/clients';

        // Developer routes
        if (path.includes('/developer/projects/')) return '/developer/projects';
        if (path.includes('/developer/tasks')) return '/developer/tasks';
        if (path.includes('/developer/')) return '/developer/projects';

        // Shared routes
        if (path.includes('/tasks/')) return '/tasks';
        if (path.includes('/timesheet/')) return '/timesheet';
        if (path.includes('/profile')) return '/';

        // Default
        return '/';
    };

    /**
     * Volta com fallback contextual automático
     */
    const goBackSmart = () => {
        const fallback = getContextualFallback();
        goBack({ fallbackRoute: fallback });
    };

    return {
        navigateTo,
        goBack,
        goBackSmart,
        getContextualFallback,
    };
};
