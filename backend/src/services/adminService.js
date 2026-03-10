import { clientRepository } from '../repositories/clientRepository.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { auditRepository } from '../audit/auditRepository.js';
import { collaboratorRepository } from '../repositories/collaboratorRepository.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { checkProjectHasTasks, checkTaskHasHours } from './projectService.js';
import { USER_ROLES } from '../constants/roles.js';
import { auditService } from '../audit/auditService.js';

export const adminService = {
    async listClients(includeInactive) {
        return await clientRepository.findAll(includeInactive === 'true');
    },

    async listProjects(filters) {
        return await projectRepository.findAll({
            clientIds: filters.clientIds,
            includeInactive: filters.includeInactive === 'true'
        });
    },

    async listCollaborators(includeInactive) {
        return await collaboratorRepository.findAll(includeInactive === 'true');
    },

    async listTasks(filters) {
        return await taskRepository.findAll({ projectIds: filters.projectIds });
    },

    async deactivateProject(projectId, force, user) {
        const numericId = Number.parseInt(projectId, 10);
        if (Number.isNaN(numericId)) throw new Error('ID de projeto inválido');

        const project = await projectRepository.findById(numericId);
        if (!project) throw new Error('Projeto não encontrado');

        // Lógica de negócio: Validação de tarefas
        if (force !== 'true') {
            const hasTasks = await checkProjectHasTasks(numericId);
            if (hasTasks) {
                const error = new Error('Não é possível excluir este projeto pois existem tarefas criadas nele.');
                error.status = 400;
                error.hasTasks = true;
                throw error;
            }
        } else {
            const hasTasks = await checkProjectHasTasks(numericId);
            if (hasTasks && user.role !== USER_ROLES.SYSTEM_ADMIN) {
                const error = new Error('Apenas Administradores do Sistema podem realizar a exclusão forçada.');
                error.status = 403;
                throw error;
            }
        }

        const result = await projectRepository.update(numericId, { ativo: false });

        // Log de Auditoria
        await auditService.logAction({
            userId: user.colaboradorId,
            action: 'DELETE (Soft)',
            entity: 'Projeto',
            entityId: numericId,
            userName: user.nome,
            entityName: project.NomeProjeto,
            clientId: project.ID_Cliente,
            oldData: { name: project.NomeProjeto, budget: project.budget }
        });

        return result;
    },

    async deactivateTask(taskId, force, deleteHours, user) {
        const task = await taskRepository.findById(taskId);
        if (!task) throw new Error('Tarefa não encontrada');

        const hasHours = await checkTaskHasHours(taskId);
        if (hasHours && force !== 'true') {
            const error = new Error('Não é possível excluir esta tarefa pois existem horas apontadas nela.');
            error.status = 400;
            error.hasHours = true;
            throw error;
        }

        if (hasHours && force === 'true' && user.role !== USER_ROLES.SYSTEM_ADMIN) {
            const error = new Error('Apenas Administradores do Sistema podem realizar a exclusão forçada de tarefas com horas.');
            error.status = 403;
            throw error;
        }

        const now = new Date().toISOString();
        const result = await taskRepository.softDelete(taskId, now);

        if (deleteHours === 'true' && hasHours) {
            await taskRepository.softDeleteHours(taskId, now);
        }

        await auditService.logAction({
            userId: user.colaboradorId,
            action: 'DELETE (Soft)',
            entity: 'Tarefa',
            entityId: taskId,
            userName: user.nome,
            entityName: task.Afazer,
            projectId: task.ID_Projeto,
            clientId: task.ID_Cliente,
            oldData: { name: task.Afazer, status: task.StatusTarefa }
        });

        return result;
    },
    async listAuditLogs(limit) {
        const parsedLimit = limit ? Number.parseInt(limit, 10) : 200;
        return await auditRepository.findAll({ limit: parsedLimit });
    }
};
