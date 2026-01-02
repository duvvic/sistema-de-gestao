const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

// GET all clients
router.get('/', clientController.getClients);

// POST create client
router.post('/', clientController.createClient);

// PUT update client
router.put('/:id', clientController.updateClient);

// DELETE client (soft by default, ?hard=true for hard delete)
router.delete('/:id', clientController.deleteClient);

module.exports = router;
