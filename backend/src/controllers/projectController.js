const getProjects = async (req, res) => {
    try {
        const { clientId } = req.query;

        let query = req.supabase.from('dim_projetos').select('*');

        if (clientId) {
            query = query.eq('ID_Cliente', clientId);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Error fetching projects' });
    }
};

module.exports = { getProjects };
