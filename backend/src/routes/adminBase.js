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

        // 1. Validar se o projeto tem tarefas
        const hasTasks = await checkProjectHasTasks(projectId);
        if (hasTasks) {
            if (force === 'true') {
                console.log(`[DELETE Project] Forced deletion: removing all tasks and data for project ${numericId}`);

                // Buscar IDs das tarefas do projeto
                const { data: projectTasks } = await supabaseAdmin
                    .from('fato_tarefas')
                    .select('id_tarefa_novo')
                    .eq('ID_Projeto', numericId);

                if (projectTasks && projectTasks.length > 0) {
                    const taskIds = projectTasks.map(t => t.id_tarefa_novo);

                    // Limpar Horas Trabalhadas
                    await supabaseAdmin.from('horas_trabalhadas').delete().in('id_tarefa_novo', taskIds);

                    // Limpar Colaboradores das Tarefas
                    await supabaseAdmin.from('tarefa_colaboradores').delete().in('id_tarefa', taskIds);

                    // Limpar as Tarefas
                    await supabaseAdmin.from('fato_tarefas').delete().eq('ID_Projeto', numericId);
                }
            } else {
                return res.status(400).json({
                    error: 'Não é possível excluir este projeto pois existem tarefas criadas nele.',
                    hasTasks: true
                });
            }
        }

        // 2. Limpar Membros do Projeto
        await supabaseAdmin.from('project_members').delete().eq('id_projeto', numericId);

        // 3. Limpar Custos/Budget se existirem
        await supabaseAdmin.from('project_budgets').delete().eq('id_projeto', numericId);

        // 4. Excluir o Projeto
        const { data, error } = await supabaseAdmin
            .from('dim_projetos')
            .delete()
            .eq('ID_Projeto', numericId)
            .select();

        if (error) {
            if (error.code === '23503') {
                throw new Error('Não é possível excluir o projeto pois existem registros vinculados externos.');
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

        // 1. Remover links de colaboradores para evitar FK constraint
        const { error: collabError } = await supabaseAdmin
            .from('tarefa_colaboradores')
            .delete()
            .eq('id_tarefa', taskId);

        if (collabError) {
            console.error('Erro ao remover colaboradores da tarefa:', collabError);
            throw collabError;
        }

        // 2. Validar se a tarefa tem horas apontadas
        const hasHours = await checkTaskHasHours(taskId);
        if (hasHours) {
            if (force === 'true') {
                console.log(`[DELETE Task] Forcing deletion of hours for task ${taskId}`);
                const { error: hoursError } = await supabaseAdmin
                    .from('horas_trabalhadas')
                    .delete()
                    .eq('id_tarefa_novo', taskId);

                if (hoursError) {
                    console.error('Erro ao remover horas da tarefa:', hoursError);
                    throw hoursError;
                }
            } else {
                return res.status(400).json({
                    error: 'Não é possível excluir esta tarefa pois existem horas apontadas nela.',
                    hasHours: true
                });
            }
        }

        // 3. Exclusão física da tarefa
        const { error, data } = await supabaseAdmin
            .from('fato_tarefas')
            .delete()
            .eq('id_tarefa_novo', taskId)
            .select();

        if (error) throw error;

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
