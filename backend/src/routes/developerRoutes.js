// backend/src/routes/developerRoutes.js
const express = require('express');
const router = express.Router();
const developerController = require('../controllers/developerController');

// Todas as rotas aqui assumem que há um middleware de autenticação anterior
// que popula req.user com { id, role, ... }

/**
 * GET /api/developer/clients
 * Retorna clientes vinculados ao colaborador logado
 */
router.get('/clients', developerController.getMyClients);

/**
 * GET /api/developer/clients/:clientId/projects
 * Retorna projetos de um cliente para o colaborador
 */
router.get('/clients/:clientId/projects', developerController.getMyClientProjects);

/**
 * GET /api/developer/projects/:projectId/tasks
 * Retorna tarefas de um projeto para o colaborador
 */
router.get('/projects/:projectId/tasks', developerController.getMyProjectTasks);

/**
 * GET /api/developer/stats
 * Retorna estatísticas gerais do colaborador
 */
router.get('/stats', developerController.getMyStats);

module.exports = router;
