const timesheetService = require('../services/timesheetService');

const getTimesheets = async (req, res) => {
    try {
        const { userId, fromDate, toDate } = req.query;
        const timesheets = await timesheetService.getAllTimesheets({ userId, fromDate, toDate });
        res.json(timesheets);
    } catch (error) {
        console.error('Error fetching timesheets:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getTimesheetById = async (req, res) => {
    try {
        const { id } = req.params;
        const timesheet = await timesheetService.getTimesheetById(id);
        if (!timesheet) {
            return res.status(404).json({ error: 'Timesheet not found' });
        }
        res.json(timesheet);
    } catch (error) {
        console.error('Error fetching timesheet:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const createTimesheet = async (req, res) => {
    try {
        const newTimesheet = await timesheetService.createTimesheet(req.body);
        res.status(201).json(newTimesheet);
    } catch (error) {
        console.error('Error creating timesheet:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateTimesheet = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedTimesheet = await timesheetService.updateTimesheet(id, req.body);
        res.json(updatedTimesheet);
    } catch (error) {
        console.error('Error updating timesheet:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const deleteTimesheet = async (req, res) => {
    try {
        const { id } = req.params;
        await timesheetService.deleteTimesheet(id);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting timesheet:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getTimesheets,
    getTimesheetById,
    createTimesheet,
    updateTimesheet,
    deleteTimesheet
};
