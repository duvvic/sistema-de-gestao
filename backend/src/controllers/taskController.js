const getTasks = async (req, res) => {
    try {
        const { projectId, clientId, userId } = req.query;

        // Start building the query
        // req.supabase is the client authenticated as the user
        let query = req.supabase.from('fato_tarefas').select('*');

        if (projectId) {
            query = query.eq('ID_Projeto', projectId);
        }
        if (clientId) {
            query = query.eq('ID_Cliente', clientId);
        }
        if (userId) {
            query = query.eq('ID_Colaborador', userId);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Error fetching tasks' });
    }
};

const createTask = async (req, res) => {
    try {
        const taskData = req.body;
        const { data, error } = await req.supabase
            .from('fato_tarefas_v2')
            .insert(taskData)
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Error creating task' });
    }
};

const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await req.supabase
            .from('fato_tarefas_v2')
            .update(updates)
            .eq('id_tarefa_novo', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Error updating task' });
    }
};

const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await req.supabase
            .from('fato_tarefas_v2')
            .delete()
            .eq('id_tarefa_novo', id);

        if (error) throw error;
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Error deleting task' });
    }
};

module.exports = {
    getTasks,
    createTask,
    updateTask,
    deleteTask
};
