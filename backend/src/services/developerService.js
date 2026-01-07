// backend/src/services/developerService.js
const developerRepo = require('../repositories/developerRepository');

/**
 * Mapeia status do banco para o formato do frontend
 */
function mapStatusFromDb(status) {
    const statusMap = {
        'A Fazer': 'Todo',
        'Em Andamento': 'In Progress',
        'Revisão': 'Review',
        'Concluído': 'Done'
    };
    return statusMap[status] || status;
}

/**
 * Mapeia prioridade do banco para o formato do frontend
 */
function mapPriorityFromDb(priority) {
    const priorityMap = {
        'Crítica': 'Critical',
        'Alta': 'High',
        'Média': 'Medium',
        'Baixa': 'Low'
    };
    return priorityMap[priority] || priority;
}

/**
 * Mapeia impacto do banco para o formato do frontend
 */
function mapImpactFromDb(impact) {
    const impactMap = {
        'Alto': 'High',
        'Médio': 'Medium',
        'Baixo': 'Low'
    };
    return impactMap[impact] || impact;
}

/**
 * Busca clientes do colaborador com contagem de projetos
 */
async function getMyClients(developerId) {
    const clients = await developerRepo.getClientsByDeveloper(developerId);

    return clients.map(client => ({
        id: String(client.id),
        name: client.name,
        logoUrl: client.logoUrl || 'https://via.placeholder.com/150?text=Logo',
        projectCount: parseInt(client.projectCount) || 0
    }));
}

/**
 * Busca projetos de um cliente específico para o colaborador
 */
async function getMyClientProjects(clientId, developerId) {
    const projects = await developerRepo.getClientProjectsByDeveloper(clientId, developerId);

    return projects.map(project => ({
        id: String(project.id),
        name: project.name,
        clientId: String(project.clientId),
        status: project.status,
        description: project.description,
        budget: project.budget,
        estimatedDelivery: project.estimatedDelivery,
        manager: project.manager,
        startDate: project.startDate,
        taskCount: parseInt(project.taskCount) || 0,
        completedTasks: parseInt(project.completedTasks) || 0
    }));
}

/**
 * Busca tarefas de um projeto específico para o colaborador
 */
async function getMyProjectTasks(projectId, developerId) {
    const tasks = await developerRepo.getProjectTasksByDeveloper(projectId, developerId);

    return tasks.map(task => ({
        id: String(task.id),
        title: task.title,
        projectId: String(task.projectId),
        clientId: String(task.clientId),
        developerId: String(task.developerId),
        developer: task.developer,
        status: mapStatusFromDb(task.status),
        progress: task.progress || 0,
        priority: mapPriorityFromDb(task.priority),
        impact: mapImpactFromDb(task.impact),
        risks: task.risks,
        notes: task.notes,
        description: task.description,
        attachment: task.attachment,
        estimatedDelivery: task.estimatedDelivery,
        actualDelivery: task.actualDelivery,
        scheduledStart: task.scheduledStart,
        actualStart: task.actualStart
    }));
}

/**
 * Busca estatísticas gerais do colaborador
 */
async function getMyStats(developerId) {
    return await developerRepo.getDeveloperStats(developerId);
}

module.exports = {
    getMyClients,
    getMyClientProjects,
    getMyProjectTasks,
    getMyStats
};
