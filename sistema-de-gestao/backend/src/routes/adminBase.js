import express from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { checkProjectHasTasks, checkTaskHasHours } from '../services/projectService.js';
import { USER_ROLES } from '../constants/roles.js';

const router = express.Router();

// Helper to log audit actions
async function logAudit(req, action, resource, resourceId, details = {}) {
    try {
        const { colaboradorId, role, nome } = req.user;
        const auditLog = {
            user_id: colaboradorId,
            user_role: role,
            action: action,
            resource: resource,
            resource_id: resourceId,
            changes: details,
            timestamp: new Date().toISOString(),
            task_name: details.name || details.title || null,
            project_id: details.projectId || null,
            client_id: details.clientId || null
        };
        await supabaseAdmin.from('audit_log').insert(auditLog);
    } catch (e) {
        console.error('Failed to log audit:', e);
    }
}

// GET /api/admin/clients
router.get('/clients', requireAdmin, async (req, res) => {
    try {
        const { includeInactive } = req.query;
        let query = supabaseAdmin
            .from('dim_clientes')
            .select('ID_Cliente, NomeCliente')
            .order('NomeCliente');

        if (includeInactive !== 'true') {
            query = query.eq('ativo', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data.map(c => ({ id: c.ID_Cliente, name: c.NomeCliente })));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/admin/projects
router.get('/projects', requireAdmin, async (req, res) => {
    try {
        const { clientIds, includeInactive } = req.query;
        let query = supabaseAdmin
            .from('dim_projetos')
            .select('ID_Projeto, NomeProjeto, ID_Cliente')
            .order('NomeProjeto');

        if (includeInactive !== 'true') {
            query = query.eq('ativo', true);
        }

        if (clientIds) {
            const ids = clientIds.split(',').map(Number);
            query = query.in('ID_Cliente', ids);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data.map(p => ({ id: p.ID_Projeto, name: p.NomeProjeto, clientId: p.ID_Cliente })));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/admin/collaborators
router.get('/collaborators', requireAdmin, async (req, res) => {
    try {
        const { includeInactive } = req.query;
        let query = supabaseAdmin
            .from('dim_colaboradores')
            .select('ID_Colaborador, NomeColaborador, email, role')
            .order('NomeColaborador');

        if (includeInactive !== 'true') {
            query = query.eq('ativo', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data.map(c => ({ id: c.ID_Colaborador, name: c.NomeColaborador, email: c.email, role: c.role })));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/admin/tasks
router.get('/tasks', requireAdmin, async (req, res) => {
    try {
        const { projectIds } = req.query;
        let query = supabaseAdmin
            .from('fato_tarefas')
            .select('id_tarefa_novo, Afazer, ID_Projeto')
            .order('Afazer');

        if (projectIds) {
            const ids = projectIds.split(',').map(Number);
            query = query.in('ID_Projeto', ids);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data.map(t => ({ id: t.id_tarefa_novo, name: t.Afazer, projectId: t.ID_Projeto })));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/admin/projects/:id
router.delete('/projects/:id', requireAdmin, async (req, res) => {
    try {
        const projectId = req.params.id;
        const { force } = req.query;
        console.log(`[DELETE Project] Attempting to SOFT DELETE project ID: "${projectId}", force: ${force}`);

        const numericId = parseInt(projectId, 10);
        if (isNaN(numericId)) {
            return res.status(400).json({ error: 'ID de projeto inválido' });
        }

        // Pre-fetch data for logging
        const { data: project } = await supabaseAdmin
            .from('dim_projetos')
            .select('NomeProjeto, ID_Cliente')
            .eq('ID_Projeto', numericId)
            .single();

        // 1. Validar se o projeto tem tarefas ou se o delete é forçado
        if (force !== 'true') {
            const hasTasks = await checkProjectHasTasks(numericId);
            if (hasTasks) {
                return res.status(400).json({
                    error: 'Não é possível excluir este projeto pois existem tarefas criadas nele.',
                    hasTasks: true
                });
            }
        } else {
            // Se for forçado, apenas system_admin pode excluir se houver tarefas
            const hasTasks = await checkProjectHasTasks(numericId);
            if (hasTasks && req.user.role !== USER_ROLES.SYSTEM_ADMIN) {
                return res.status(403).json({
                    error: 'Apenas Administradores do Sistema podem realizar a exclusão forçada de projetos com tarefas.'
                });
            }
        }

        // 2. SOFT DELETE do Projeto (Marcamos como inativo e setamos deleted_at se a coluna existir, ou apenas inativo)
        // Como o usuário pediu para "sempre armazenar", vamos usar ativo: false.
        const { data, error } = await supabaseAdmin
            .from('dim_projetos')
            .update({ ativo: false })
            .eq('ID_Projeto', numericId)
            .select();

        if (error) {
            console.error('Erro ao excluir projeto no DB:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Projeto não encontrado.' });
        }

        // Log the action
        await logAudit(req, 'DELETE (Soft)', 'Projeto', numericId, {
            name: project?.NomeProjeto,
            clientId: project?.ID_Cliente,
            forced: force === 'true'
        });

        res.json({ success: true, message: 'Projeto desativado com sucesso.' });
    } catch (e) {
        console.error('Erro ao excluir projeto:', e);
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/admin/tasks/:id
router.delete('/tasks/:id', requireAdmin, async (req, res) => {
    try {
        const taskId = req.params.id;
        const { force, deleteHours } = req.query;

        console.log(`[DELETE Task] Attempting to SOFT DELETE task ID: ${taskId}, force: ${force}, deleteHours: ${deleteHours}`);

        // Pre-fetch data for logging
        const { data: task } = await supabaseAdmin
            .from('fato_tarefas')
            .select('Afazer, ID_Projeto, ID_Cliente')
            .eq('id_tarefa_novo', taskId)
            .single();

        // 1. Validar se a tarefa tem horas apontadas ou se o delete é forçado
        const hasHours = await checkTaskHasHours(taskId);
        if (hasHours && force !== 'true') {
            return res.status(400).json({
                error: 'Não é possível excluir esta tarefa pois existem horas apontadas nela.',
                hasHours: true
            });
        }

        // Se houver horas e for forçado, apenas system_admin pode excluir? 
        // O usuário pediu a opção de excluir os apontamentos junto.
        if (hasHours && force === 'true' && req.user.role !== USER_ROLES.SYSTEM_ADMIN) {
            return res.status(403).json({
                error: 'Segurança: Apenas Administradores do Sistema podem realizar a exclusão forçada de tarefas com horas.'
            });
        }

        const now = new Date().toISOString();

        // 2. SOFT DELETE da tarefa
        const { error: taskError, data: taskData } = await supabaseAdmin
            .from('fato_tarefas')
            .update({ deleted_at: now })
            .eq('id_tarefa_novo', taskId)
            .select();

        if (taskError) {
            console.error('Erro ao excluir tarefa no DB:', taskError);
            throw taskError;
        }

        if (!taskData || taskData.length === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada.' });
        }

        // 3. Opcional: SOFT DELETE das horas vinculadas
        if (deleteHours === 'true' && hasHours) {
            const { error: hoursError } = await supabaseAdmin
                .from('horas_trabalhadas')
                .update({ deleted_at: now })
                .eq('id_tarefa_novo', taskId);

            if (hoursError) console.error('Erro ao excluir horas da tarefa:', hoursError);
        }

        // Log the action
        await logAudit(req, 'DELETE (Soft)', 'Tarefa', taskId, {
            name: task?.Afazer,
            projectId: task?.ID_Projeto,
            clientId: task?.ID_Cliente,
            forced: force === 'true',
            hadHours: hasHours,
            deletedHours: deleteHours === 'true'
        });

        res.json({ success: true, message: 'Tarefa excluída logicamente com sucesso.' });
    } catch (e) {
        console.error('Erro ao excluir tarefa:', e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
