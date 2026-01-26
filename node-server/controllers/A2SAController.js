const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const Song = require('../models/songModel');
const Performance = require('../models/performanceModel');

// Helper to convert MusicXML to MIDI using music21
const convertXmlToMidi = (xmlPath, midiPath, pythonExe) => {
    let tempScriptPath = null;
    try {
        const scriptContent = `
import music21
import sys
import os

try:
    # 1. Load the Score
    print(f"Loading score: {r'${xmlPath}'}")
    s = music21.converter.parse(r'${xmlPath}')
    
    # 2. DELETE HARMONY (Chord Symbols)
    try:
        for element in s.recurse().getElementsByClass('Harmony'):
            element.activeSite.remove(element)
    except: pass

    # 3. DELETE REPEATS (D.C. al Fine, Dal Segno, Fine)
    try:
        for element in s.recurse().getElementsByClass(['DaCapo', 'Fine', 'DalSegno', 'RepeatExpression']):
            element.activeSite.remove(element)
            
        # Sanitize Barlines (Remove |: and :| logic)
        for m in s.recurse().getElementsByClass('Measure'):
            if m.leftBarline and isinstance(m.leftBarline, music21.bar.Repeat):
                m.leftBarline = None 
            if m.rightBarline and isinstance(m.rightBarline, music21.bar.Repeat):
                m.rightBarline = None
    except: pass

    # 4. Extract piano parts (right hand + left hand, max 2 parts)
    if hasattr(s, 'parts') and len(s.parts) > 0:
        if len(s.parts) == 1:
            # Single part - use it directly (contains both hands)
            s = s.parts[0]
        elif len(s.parts) >= 2:
            # Multiple parts - combine first two (right hand + left hand)
            combined = music21.stream.Score()
            combined.insert(0, s.parts[0])  # Right hand
            combined.insert(0, s.parts[1])  # Left hand
            s = combined

    # 5. Write to MIDI
    print(f"Writing MIDI to: {r'${midiPath}'}")
    s.write('midi', fp=r'${midiPath}')
    
except Exception as e:
    print(f"Conversion Error: {str(e)}")
    sys.exit(1)
`;
        
        tempScriptPath = path.join(path.dirname(xmlPath), `convert_worker_${Date.now()}.py`);
        fs.writeFileSync(tempScriptPath, scriptContent);

        execSync(`${pythonExe} "${tempScriptPath}"`);

        if (!fs.existsSync(midiPath)) {
            throw new Error("MIDI file was not created by music21");
        }

        const scrubCmd = `${pythonExe} -c "import pretty_midi; pm = pretty_midi.PrettyMIDI('${midiPath}'); pm.write('${midiPath}')"`;
        execSync(scrubCmd);

        return true;
    } catch (e) {
        logger.error("A2SA: MIDI Conversion/Scrubbing Failed", e.message);
        if (e.stdout) logger.error("Stdout:", e.stdout.toString());
        if (e.stderr) logger.error("Stderr:", e.stderr.toString());
        return false;
    } finally {
        if (tempScriptPath && fs.existsSync(tempScriptPath)) {
            fs.unlinkSync(tempScriptPath);
        }
    }
};

exports.align = async (req, res) => {
    // 1. Validation
    if (!req.files || !req.files.audio) {
        logger.warn('A2SA: No audio file provided');
        return res.status(400).json({ error: "Missing audio file" });
    }

    const audioPath = path.resolve(req.files.audio[0].path);
    const { songId } = req.body;

    if (!songId) {
        return res.status(400).json({ error: "Missing songId" });
    }

    let tempXmlPath = null;
    let tempMidiPath = null;

    try {
        const song = await Song.findByPk(songId);
        if (!song) throw new Error(`Song ${songId} not found`);

        const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const timestamp = Date.now();
        tempXmlPath = path.join(tempDir, `score-${songId}-${timestamp}.musicxml`);
        tempMidiPath = path.join(tempDir, `score-${songId}-${timestamp}.mid`);

        fs.writeFileSync(tempXmlPath, song.musicXml);
        
        const pythonExe = path.resolve(__dirname, '../../brain-server/venv/bin/python3');
        const conversionSuccess = convertXmlToMidi(tempXmlPath, tempMidiPath, pythonExe);
        
        if (!conversionSuccess) {
            throw new Error("Failed to convert Song MusicXML to MIDI.");
        }

        const scriptPath = path.resolve(__dirname, '../../brain-server/A2SA/python/align_eife.py');
        const pythonProcess = spawn(pythonExe, [scriptPath, audioPath, tempMidiPath]);

        let resultBuffer = '';
        let errorBuffer = '';

        pythonProcess.stdout.on('data', (data) => { resultBuffer += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorBuffer += data.toString(); });

        pythonProcess.on('close', async (code) => {
            if (fs.existsSync(tempXmlPath)) fs.unlinkSync(tempXmlPath);
            if (fs.existsSync(tempMidiPath)) fs.unlinkSync(tempMidiPath);
            
            if (code !== 0) {
                logger.error(`A2SA: Python process crashed with code ${code}`);
                return res.status(500).json({ error: "Alignment Engine Crashed", details: errorBuffer });
            }

            try {
                let jsonStartIndex = resultBuffer.indexOf('[');
                let jsonEndIndex = resultBuffer.lastIndexOf(']') + 1;
                
                if (jsonStartIndex === -1) {
                    jsonStartIndex = resultBuffer.indexOf('{');
                    jsonEndIndex = resultBuffer.lastIndexOf('}') + 1;
                }

                if (jsonStartIndex === -1 || jsonEndIndex <= jsonStartIndex) {
                    throw new Error("No valid JSON response from Alignment Engine");
                }
                
                const parsedData = JSON.parse(resultBuffer.substring(jsonStartIndex, jsonEndIndex));

                if (parsedData.error) {
                    throw new Error(`Alignment Script Error: ${parsedData.error}`);
                }
                
                const alignmentData = parsedData;

                // ============================================================
                // [UPDATED] STRICT-BUT-FAIR GRADING
                // ============================================================
                
                const playedNotes = alignmentData.filter(n => n.is_played);
                let avgDuration = 0.5; 

                if (playedNotes.length > 0) {
                    const totalDur = playedNotes.reduce((sum, n) => sum + (n.end - n.start), 0);
                    avgDuration = totalDur / playedNotes.length;
                }

                // 🎯 STRICTER TIMING SETTINGS (for serious practice)
                // Perfect: 40-80ms (tighter than casual, achievable for intermediate students)
                // OK: 80-180ms (gives feedback without frustration)
                // Bad: >180ms (pushes students to improve)
                const THRESHOLD_PERFECT = Math.min(0.08, Math.max(0.04, avgDuration * 0.15));
                const THRESHOLD_OK = Math.min(0.18, Math.max(0.08, avgDuration * 0.35));

                logger.info(`🎯 Grading: AvgDur=${avgDuration.toFixed(2)}s | Strict Perfect<${THRESHOLD_PERFECT.toFixed(3)}s`);

                let totalTimingScore = 0;
                let hitNotesCount = 0;

                alignmentData.forEach(n => {
                    n.quality = "missed";
                    n.timing_score = 0;
                    n.timing_status = null; // New Field: "early", "late", or null

                    if (n.is_played) {
                        hitNotesCount++;
                        
                        // Capture Raw Deviation (Signed) and Absolute Deviation (Magnitude)
                        const rawDev = n.timing_deviation; 
                        const dev = Math.abs(rawDev);
                        
                        // Determine Early/Late for ALL played notes (useful for debugging/UI)
                        // negative = early, positive = late
                        const status = rawDev < 0 ? "early" : "late";

                        if (dev <= THRESHOLD_PERFECT) {
                            n.quality = "perfect"; 
                            n.timing_score = 100;
                            // Perfect notes don't usually need a warning label, 
                            // but you can set n.timing_status = status if you want strict feedback.
                        } else if (dev <= THRESHOLD_OK) {
                            n.quality = "ok"; 
                            n.timing_status = status; // "early" or "late"
                            
                            const relativeError = (dev - THRESHOLD_PERFECT) / (THRESHOLD_OK - THRESHOLD_PERFECT);
                            n.timing_score = Math.max(0, Math.round(100 * (1 - relativeError)));
                        } else {
                            n.quality = "bad"; 
                            n.timing_status = status; // "early" or "late"
                            n.timing_score = 0;
                        }

                        totalTimingScore += n.timing_score;
                    }
                });

                const totalNotes = alignmentData.length;
                const pitchScore = totalNotes > 0 ? Math.round((hitNotesCount / totalNotes) * 100) : 0;
                const timingScore = hitNotesCount > 0 ? Math.round(totalTimingScore / hitNotesCount) : 0;
                
                const finalGrade = Math.round((pitchScore * 0.7) + (timingScore * 0.3));

                const performance = await Performance.create({
                    user_id: req.user.id,
                    song_id: parseInt(songId, 10),
                    overall_score: finalGrade,
                    pitch_accuracy: pitchScore,
                    timing_accuracy: timingScore,
                    detected_notes: alignmentData, 
                    audio_file_path: audioPath
                });

                logger.success(`A2SA: Analysis complete. Score: ${finalGrade}`);
                
                res.json({
                    status: "success",
                    performanceId: performance.id,
                    grade: finalGrade,
                    breakdown: { pitch: pitchScore, timing: timingScore },
                    alignment: alignmentData
                });

            } catch (e) {
                logger.error("A2SA: Processing Error", e.message);
                if (!res.headersSent) res.status(500).json({ error: e.message });
            }
        });
    } catch (error) {
        logger.error("A2SA: Controller Error", error);
        if (tempXmlPath && fs.existsSync(tempXmlPath)) fs.unlinkSync(tempXmlPath);
        if (tempMidiPath && fs.existsSync(tempMidiPath)) fs.unlinkSync(tempMidiPath);
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
};