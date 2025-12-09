const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * @description Register a new user
 * @route POST /api/auth/register
 */
const register = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Create user
        const newUser = await User.create({
            first_name: firstName,
            last_name: lastName,
            email,
            password_hash
        });

        logger.info(`New user registered: ${newUser.email}`);
        res.status(201).json({ message: 'User registered successfully.', userId: newUser.id });

    } catch (error) {
        logger.error('Error during user registration:', error);
        res.status(500).json({ message: 'Internal server error during registration.' });
    }
};

/**
 * @description Authenticate a user and return a JWT
 * @route POST /api/auth/login
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' }); // Generic message for security
        }

        // Compare password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Create JWT payload
        const payload = { id: user.id, email: user.email };

        // Sign the token
        const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

        res.json({
            message: 'Login successful',
            token,
            user: {
                firstName: user.first_name,
                lastName: user.last_name,
            }
        });
    } catch (error) {
        logger.error('Error during user login:', error);
        res.status(500).json({ message: 'Internal server error during login.' });
    }
};

module.exports = { register, login };