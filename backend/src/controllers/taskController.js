const taskService = require('../services/taskService');

const getTasks = async (req, res) => {
    try {
        const { projectId, clientId, userId } = req.query;
        const tasks = await taskService.getAllTasks({ projectId, clientId, userId });
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await taskService.getTaskById(id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const createTask = async (req, res) => {
    try {
        const newTask = await taskService.createTask(req.body);
        res.status(201).json(newTask);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedTask = await taskService.updateTask(id, req.body);
        res.json(updatedTask);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        await taskService.deleteTask(id);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask
};
