const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const logger = require('../utils/logger');

/**
 * @description Get current user's profile
 * @route GET /api/users/me
 */
const getMe = async (req, res) => {
    try {
        // req.user is attached by the protect middleware.
        // We can just send it back as it already excludes the password hash.
        res.json(req.user);
    } catch (error) {
        logger.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

/**
 * @description Update user password
 * @route PUT /api/users/me/password
 */
const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Both current and new passwords are required.' });
        }

        // Get the full user object including the password hash from the DB
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Compare the provided current password with the stored hash
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }

        // Hash the new password
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update the user's password in the database
        user.password_hash = newPasswordHash;
        await user.save();

        logger.info(`Password updated for user: ${user.email}`);
        res.json({ message: 'Password updated successfully.' });

    } catch (error) {
        logger.error('Error updating password:', error);
        res.status(500).json({ message: 'Internal server error while updating password.' });
    }
};

module.exports = {
    getMe,
    updatePassword,
};