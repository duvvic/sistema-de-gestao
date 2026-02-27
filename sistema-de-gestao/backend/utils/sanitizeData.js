// backend/utils/sanitizeData.js
// Utilitários para sanitização de dados sensíveis baseado em roles

const { USER_ROLES } = require('../constants/roles');

// Campos financeiros críticos (apenas Admin, Executive, Financial)
const SENSITIVE_FIELDS = {
    CRITICAL: [
        'custo_hora',
        'hourlyCost',
        'valor_total_rs',
        'margem',
        'resultado',
        'custo_atual',
        'custo_para_terminar',
        'budget' // Alias
    ],
    SENSITIVE: [
        'allocated_hours',
        'gaps_issues',
        'important_considerations',
        'weekly_status_report',
        'risks'
    ]
};

/**
 * Sanitizar projeto baseado no role do usuário
 * @param {Object} project - Projeto a ser sanitizado
 * @param {Object} user - Usuário atual
 * @param {Boolean} isResponsible - Se o usuário é responsável pelo projeto
 * @returns {Object} Projeto sanitizado
 */
function sanitizeProject(project, user, isResponsible = false) {
    if (!project) return null;

    const sanitized = { ...project };

    // Roles que podem ver dados financeiros CRÍTICOS
    const canSeeCritical = [
        USER_ROLES.SYSTEM_ADMIN,
        USER_ROLES.EXECUTIVE,
        USER_ROLES.FINANCIAL
    ].includes(user.role);

    // PMO vê dados financeiros apenas dos seus projetos
    const pmoCanSee = (user.role === USER_ROLES.PMO && isResponsible);

    if (!canSeeCritical && !pmoCanSee) {
        // Remover campos financeiros críticos
        SENSITIVE_FIELDS.CRITICAL.forEach(field => {
            delete sanitized[field];
        });
    }

    // Roles que podem ver dados SENSÍVEIS
    const canSeeSensitive = (
        canSeeCritical ||
        (user.role === USER_ROLES.PMO && isResponsible)
    );

    if (!canSeeSensitive) {
        // Remover campos sensíveis
        SENSITIVE_FIELDS.SENSITIVE.forEach(field => {
            delete sanitized[field];
        });
    }

    return sanitized;
}

/**
 * Sanitizar lista de projetos
 */
function sanitizeProjects(projects, user) {
    if (!Array.isArray(projects)) return [];

    return projects.map(project => {
        const isResponsible = (
            project.responsible_user_id === user.id ||
            project.project_manager_id === user.id
        );
        return sanitizeProject(project, user, isResponsible);
    });
}

/**
 * Sanitizar dados de usuário/colaborador
 * @param {Object} userToShow - Usuário a ser exibido
 * @param {Object} currentUser - Usuário atual fazendo a requisição
 * @returns {Object} Usuário sanitizado
 */
function sanitizeUser(userToShow, currentUser) {
    if (!userToShow) return null;

    const sanitized = { ...userToShow };

    // Apenas Executive, Financial e System Admin veem custo/hora
    const canSeeCost = [
        USER_ROLES.SYSTEM_ADMIN,
        USER_ROLES.EXECUTIVE,
        USER_ROLES.FINANCIAL
    ].includes(currentUser.role);

    if (!canSeeCost) {
        delete sanitized.custo_hora;
        delete sanitized.hourlyCost;
        delete sanitized.monthlyAvailableHours; // Capacidade global
    }

    // Remover campos sensíveis de autenticação
    delete sanitized.password;
    delete sanitized.passwordHash;
    delete sanitized.resetToken;

    return sanitized;
}

/**
 * Sanitizar lista de usuários
 */
function sanitizeUsers(users, currentUser) {
    if (!Array.isArray(users)) return [];

    return users.map(user => sanitizeUser(user, currentUser));
}

/**
 * Sanitizar tarefa baseado no role
 */
function sanitizeTask(task, user) {
    if (!task) return null;

    const sanitized = { ...task };

    // Resource não vê horas alocadas (apenas estimadas)
    if (user.role === USER_ROLES.RESOURCE) {
        delete sanitized.allocated_hours;
    }

    return sanitized;
}

/**
 * Sanitizar lista de tarefas
 */
function sanitizeTasks(tasks, user) {
    if (!Array.isArray(tasks)) return [];

    return tasks.map(task => sanitizeTask(task, user));
}

/**
 * Verificar se usuário pode ver dados financeiros
 */
function canSeeFinancialData(user, project = null) {
    // System Admin, Executive e Financial sempre podem
    if ([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.EXECUTIVE, USER_ROLES.FINANCIAL].includes(user.role)) {
        return true;
    }

    // PMO pode ver apenas dos seus projetos
    if (user.role === USER_ROLES.PMO && project) {
        return (
            project.responsible_user_id === user.id ||
            project.project_manager_id === user.id
        );
    }

    return false;
}

/**
 * Verificar se usuário pode editar campos estratégicos
 */
function canEditStrategicFields(user, project) {
    // System Admin sempre pode
    if (user.role === USER_ROLES.SYSTEM_ADMIN) {
        return true;
    }

    // PMO pode editar apenas dos seus projetos
    if (user.role === USER_ROLES.PMO) {
        return (
            project.responsible_user_id === user.id ||
            project.project_manager_id === user.id
        );
    }

    return false;
}

module.exports = {
    sanitizeProject,
    sanitizeProjects,
    sanitizeUser,
    sanitizeUsers,
    sanitizeTask,
    sanitizeTasks,
    canSeeFinancialData,
    canEditStrategicFields,
    SENSITIVE_FIELDS
};
