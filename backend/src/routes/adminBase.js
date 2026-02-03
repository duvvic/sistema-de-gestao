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

        // Validar se o projeto tem tarefas
        const hasTasks = await checkProjectHasTasks(projectId);
        if (hasTasks) {
            return res.status(400).json({
                error: 'Não é possível excluir este projeto pois existem tarefas criadas nele.'
            });
        }

        // Soft delete do projeto
        const { error } = await supabaseAdmin
            .from('dim_projetos')
            .update({ ativo: false })
            .eq('ID_Projeto', projectId);

        if (error) throw error;
        res.json({ success: true, message: 'Projeto excluído com sucesso.' });
    } catch (e) {
        console.error('Erro ao excluir projeto:', e);
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/admin/tasks/:id
router.delete('/tasks/:id', async (req, res) => {
    try {
        const taskId = req.params.id;

        // Validar se a tarefa tem horas apontadas
        const hasHours = await checkTaskHasHours(taskId);
        if (hasHours) {
            return res.status(400).json({
                error: 'Não é possível excluir esta tarefa pois existem horas apontadas nela.'
            });
        }

        // Exclusão física da tarefa
        const { error } = await supabaseAdmin
            .from('fato_tarefas')
            .delete()
            .eq('id_tarefa_novo', taskId);

        if (error) throw error;
        res.json({ success: true, message: 'Tarefa excluída com sucesso.' });
    } catch (e) {
        console.error('Erro ao excluir tarefa:', e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
