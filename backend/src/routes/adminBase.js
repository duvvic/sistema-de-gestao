import express from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { checkProjectHasTasks, checkTaskHasHours } from '../services/projectService.js';

const router = express.Router();

// GET /api/admin/clients
router.get('/clients', requireAdmin, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('dim_clientes')
            .select('ID_Cliente, NomeCliente')
            .eq('ativo', true)
            .order('NomeCliente');

        if (error) throw error;
        res.json(data.map(c => ({ id: c.ID_Cliente, name: c.NomeCliente })));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/admin/projects
router.get('/projects', requireAdmin, async (req, res) => {
    try {
        const { clientIds } = req.query;
        let query = supabaseAdmin
            .from('dim_projetos')
            .select('ID_Projeto, NomeProjeto, ID_Cliente')
            .eq('ativo', true)
            .order('NomeProjeto');

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
        const { data, error } = await supabaseAdmin
            .from('dim_colaboradores')
            .select('ID_Colaborador, NomeColaborador, email, role')
            .eq('ativo', true)
            .order('NomeColaborador');

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
        console.log(`[DELETE Project] Attempting to delete project ID: "${projectId}", force: ${force}`);

        const numericId = parseInt(projectId, 10);
        if (isNaN(numericId)) {
            return res.status(400).json({ error: 'ID de projeto inválido' });
        }

        // 1. Validar se o projeto tem tarefas ou se o delete é forçado
        if (force !== 'true') {
            const hasTasks = await checkProjectHasTasks(numericId);
            if (hasTasks) {
                return res.status(400).json({
                    error: 'Não é possível excluir este projeto pois existem tarefas criadas nele.',
                    hasTasks: true
                });
            }
        }

        // 2. Excluir o Projeto (O banco de dados cuidará das tarefas, horas, membros e budgets via CASCADE)
        const { data, error } = await supabaseAdmin
            .from('dim_projetos')
            .delete()
            .eq('ID_Projeto', numericId)
            .select();

        if (error) {
            console.error('Erro ao excluir projeto no DB:', error);
            if (error.code === '23503') {
                return res.status(400).json({
                    error: 'Não é possível excluir o projeto pois existem registros vinculados externos. Tente usar a opção de exclusão forçada.',
                    code: error.code
                });
            }
            throw error;
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Projeto não encontrado.' });
        }

        res.json({ success: true, message: 'Projeto e todos os dados vinculados foram excluídos.' });
    } catch (e) {
        console.error('Erro ao excluir projeto:', e);
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/admin/tasks/:id
router.delete('/tasks/:id', requireAdmin, async (req, res) => {
    try {
        const taskId = req.params.id;
        const { force } = req.query;

        console.log(`[DELETE Task] Attempting to delete task ID: ${taskId}, force: ${force}`);

        // 1. Validar se a tarefa tem horas apontadas ou se o delete é forçado
        if (force !== 'true') {
            const hasHours = await checkTaskHasHours(taskId);
            if (hasHours) {
                return res.status(400).json({
                    error: 'Não é possível excluir esta tarefa pois existem horas apontadas nela.',
                    hasHours: true
                });
            }
        }

        // 2. Exclusão física da tarefa (O banco de dados cuidará dos colaboradores e horas via CASCADE)
        const { error, data } = await supabaseAdmin
            .from('fato_tarefas')
            .delete()
            .eq('id_tarefa_novo', taskId)
            .select();

        if (error) {
            console.error('Erro ao excluir tarefa no DB:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada.' });
        }

        res.json({ success: true, message: 'Tarefa excluída com sucesso.' });
    } catch (e) {
        console.error('Erro ao excluir tarefa:', e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
