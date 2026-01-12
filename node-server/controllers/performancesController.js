const path = require('path');
const fs = require('fs');
const performancesService = require('../services/performancesService');
const Performance = require('../models/performanceModel');
const logger = require('../utils/logger');
const { sequelize } = require('../models/performanceModel');
const Song = require('../models/songModel'); // Import the Song model
const aiFeedbackService = require('../services/aiFeedbackService');

/**
 * Prepares options for the performance analysis service.
 * If a songId is provided, it fetches the song and creates a temporary MusicXML file.
 * @param {string} songId - The ID of the song or 'default'.
 * @param {string|number} tempo - The tempo for the analysis.
 * @param {string|number} timingTolerance - The timing tolerance for the analysis.
 * @returns {Promise<{options: object, tempMusicXmlPath: string|null}>}
 */
const prepareAnalysisOptions = async (songId, tempo, timingTolerance) => {
    const options = {};
    let tempMusicXmlPath = null;

    if (songId !== 'default') {
        const song = await Song.findByPk(songId);
        if (!song || !song.musicXml) {
            throw new Error(`Song with ID ${songId} not found or has no MusicXML content.`);
        }

        // Create a temporary MusicXML file from the song's content
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

    if (tempo) options.tempo = parseInt(tempo, 10);
    if (timingTolerance) options.timingTolerance = parseFloat(timingTolerance, 10);

    return { options, tempMusicXmlPath };
};

/**
 * Asynchronously saves the performance analysis result to the database.
 * @param {object} result - The analysis result from the service.
 * @param {string} songId - The ID of the song.
 * @param {number} userId - The ID of the user.
 * @param {string} audioFilePath - The path to the user's audio file.
 */
const savePerformanceResult = async (result, songId, userId, audioFilePath) => {
    if (!result.comparison || songId === 'default') return;

    try {
        await Performance.create({
            user_id: userId,
            song_id: parseInt(songId, 10),
            overall_score: result.comparison.overall_score,
            pitch_accuracy: result.comparison.pitch_accuracy,
            timing_accuracy: result.comparison.timing_accuracy,
            detected_notes: result.detected_notes,
            analysis_details: result.comparison.details,
            audio_file_path: audioFilePath
        });
        logger.info(`Performance for song ID ${songId} saved successfully for user ID ${userId}.`);
    } catch (dbError) {
        logger.error('Failed to save performance to database:', dbError);
    }
};

/**
 * Handles the submission of a new performance recording for analysis.
 * Expects 'audioFile' in multipart/form-data and 'songId', 'musicXmlPath', 'tempo', 'timingTolerance' in the body.
 */
const analyzePerformance = async (req, res) => {
    logger.info('Received request to analyze performance');

    if (!req.file) {
        logger.warn('No audio file provided in the request');
        return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioFilePath = req.file.path;
    const { songId, tempo, timingTolerance } = req.body;

    if (!songId) {
        logger.warn('No song ID provided in the request');
        fs.unlink(audioFilePath, (err) => { if (err) logger.error('Error deleting orphaned audio file:', err); });
        return res.status(400).json({ error: 'No song ID provided' });
    }

    logger.info(`Processing audio file: ${audioFilePath} for song ID: ${songId}`);

    let tempMusicXmlPath = null;

    try {
        // 1. Prepare options and any temporary files needed for analysis
        const prepResult = await prepareAnalysisOptions(songId, tempo, timingTolerance);
        tempMusicXmlPath = prepResult.tempMusicXmlPath;

        // 2. Call the analysis service
        const result = await performancesService.analyzePerformance(audioFilePath, songId, prepResult.options);

        // 3. Send the result back to the client
        logger.success(`Analysis complete. Result: ${JSON.stringify(result)}`);
        res.status(200).json(result);

        // 4. Save the performance without blocking the response
        savePerformanceResult(result, songId, req.user.id, audioFilePath);
    } catch (error) {
        logger.error('Error analyzing performance:', error);
        res.status(500).json({ error: 'Error analyzing performance', details: error.message });
    } finally {
        // 5. Clean up the temporary MusicXML file
        if (tempMusicXmlPath) {
            fs.unlink(tempMusicXmlPath, (err) => {
                if (err) logger.error(`Error deleting temporary MusicXML file ${tempMusicXmlPath}:`, err);
                else logger.info(`Deleted temporary MusicXML file: ${tempMusicXmlPath}`);
            });
        }
    }
}

/**
 * Gets performance statistics for a specific song for the current user.
 * @route GET /api/performances/stats/song/:songId
 */
const getSongPerformanceStats = async (req, res) => {
    try {
        const { songId } = req.params;
        const userId = req.user.id;

        const stats = await Performance.findAll({
            where: {
                song_id: songId,
                user_id: userId
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'playCount'],
                [sequelize.fn('AVG', sequelize.col('overall_score')), 'averageScore'],
                [sequelize.fn('MAX', sequelize.col('overall_score')), 'bestScore'],
                [sequelize.fn('AVG', sequelize.col('pitch_accuracy')), 'averagePitchAccuracy'],
                [sequelize.fn('AVG', sequelize.col('timing_accuracy')), 'averageTimingAccuracy'],
            ],
            raw: true // Get a plain object instead of a model instance
        });

        // The result of aggregation is an array with one object.
        const result = stats[0];

        // Handle case where there are no performances for this song
        if (result.playCount === '0') {
            return res.status(200).json({
                playCount: 0,
                averageScore: 0,
                bestScore: 0,
                averagePitchAccuracy: 0,
                averageTimingAccuracy: 0,
            });
        }

        res.status(200).json(result);
    } catch (error) {
        logger.error(`Error fetching stats for song ${req.params.songId}:`, error);
        res.status(500).json({ message: 'Server error while fetching song statistics.' });
    }
};

/**
 * Gets the last 5 performances for the current user
 * @route GET /api/performances/stats/user
 */
const getUserRecentPerformances = async (req, res) => {
    try {
        const userId = req.user.id;

        const recentPerformances = await Performance.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']],
            attributes: [
                'id',
                ['overall_score', 'overallScore'],
                ['pitch_accuracy', 'pitchAccuracy'],
                ['timing_accuracy', 'timingAccuracy'],
                ['detected_notes', 'detectedNotes'],
                ['analysis_details', 'analysisDetails'],
                ['audio_file_path', 'audioFilePath'],
                'createdAt'
            ],
            include: [{
                model: Song,
                as: 'song',
                attributes: ['id', 'title'] // Include song title
            }]
        });

        res.status(200).json(recentPerformances);
    } catch (error) {
        logger.error(`Error fetching recent performances for user ${req.user.id}:`, error);
        res.status(500).json({ message: 'Server error while fetching recent performances.' });
    }
};

/*
* Generates AI feedback for a specific performance.
*/
const getPerformanceFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const performance = await Performance.findOne({
            where: { id: id, user_id: userId },
            include: [{
                model: Song,
                as: 'song',
                attributes: ['title']
            }]
        });

        if (!performance) {
            return res.status(404).json({ error: 'Performance not found' });
        }

        // ENHANCED CONTEXT: Analyze detected_notes for specific issues
        const detectedNotes = performance.detected_notes || [];

        // Count different types of notes
        const missedNotes = detectedNotes.filter(n => !n.is_played).length;
        const perfectNotes = detectedNotes.filter(n => n.quality === 'perfect').length;
        const okNotes = detectedNotes.filter(n => n.quality === 'ok').length;
        const badNotes = detectedNotes.filter(n => n.quality === 'bad').length;

        // Analyze timing issues
        const earlyNotes = detectedNotes.filter(n => n.timing_status === 'early').length;
        const lateNotes = detectedNotes.filter(n => n.timing_status === 'late').length;

        // Calculate percentages
        const totalNotes = detectedNotes.length;
        const missedPercentage = totalNotes > 0 ? Math.round((missedNotes / totalNotes) * 100) : 0;
        const perfectPercentage = totalNotes > 0 ? Math.round((perfectNotes / totalNotes) * 100) : 0;

        // Build detailed analysis string
        let detailedAnalysis = [];

        if (missedNotes > 0) {
            detailedAnalysis.push(`${missedNotes} note(s) were missed (${missedPercentage}% of total)`);
        }

        if (earlyNotes > 0 || lateNotes > 0) {
            const timingIssues = [];
            if (earlyNotes > 0) timingIssues.push(`${earlyNotes} played too early`);
            if (lateNotes > 0) timingIssues.push(`${lateNotes} played too late`);
            detailedAnalysis.push(`Timing issues: ${timingIssues.join(', ')}`);
        }

        if (perfectNotes > 0) {
            detailedAnalysis.push(`${perfectNotes} note(s) were played perfectly (${perfectPercentage}%)`);
        }

        if (badNotes > 0) {
            detailedAnalysis.push(`${badNotes} note(s) had significant timing problems`);
        }

        // IMPROVED CONTEXT with detailed note analysis
        const analysisContext = {
            songTitle: performance.song ? performance.song.title : "the song",
            score: performance.overall_score || 0,
            pitch: performance.pitch_accuracy || 0,
            timing: performance.timing_accuracy || 0,
            totalNotes: totalNotes,
            missedNotes: missedNotes,
            perfectNotes: perfectNotes,
            earlyNotes: earlyNotes,
            lateNotes: lateNotes,
            badTimingNotes: badNotes,
            // Include detailed breakdown for AI to understand specific issues
            detailedAnalysis: detailedAnalysis.join('. '),
            // Legacy details field
            details: performance.analysis_details ? performance.analysis_details : "General practice session"
        };

        const feedback = await aiFeedbackService.generatePerformanceFeedback(analysisContext);

        res.json({ feedback });

    } catch (error) {
        logger.error(`Feedback Controller Error: ${error.message}`);
        res.status(500).json({ error: 'Failed to generate feedback' });
    }
};

module.exports = {
    analyzePerformance,
    getSongPerformanceStats,
    getUserRecentPerformances,
    getPerformanceFeedback
};