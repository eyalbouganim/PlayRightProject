const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/userModel');
const config = require('../config/config');
const logger = require('../utils/logger');

// Initialize Google Client
// Using the Client ID found in your frontend configuration
const GOOGLE_CLIENT_ID = "1013568186744-3bdq5sbmqh4l666c2bpd5mirp5p8evjd.apps.googleusercontent.com";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * @description Register a new user
 * @route POST /api/auth/register
 */
const register = async (req, res) => {
    try {
        const { firstName, lastName, email, password, profilePic } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters with uppercase, lowercase, and a special character.'
            });
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
            password_hash,
            profile_pic: profilePic || null
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
                profilePic: user.profile_pic
            }
        });
    } catch (error) {
        logger.error('Error during user login:', error);
        res.status(500).json({ message: 'Internal server error during login.' });
    }
};

/**
 * @description Authenticate a user via Google OAuth
 * @route POST /api/auth/google
 */
const googleLogin = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'Google token is required.' });
        }

        // Verify the token from Google
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, given_name, family_name, sub } = payload; // 'sub' is the unique Google ID

        // Check if user exists
        let user = await User.findOne({ where: { email } });

        if (!user) {
            // Create a new user if they don't exist
            // Generate a random password since they are using Google Auth
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(randomPassword, saltRounds);

            user = await User.create({
                first_name: given_name || 'Google',
                last_name: family_name || 'User',
                email,
                password_hash,
                google_id: sub
            });

            logger.info(`New user registered via Google: ${user.email}`);
        } else if (!user.google_id) {
            // Merge scenario: User exists (registered via email/pass) but hasn't linked Google yet.
            // We update the record to include the google_id so they can use both methods.
            user.google_id = sub;
            await user.save();
            logger.info(`Existing user linked with Google account: ${user.email}`);
        }

        // Create JWT payload (same as standard login)
        const jwtPayload = { id: user.id, email: user.email };

        // Sign the token
        const appToken = jwt.sign(jwtPayload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

        res.json({
            message: 'Google login successful',
            token: appToken,
            user: {
                firstName: user.first_name,
                lastName: user.last_name,
                profilePic: user.profile_pic
            }
        });

    } catch (error) {
        logger.error('Error during Google login:', error);
        res.status(401).json({ message: 'Google authentication failed.' });
    }
};

module.exports = { register, login, googleLogin };