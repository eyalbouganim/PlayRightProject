const Song = require('../models/songModel');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

        // Create a new song record in the database
        const newSong = await Song.create({
            title: title,
            user_id: userId,
            musicXml: musicXmlContent,
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
 * Gets all songs uploaded by the current user.
 * Returns a lightweight list without the full MusicXML content.
 */
const getUserSongs = async (req, res) => {
    try {
        const userId = req.user.id;
        const songs = await Song.findAll({
            where: { user_id: userId },
            attributes: ['id', 'title', 'artist', 'createdAt'], // Don't send the full XML
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(songs);
    } catch (error) {
        logger.error('Error fetching user songs:', error);
        res.status(500).json({ message: 'Server error while fetching songs.' });
    }
};

/**
 * Gets a single song by its ID, ensuring it belongs to the current user.
 * Returns the full song object including MusicXML.
 */
const getSongById = async (req, res) => {
    try {
        const userId = req.user.id;
        const songId = req.params.id;

        const song = await Song.findOne({
            where: {
                id: songId,
                user_id: userId
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