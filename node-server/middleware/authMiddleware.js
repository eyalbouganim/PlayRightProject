const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User } = require('../models/userModel');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
    let token;

    // Check for token in the Authorization header (format: "Bearer <token>")
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify the token using the secret key
            const decoded = jwt.verify(token, config.jwt.secret);

            // Find the user from the token's payload ID and attach it to the request object.
            // We exclude the password hash from being attached.
            req.user = await User.findByPk(decoded.id, {
                attributes: { exclude: ['password_hash'] }
            });

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // If user is found, proceed to the next middleware or the route handler
            next();
        } catch (error) {
            logger.error('Authorization error: Token failed verification.', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

module.exports = { protect };