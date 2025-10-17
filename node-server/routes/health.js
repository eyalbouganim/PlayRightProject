const express = require('express');
const audioController = require('../controllers/audioController');

const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        activeSessions: audioController.getActiveSessionCount(),
        timestamp: new Date().toISOString()
    });
});

module.exports = router;