const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// @route   GET api/users/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', userController.getMe);

// @route   PUT api/users/me/password
// @desc    Update user password
// @access  Private
router.put('/me/password', userController.updatePassword);

module.exports = router;
