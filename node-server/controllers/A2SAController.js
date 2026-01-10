// node-server/controllers/A2SAController.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const Song = require('../models/songModel');
const Performance = require('../models/performanceModel');

/**
 * Handles the A2SA offline alignment and grading process.
 * Integrates with existing Song and Performance models.
 */
exports.align = async (req, res) => {
    // 1. Validation using existing logger pattern
    if (!req.files || !req.files.audio) {
        logger.warn('A2SA: No audio file provided');
        return res.status(400).json({ error: "Missing audio file" });
    }

    const audioPath = path.resolve(req.files.audio[0].path);
    const { songId } = req.body;

    if (!songId) {
        logger.warn('A2SA: No songId provided');
        return res.status(400).json({ error: "Missing songId" });
    }

    let tempMidiPath = null;

    try {
        // 2. Retrieve Song Data (Matches performancesController pattern)
        const song = await Song.findByPk(songId);
        if (!song) {
            throw new Error(`Song ${songId} not found`);
        }

        // Create temporary MIDI/Score file for the Python script to read
        const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        
        // Assuming your song store includes MIDI content or we convert MusicXML
        tempMidiPath = path.join(tempDir, `score-${songId}-${Date.now()}.mid`);
        // Note: You may need a utility to convert MusicXML to MIDI if the script requires .mid
        fs.writeFileSync(tempMidiPath, song.musicXml); 

        // 3. Path Configuration
        const scriptPath = path.resolve(__dirname, '../../brain-server/A2SA/python/align_eife.py');
        const pythonExe = path.resolve(__dirname, '../../brain-server/venv/bin/python3');

        logger.info(`🧠 A2SA: Spawning brain-server for user ${req.user.id}`);

        // 4. Spawn Python Process
        const pythonProcess = spawn(pythonExe, [scriptPath, audioPath, tempMidiPath]);

        let resultBuffer = '';
        let errorBuffer = '';

        pythonProcess.stdout.on('data', (data) => { resultBuffer += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorBuffer += data.toString(); });

        pythonProcess.on('close', async (code) => {
            // Cleanup temp files immediately
            if (tempMidiPath && fs.existsSync(tempMidiPath)) fs.unlinkSync(tempMidiPath);
            
            if (code !== 0) {
                logger.error(`A2SA: Python process failed with code ${code}`, errorBuffer);
                return res.status(500).json({ error: "Alignment Engine Failed", details: errorBuffer });
            }

            try {
                // 5. Parse and Grade
                const start = resultBuffer.indexOf('[');
                const end = resultBuffer.lastIndexOf(']') + 1;
                const alignmentData = JSON.parse(resultBuffer.substring(start, end));

                // Grading Logic
                const totalNotes = alignmentData.length;
                const hitNotes = alignmentData.filter(n => n.is_played).length;
                const pitchScore = Math.round((hitNotes / totalNotes) * 100);

                // Timing Grade logic
                let totalTiming = 0;
                let playedCount = 0;
                alignmentData.forEach(n => {
                    if (n.is_played) {
                        const dev = n.timing_deviation;
                        let score = 100;
                        if (dev > 0.3) score = 0;
                        else if (dev > 0.05) score = 100 - ((dev - 0.05) / 0.25 * 100);
                        totalTiming += score;
                        playedCount++;
                    }
                });
                const timingScore = playedCount > 0 ? Math.round(totalTiming / playedCount) : 0;
                const finalGrade = Math.round((pitchScore * 0.7) + (timingScore * 0.3));

                // 6. Save Result (Matches savePerformanceResult pattern)
                const performance = await Performance.create({
                    user_id: req.user.id,
                    song_id: parseInt(songId, 10),
                    overall_score: finalGrade,
                    pitch_accuracy: pitchScore,
                    timing_accuracy: timingScore,
                    detected_notes: alignmentData, // Storing full alignment for frontend
                    audio_file_path: audioPath
                });

                logger.success(`A2SA: Analysis complete for song ${songId}. Score: ${finalGrade}`);
                
                res.json({
                    status: "success",
                    performanceId: performance.id,
                    grade: finalGrade,
                    breakdown: { pitch: pitchScore, timing: timingScore },
                    alignment: alignmentData
                });

            } catch (e) {
                logger.error("A2SA: Parse Error", e);
                res.status(500).json({ error: "Failed to parse analysis results" });
            }
        });
    } catch (error) {
        logger.error("A2SA: Controller Error", error);
        if (tempMidiPath && fs.existsSync(tempMidiPath)) fs.unlinkSync(tempMidiPath);
        res.status(500).json({ error: error.message });
    }
};