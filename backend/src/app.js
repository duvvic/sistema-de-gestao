const express = require('express');
const cors = require('cors');
const taskRoutes = require('./routes/taskRoutes');
const projectRoutes = require('./routes/projectRoutes');
const clientRoutes = require('./routes/clientRoutes');
const timesheetRoutes = require('./routes/timesheetRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const authMiddleware = require('./middlewares/authMiddleware');

app.use(cors());
app.use(express.json());

// Routes (Protected)
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/clients', authMiddleware, clientRoutes);
app.use('/api/timesheets', authMiddleware, timesheetRoutes);
app.use('/api/users', authMiddleware, userRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'API Sistema de Gestão is running' });
});

module.exports = app;
