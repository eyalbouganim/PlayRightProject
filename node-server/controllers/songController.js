const Song = require('../models/songModel');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const { Op } = require('sequelize');

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Extracts the song title from MusicXML content.
 * @param {string} xmlContent - The MusicXML string.
 * @returns {string|null} The title or null if not found.
 */
const getTitleFromMusicXML = (xmlContent) => {
    const match = xmlContent.match(/<movement-title>(.*?)<\/movement-title>/);
    return match ? match[1] : null;
};

/**
 * Handles MusicXML file upload and saves it as a new song.
 */
const uploadSong = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {
        const userId = req.user.id; // From authMiddleware
        const musicXmlContent = req.file.buffer.toString('utf8');

        // Determine the title
        let title = getTitleFromMusicXML(musicXmlContent);
        if (!title) {
            // Fallback to the original filename without extension
            title = path.parse(req.file.originalname).name;
        }

        // Determine if it's for performance mode (default) or learning mode
        const isPerformance = req.body.performance !== undefined
            ? req.body.performance === 'true' || req.body.performance === true
            : true; // Default to performance mode

        // Create a new song record in the database
        const newSong = await Song.create({
            title: title,
            user_id: userId,
            musicXml: musicXmlContent,
            performance: isPerformance,
            default: false, // User-uploaded songs are never default
            // artist can be added later if needed
        });

        logger.info(`New song created with ID: ${newSong.id} for user ID: ${userId}`);

        res.status(201).json({
            message: 'Song uploaded and saved successfully!',
            song: newSong,
        });
    } catch (error) {
        logger.error('Error uploading song:', error);
        res.status(500).json({ message: 'Server error while saving the song.' });
    }
};

/**
 * Gets all songs accessible by the current user.
 * Returns default songs (system-provided) and user's own songs.
 * Supports filtering by mode: ?mode=performance or ?mode=learn
 * Returns a lightweight list without the full MusicXML content.
 */
const getUserSongs = async (req, res) => {
    try {
        const userId = req.user.id;
        const mode = req.query.mode; // Optional: 'performance' or 'learn'

        // Build the where clause
        const whereClause = {
            [Op.or]: [
                { default: true }, // Include all default songs
                { user_id: userId } // Include user's own songs
            ]
        };

        // If mode filter is specified, add it to the where clause
        if (mode === 'performance') {
            whereClause.performance = true;
        } else if (mode === 'learn') {
            whereClause.performance = false;
        }

        const songs = await Song.findAll({
            where: whereClause,
            attributes: ['id', 'title', 'artist', 'performance', 'default', 'createdAt'],
            order: [['default', 'DESC'], ['createdAt', 'DESC']] // Default songs first, then by date
        });

        res.status(200).json(songs);
    } catch (error) {
        logger.error('Error fetching user songs:', error);
        res.status(500).json({ message: 'Server error while fetching songs.' });
    }
};

/**
 * Gets a single song by its ID.
 * Returns default songs (accessible to all) or user's private songs.
 * Returns the full song object including MusicXML.
 */
const getSongById = async (req, res) => {
    try {
        const userId = req.user.id;
        const songId = req.params.id;

        // Allow access to default songs OR user's own songs
        const song = await Song.findOne({
            where: {
                id: songId,
                [Op.or]: [
                    { default: true }, // Default songs accessible to all users
                    { user_id: userId } // User's private songs
                ]
            }
        });

        if (!song) {
            return res.status(404).json({ message: 'Song not found or you do not have permission to access it.' });
        }

        res.status(200).json(song);
    } catch (error) {
        logger.error(`Error fetching song with ID ${req.params.id}:`, error);
        res.status(500).json({ message: 'Server error while fetching the song.' });
    }
};

module.exports = {
    uploadSong,
    upload, // Export multer instance for use in routes
    getUserSongs,
    getSongById,
};