const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');

/**
 * @route   POST /api/songs/upload
 * @desc    Upload a MusicXML file and create a new song entry
 * @access  Private
 */
router.post('/upload', songController.upload.single('musicXmlFile'), songController.uploadSong);

/**
 * @route   GET /api/songs
 * @desc    Get all songs for the logged-in user
 * @access  Private
 */
router.get('/', songController.getUserSongs);

/**
 * @route   GET /api/songs/:id
 * @desc    Get a single song by ID
 * @access  Private
 */
router.get('/:id', songController.getSongById);


module.exports = router;