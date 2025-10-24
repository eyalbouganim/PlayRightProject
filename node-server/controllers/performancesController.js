const path = require('path');
const fs = require('fs');
const performancesService = require('../services/performancesService');
const logger = require('../utils/logger');

/**
 * Handles the submission of a new performance recording for analysis.
 * Expects 'audioFile' in multipart/form-data and 'songId', 'musicXmlPath', 'tempo', 'timingTolerance' in the body.
 */
const analyzePerformance = async (req, res) => {
    logger.info('Received request to analyze performance');

    // 1. Check if file is present
    if (!req.file) {
        logger.warn('No audio file provided in the request');
        return res.status(400).json({ error: 'No audio file provided' });
    }

    // 2. Extract file path and parameters
    const audioFilePath = req.file.path;
    const { songId, musicXmlPath, tempo, timingTolerance } = req.body;

    logger.info('Audio file received:', audioFilePath, 'for song ID:', songId);
    if (musicXmlPath) {
        logger.info('MusicXML path provided:', musicXmlPath);
    }

    // 3. Basic Validation
    if (!songId) {
        logger.warn('No song ID provided in the request');
        // Clean up uploaded file
        fs.unlink(audioFilePath, (err) => {
            if (err) logger.error('Error deleting file after missing songId:', err);
        });
        return res.status(400).json({ error: 'No song ID provided' });
    }

    // 4. Validate MusicXML path if provided
    if (musicXmlPath && !fs.existsSync(musicXmlPath)) {
        logger.warn('MusicXML file not found:', musicXmlPath);
        fs.unlink(audioFilePath, (err) => {
            if (err) logger.error('Error deleting file after invalid musicXmlPath:', err);
        });
        return res.status(400).json({ error: 'MusicXML file not found' });
    }

    // 5. Call the service to analyze performance
    try {
        logger.info('Analyzing performance for song ID:', songId);
        
        const options = {};
        
        // Add MusicXML path if provided
        if (musicXmlPath) {
            options.musicXmlPath = musicXmlPath;
        }
        
        // Add tempo if provided (default: 120)
        if (tempo) {
            options.tempo = parseInt(tempo);
            logger.info('Using tempo:', options.tempo);
        }
        
        // Add timing tolerance if provided (default: 0.3)
        if (timingTolerance) {
            options.timingTolerance = parseFloat(timingTolerance);
            logger.info('Using timing tolerance:', options.timingTolerance);
        }

        const result = await performancesService.analyzePerformance(audioFilePath, songId, options);

        // 6. Send the result back to client
        logger.success(`Analysis complete. Result: ${JSON.stringify(result)}`);
        res.status(200).json(result);
    } catch (error) {
        logger.error('Error analyzing performance:', error);
        res.status(500).json({ error: 'Error analyzing performance', details: error.message });
    } 
}

module.exports = {
    analyzePerformance
};