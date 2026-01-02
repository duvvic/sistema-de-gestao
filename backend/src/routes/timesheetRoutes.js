const express = require('express');
const router = express.Router();
const timesheetController = require('../controllers/timesheetController');

// GET all timesheets (filterable by ?userId=, ?fromDate=, ?toDate=)
router.get('/', timesheetController.getTimesheets);

// GET timesheet by ID
router.get('/:id', timesheetController.getTimesheetById);

// POST create timesheet
router.post('/', timesheetController.createTimesheet);

// PUT update timesheet
router.put('/:id', timesheetController.updateTimesheet);

// DELETE timesheet
router.delete('/:id', timesheetController.deleteTimesheet);

module.exports = router;
