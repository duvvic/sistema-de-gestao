const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// GET all projects (optionally filtered by ?clientId=)
router.get('/', projectController.getProjects);

// POST create project
router.post('/', projectController.createProject);

// PUT update project
router.put('/:id', projectController.updateProject);

// DELETE project (soft by default, ?hard=true for hard delete)
router.delete('/:id', projectController.deleteProject);

module.exports = router;
