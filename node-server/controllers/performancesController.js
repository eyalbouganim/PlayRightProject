const path = require('path');
const fs = require('fs');
const performancesService = require('../services/performancesService');
const logger = require('../utils/logger');
const Song = require('../models/songModel'); // Import the Song model

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
    const { songId, tempo, timingTolerance } = req.body;

    logger.info('Audio file received:', audioFilePath, 'for song ID:', songId);

    // 3. Basic Validation
    if (!songId) {
        logger.warn('No song ID provided in the request');
        fs.unlink(audioFilePath, (err) => {
            if (err) logger.error('Error deleting file after missing songId:', err);
        });
        return res.status(400).json({ error: 'No song ID provided' });
    }

    let tempMusicXmlPath = null; // To hold the path of the temporary file

    try {
        logger.info('Analyzing performance for song ID:', songId);
        
        const options = {};

        if (songId !== 'default') {
            const song = await Song.findByPk(songId);
            if (!song || !song.musicXml) {
                throw new Error(`Song with ID ${songId} not found or has no MusicXML content.`);
            }
            
            // Create a temporary MusicXML file
            const tempDir = path.join(__dirname, '..', 'uploads', 'musicxml');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            tempMusicXmlPath = path.join(tempDir, `${songId}-${Date.now()}.musicxml`);
            fs.writeFileSync(tempMusicXmlPath, song.musicXml);
            
            options.musicXmlPath = tempMusicXmlPath;
            logger.info(`Created temporary MusicXML file for analysis: ${tempMusicXmlPath}`);
        } else {
            logger.info('Using default song for comparison.');
        }
        
        // Add tempo if provided (default: 120)
        if (tempo) {
            options.tempo = parseInt(tempo, 10);
            logger.info('Using tempo:', options.tempo);
        }

        // Add timing tolerance if provided (default: 0.3)
        if (timingTolerance) {
            options.timingTolerance = parseFloat(timingTolerance, 10);
            logger.info('Using timing tolerance:', options.timingTolerance);
        }

        // The service now receives the songId (for 'default' case) and options with the temp path
        const result = await performancesService.analyzePerformance(audioFilePath, songId, options);

        // 6. Send the result back to client
        logger.success(`Analysis complete. Result: ${JSON.stringify(result)}`);
        res.status(200).json(result);
    } catch (error) {
        logger.error('Error analyzing performance:', error);
        res.status(500).json({ error: 'Error analyzing performance', details: error.message });
    } finally {
        // Clean up the temporary MusicXML file if it was created
        if (tempMusicXmlPath) {
            fs.unlink(tempMusicXmlPath, (err) => {
                if (err) logger.error(`Error deleting temporary MusicXML file ${tempMusicXmlPath}:`, err);
                else logger.info(`Deleted temporary MusicXML file: ${tempMusicXmlPath}`);
            });
        }
    }
}

module.exports = {
    analyzePerformance
};