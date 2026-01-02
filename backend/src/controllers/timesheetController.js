const getTimesheets = async (req, res) => {
    try {
        const { userId, fromDate, toDate } = req.query;

        let query = req.supabase
            .from('horas_trabalhadas')
            .select('*, dim_colaboradores(NomeColaborador)')
            .order('Data', { ascending: false });

        if (userId) query = query.eq('ID_Colaborador', userId);
        if (fromDate) query = query.gte('Data', fromDate);
        if (toDate) query = query.lte('Data', toDate);

        const { data, error } = await query;

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching timesheets:', error);
        res.status(500).json({ error: 'Error fetching timesheets' });
    }
};

const createTimesheet = async (req, res) => {
    try {
        const payload = req.body;
        const { data, error } = await req.supabase
            .from('horas_trabalhadas')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating timesheet:', error);
        res.status(500).json({ error: 'Error creating timesheet' });
    }
};

const updateTimesheet = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { data, error } = await req.supabase
            .from('horas_trabalhadas')
            .update(updates)
            .eq('ID_Horas_Trabalhadas', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error updating timesheet:', error);
        res.status(500).json({ error: 'Error updating timesheet' });
    }
};

const deleteTimesheet = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await req.supabase
            .from('horas_trabalhadas')
            .delete()
            .eq('ID_Horas_Trabalhadas', id);

        if (error) throw error;
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting timesheet:', error);
        res.status(500).json({ error: 'Error deleting timesheet' });
    }
};

module.exports = {
    getTimesheets,
    createTimesheet,
    updateTimesheet,
    deleteTimesheet
};
