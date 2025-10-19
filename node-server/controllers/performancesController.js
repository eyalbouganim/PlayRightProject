const path = require('path');
const fs = require('fs'); // Import Node.js file system module for potential cleanup
const performancesService = require('../services/performancesService'); // Assuming your service file is named this
const logger = require('../utils/logger'); // Assuming you have a logger utility

/**
 * Handles the submission of a new performance recording for analysis.
 * Expects 'audioFile' in multipart/form-data and 'songId' in the body.
 */
const analyzePerformance = async (req, res) => {
    logger.info('Received request to analyze performance');

    // 1. Check if file is present
    if (!req.file) {
        logger.warn('No audio file provided in the request');
        return res.status(400).json({ error: 'No audio file provided' });
    }

    // 2. Extract file path and song ID
    const audioFilePath = req.file.path;
    const { songId } = req.body;

    logger.info('Audio file received: ', audioFilePath, 'for song ID: ', songId);

    // 3. Basic Validation
    if (!songId) {
        logger.warn('No song ID provided in the request');
        // Clean up uploaded file
        fs.unlink(audioFilePath, (err) => {
            if (err) logger.error('Error deleting file after missing songId:', err);
        });
        return res.status(400).json({ error: 'No song ID provided' });
    }

    // 4. Call the service to analyze performance
    try {
        logger.info('Analyzing performance for song ID:', songId);
        const result = await performancesService.analyzePerformance(audioFilePath, songId);

        // 5. send the result back to client
        logger.success(`Analysis complete. Result: ${JSON.stringify(result)}`);
        res.status(200).json(result);
    } catch (error) {
        logger.error('Error analyzing performance:', error);
        res.status(500).json({ error: 'Error analyzing performance' });
    } finally {
        // 6. Important - clean up the uploaded file after processing
        fs.unlink(audioFilePath, (err) => {
            if (err) logger.error('Error deleting uploaded audio file:', err);
            else logger.success('Uploaded audio file deleted successfully');
        })
    }


}

module.exports = {
    analyzePerformance
};