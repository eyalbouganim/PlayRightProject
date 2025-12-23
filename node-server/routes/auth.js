const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// @route   POST api/auth/register
// @desc    Register a new user
router.post('/register', authController.register);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', authController.login);

// @route   POST api/auth/google
// @desc    Authenticate user via Google OAuth
router.post('/google', authController.googleLogin);

module.exports = router;