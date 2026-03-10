import { sendError } from "../utils/responseHelper.js";
import { logger } from "../utils/logger.js";

/**
 * Middleware de controle de acesso baseado em Roles (RBAC)
 * @param {string[]} allowedRoles - Lista de roles permitidas (ex: ['ADMIN', 'MANAGER'])
 */
export const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return sendError(res, "Usuário não autenticado", 401);
            }

            const userRole = String(req.user.role || '').toUpperCase();

            // ADMIN e DEVELOPER tem acesso total sempre
            if (userRole === 'ADMIN' || userRole === 'ADMINISTRADOR' || userRole === 'SYSTEM_ADMIN' || userRole === 'EXECUTIVE' || userRole === 'DEVELOPER') {
                return next();
            }

            // Normaliza as permissões da rota
            const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

            // Mapeamento de grupos de permissões
            if (normalizedAllowed.includes('MANAGER')) {
                normalizedAllowed.push('PMO', 'TECH_LEAD', 'FINANCIAL', 'GESTOR', 'GERENTE');
            }

            // Se a rota permite "USER" ou "ANY", qualquer usuário autenticado pode acessar
            if (normalizedAllowed.includes('USER') || normalizedAllowed.includes('ANY')) {
                return next();
            }

            if (normalizedAllowed.includes(userRole)) {
                return next();
            }

            logger.warn(`Acesso negado: Usuário ${req.user.email} (${userRole}) tentou acessar rota restrita a [${allowedRoles.join(', ')}]`, 'RBAC');

            return sendError(res, "Você não tem permissão para realizar esta ação.", 403);
        } catch (error) {
            logger.error(`Erro no roleMiddleware: ${error.message}`, 'RBAC', error);
            return sendError(res, "Erro interno na validação de permissão.", 500);
        }
    };
};
