// routes/performances.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const performancesController = require('../controllers/performancesController');

const router = express.Router();

// Ensure upload directories exist
const uploadDirs = ['uploads/audio', 'uploads/musicxml'];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Multer configuration for audio files
const audioStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/audio/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Multer configuration for MusicXML files
const musicXmlStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/musicxml/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'musicxml-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Create multer instances
const uploadAudio = multer({ 
    storage: audioStorage,
    fileFilter: (req, file, cb) => {
        // Accept audio files
        const allowedMimes = ['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid audio file type'));
        }
    }
});

const uploadMusicXml = multer({ 
    storage: musicXmlStorage,
    fileFilter: (req, file, cb) => {
        // Accept XML files
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.xml' || ext === '.musicxml') {
            cb(null, true);
        } else {
            cb(new Error('Invalid MusicXML file type'));
        }
    }
});

// Route to upload MusicXML file
router.post('/upload-musicxml', uploadMusicXml.single('musicXmlFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No MusicXML file provided' });
    }
    
    res.json({ 
        success: true, 
        filePath: req.file.path,
        fileName: req.file.originalname
    });
});

// Route for performance analysis with audio file upload
router.post('/analyze', uploadAudio.single('audioFile'), performancesController.analyzePerformance);

// Get route to check server status
router.get('/', (req, res) => {
    res.status(200).json({ status: 'Performance analysis service is running.' });
});

module.exports = router;