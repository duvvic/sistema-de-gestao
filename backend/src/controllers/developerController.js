// backend/src/controllers/developerController.js
const developerService = require('../services/developerService');

/**
 * GET /api/developer/clients
 * Retorna clientes vinculados ao colaborador logado
 */
async function getMyClients(req, res) {
    try {
        const developerId = req.user?.id; // Assumindo que o middleware de auth popula req.user

        if (!developerId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const clients = await developerService.getMyClients(developerId);
        res.json(clients);
    } catch (error) {
        console.error('Error fetching developer clients:', error);
        res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
}

/**
 * GET /api/developer/clients/:clientId/projects
 * Retorna projetos de um cliente específico para o colaborador
 */
async function getMyClientProjects(req, res) {
    try {
        const developerId = req.user?.id;
        const { clientId } = req.params;

        if (!developerId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const projects = await developerService.getMyClientProjects(clientId, developerId);
        res.json(projects);
    } catch (error) {
        console.error('Error fetching client projects:', error);
        res.status(500).json({ error: 'Erro ao buscar projetos' });
    }
}

/**
 * GET /api/developer/projects/:projectId/tasks
 * Retorna tarefas de um projeto específico para o colaborador
 */
async function getMyProjectTasks(req, res) {
    try {
        const developerId = req.user?.id;
        const { projectId } = req.params;

        if (!developerId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const tasks = await developerService.getMyProjectTasks(projectId, developerId);
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching project tasks:', error);
        res.status(500).json({ error: 'Erro ao buscar tarefas' });
    }
}

/**
 * GET /api/developer/stats
 * Retorna estatísticas gerais do colaborador
 */
async function getMyStats(req, res) {
    try {
        const developerId = req.user?.id;

        if (!developerId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const stats = await developerService.getMyStats(developerId);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching developer stats:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
}

module.exports = {
    getMyClients,
    getMyClientProjects,
    getMyProjectTasks,
    getMyStats
};
