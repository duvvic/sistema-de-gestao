const projectService = require('../services/projectService');

const getProjects = async (req, res) => {
    try {
        const { clientId } = req.query;
        let projects;
        if (clientId) {
            projects = await projectService.getProjectsByClient(clientId);
        } else {
            projects = await projectService.getAllProjects();
        }
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const createProject = async (req, res) => {
    try {
        const newProject = await projectService.createProject(req.body);
        res.status(201).json(newProject);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedProject = await projectService.updateProject(id, req.body);
        res.json(updatedProject);
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { hard } = req.query;
        await projectService.deleteProject(id, hard === 'true');
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getProjects,
    createProject,
    updateProject,
    deleteProject
};
