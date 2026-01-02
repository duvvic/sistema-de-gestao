const clientService = require('../services/clientService');

const getClients = async (req, res) => {
    try {
        const clients = await clientService.getAllClients();
        res.json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const createClient = async (req, res) => {
    try {
        const newClient = await clientService.createClient(req.body);
        res.status(201).json(newClient);
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedClient = await clientService.updateClient(id, req.body);
        res.json(updatedClient);
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        const { hard } = req.query; // ?hard=true
        await clientService.deleteClient(id, hard === 'true');
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getClients,
    createClient,
    updateClient,
    deleteClient
};
