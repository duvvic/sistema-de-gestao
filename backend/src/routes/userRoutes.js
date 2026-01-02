const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET all users
router.get('/', userController.getUsers);

// GET user by ID
router.get('/:id', userController.getUserById);

// POST create user
router.post('/', userController.createUser);

// PUT update user
router.put('/:id', userController.updateUser);

// DELETE deactivate user
router.delete('/:id', userController.deactivateUser);

module.exports = router;
