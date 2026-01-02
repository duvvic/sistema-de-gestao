const getClients = async (req, res) => {
    try {
        const { data, error } = await req.supabase.from('dim_clientes').select('*');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Error fetching clients' });
    }
};

module.exports = { getClients };
