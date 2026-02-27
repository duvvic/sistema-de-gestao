// backend/middleware/authorize.js
// Middleware de autorização baseado em roles (RBAC)

const { USER_ROLES } = require('../constants/roles');

/**
 * Middleware para validar se o usuário tem um dos roles permitidos
 * @param {Array<string>} allowedRoles - Lista de roles permitidos
 * @returns {Function} Middleware function
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Não autenticado',
                message: 'Você precisa estar autenticado para acessar este recurso'
            });
        }

        const userRole = req.user.role || 'resource';

        if (!allowedRoles.includes(userRole)) {
            // Log de tentativa de acesso negado
            logAccessDenied(req.user, req.path, allowedRoles);

            return res.status(403).json({
                error: 'Acesso negado',
                message: `Requer perfil: ${allowedRoles.map(r => getRoleDisplayName(r)).join(' ou ')}`,
                requiredRoles: allowedRoles,
                userRole: userRole
            });
        }

        next();
    };
};

/**
 * Middleware para validar acesso a um projeto específico
 * Verifica se o usuário tem vínculo com o projeto
 */
const validateProjectAccess = async (req, res, next) => {
    const { projectId, id } = req.params;
    const user = req.user;
    const pid = projectId || id;

    if (!pid) {
        return res.status(400).json({ error: 'ID do projeto não fornecido' });
    }

    // System Admin, Executive e Financial sempre têm acesso
    if ([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.EXECUTIVE, USER_ROLES.FINANCIAL].includes(user.role)) {
        return next();
    }

    try {
        const { getProjectById, checkUserIsMember, checkUserHasTasks, checkTowerMembersInProject } = require('../services/projectService');

        const project = await getProjectById(pid);

        if (!project) {
            return res.status(404).json({ error: 'Projeto não encontrado' });
        }

        let hasAccess = false;

        switch (user.role) {
            case USER_ROLES.PMO:
                // PMO acessa apenas projetos sob sua responsabilidade
                hasAccess = (
                    project.responsible_user_id === user.id ||
                    project.project_manager_id === user.id ||
                    project.manager === user.name // Fallback para campo antigo
                );
                break;

            case USER_ROLES.TECH_LEAD:
                // Tech Lead acessa apenas projetos da sua torre
                const hasTowerMembers = await checkTowerMembersInProject(pid, user.tower);
                hasAccess = hasTowerMembers;
                break;

            case USER_ROLES.RESOURCE:
                // Resource acessa apenas projetos onde está alocado
                const isMember = await checkUserIsMember(pid, user.id);
                const hasTasks = await checkUserHasTasks(pid, user.id);
                hasAccess = isMember || hasTasks;
                break;

            default:
                hasAccess = false;
        }

        if (!hasAccess) {
            // Log de tentativa de acesso negado
            logAccessDenied(user, `project/${pid}`, [user.role]);

            return res.status(403).json({
                error: 'Acesso negado',
                message: 'Você não tem vínculo com este projeto'
            });
        }

        // Anexar projeto ao request para uso posterior
        req.project = project;
        req.isProjectResponsible = (
            project.responsible_user_id === user.id ||
            project.project_manager_id === user.id
        );

        next();
    } catch (error) {
        console.error('Erro ao validar acesso ao projeto:', error);
        return res.status(500).json({ error: 'Erro ao validar acesso' });
    }
};

/**
 * Middleware para validar acesso a uma tarefa específica
 */
const validateTaskAccess = async (req, res, next) => {
    const { taskId, id } = req.params;
    const user = req.user;
    const tid = taskId || id;

    if (!tid) {
        return res.status(400).json({ error: 'ID da tarefa não fornecido' });
    }

    // System Admin e Executive sempre têm acesso
    if ([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.EXECUTIVE].includes(user.role)) {
        return next();
    }

    try {
        const { getTaskById } = require('../services/taskService');

        const task = await getTaskById(tid);

        if (!task) {
            return res.status(404).json({ error: 'Tarefa não encontrada' });
        }

        let hasAccess = false;

        switch (user.role) {
            case USER_ROLES.PMO:
                // PMO acessa tarefas dos seus projetos
                const { getProjectById } = require('../services/projectService');
                const project = await getProjectById(task.ID_Projeto);
                hasAccess = (
                    project.responsible_user_id === user.id ||
                    project.project_manager_id === user.id
                );
                break;

            case USER_ROLES.TECH_LEAD:
                // Tech Lead acessa tarefas da sua torre
                const { getUserById } = require('../services/userService');
                const developer = await getUserById(task.ID_Colaborador);
                hasAccess = (developer && developer.tower === user.tower);
                break;

            case USER_ROLES.RESOURCE:
                // Resource acessa apenas próprias tarefas
                hasAccess = (
                    task.ID_Colaborador === user.id ||
                    (task.collaboratorIds && task.collaboratorIds.includes(user.id))
                );
                break;

            default:
                hasAccess = false;
        }

        if (!hasAccess) {
            logAccessDenied(user, `task/${tid}`, [user.role]);

            return res.status(403).json({
                error: 'Acesso negado',
                message: 'Você não tem permissão para acessar esta tarefa'
            });
        }

        req.task = task;
        next();
    } catch (error) {
        console.error('Erro ao validar acesso à tarefa:', error);
        return res.status(500).json({ error: 'Erro ao validar acesso' });
    }
};

/**
 * Função auxiliar para obter nome de exibição do role
 */
function getRoleDisplayName(role) {
    const { ROLE_DISPLAY_NAMES } = require('../constants/roles');
    return ROLE_DISPLAY_NAMES[role] || role;
}

/**
 * Função para registrar tentativas de acesso negado
 */
async function logAccessDenied(user, resource, requiredRoles) {
    try {
        const { createAuditLog } = require('../services/auditService');
        await createAuditLog({
            userId: user.id,
            userRole: user.role,
            action: 'ACCESS_DENIED',
            resource: resource,
            changes: { requiredRoles },
            ipAddress: user.ipAddress,
            userAgent: user.userAgent
        });
    } catch (error) {
        console.error('Erro ao registrar log de acesso negado:', error);
    }
}

module.exports = {
    requireRole,
    validateProjectAccess,
    validateTaskAccess
};
