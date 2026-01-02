const getUsers = async (req, res) => {
    try {
        const { data, error } = await req.supabase
            .from('dim_colaboradores')
            .select('*');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
};

module.exports = {
    getUsers
};
