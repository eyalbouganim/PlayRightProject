const express = require('express');
const audioController = require('../controllers/audioController');

const router = express.Router();

// Update score
router.post('/', (req, res) => {
    const { newScore } = req.body;
    audioController.updateScore(newScore);
    res.json({ message: 'Score updated successfully' });
});

module.exports = router;
