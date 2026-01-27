const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const Song = require('../models/songModel');
const Performance = require('../models/performanceModel');

// Brain server URL for cloud deployment (optional)
const BRAIN_URL = process.env.BRAIN_URL;

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

        const pythonPath = pythonExe || process.env.PYTHON_PATH || 'python3';
        execSync(`${pythonPath} "${tempScriptPath}"`);

        if (!fs.existsSync(midiPath)) {
            throw new Error("MIDI file was not created by music21");
        }

        const scrubCmd = `${pythonPath} -c "import pretty_midi; pm = pretty_midi.PrettyMIDI('${midiPath}'); pm.write('${midiPath}')"`;
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

// Call remote brain-server for alignment (cloud mode)
const callBrainServer = async (audioPath, midiPath) => {
    const FormData = require('form-data');
    const fetch = require('node-fetch');

    const formData = new FormData();
    formData.append('audio', fs.createReadStream(audioPath));
    formData.append('score', fs.createReadStream(midiPath));

    const response = await fetch(`${BRAIN_URL}/align`, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Brain server alignment failed');
    }

    return await response.json();
};

// Run local Python alignment (local mode)
const runLocalAlignment = (audioPath, midiPath, pythonExe) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.resolve(__dirname, '../../brain-server/A2SA/python/align_eife.py');
        const pythonProcess = spawn(pythonExe, [scriptPath, audioPath, midiPath]);

        let resultBuffer = '';
        let errorBuffer = '';

        pythonProcess.stdout.on('data', (data) => { resultBuffer += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorBuffer += data.toString(); });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python process crashed with code ${code}: ${errorBuffer}`));
                return;
            }

            try {
                let jsonStartIndex = resultBuffer.indexOf('[');
                let jsonEndIndex = resultBuffer.lastIndexOf(']') + 1;

                if (jsonStartIndex === -1) {
                    jsonStartIndex = resultBuffer.indexOf('{');
                    jsonEndIndex = resultBuffer.lastIndexOf('}') + 1;
                }

                if (jsonStartIndex === -1 || jsonEndIndex <= jsonStartIndex) {
                    reject(new Error("No valid JSON response from Alignment Engine"));
                    return;
                }

                const parsedData = JSON.parse(resultBuffer.substring(jsonStartIndex, jsonEndIndex));

                if (parsedData.error) {
                    reject(new Error(`Alignment Script Error: ${parsedData.error}`));
                    return;
                }

                resolve(parsedData);
            } catch (e) {
                reject(e);
            }
        });
    });
};

// Process alignment results and calculate scores
const processAlignmentResults = (alignmentData) => {
    const playedNotes = alignmentData.filter(n => n.is_played);
    let avgDuration = 0.5;

    if (playedNotes.length > 0) {
        const totalDur = playedNotes.reduce((sum, n) => sum + (n.end - n.start), 0);
        avgDuration = totalDur / playedNotes.length;
    }

    const THRESHOLD_PERFECT = Math.min(0.08, Math.max(0.04, avgDuration * 0.15));
    const THRESHOLD_OK = Math.min(0.18, Math.max(0.08, avgDuration * 0.35));

    logger.info(`Grading: AvgDur=${avgDuration.toFixed(2)}s | Strict Perfect<${THRESHOLD_PERFECT.toFixed(3)}s`);

    let totalTimingScore = 0;
    let hitNotesCount = 0;

    alignmentData.forEach(n => {
        n.quality = "missed";
        n.timing_score = 0;
        n.timing_status = null;

        if (n.is_played) {
            hitNotesCount++;

            const rawDev = n.timing_deviation;
            const dev = Math.abs(rawDev);
            const status = rawDev < 0 ? "early" : "late";

            if (dev <= THRESHOLD_PERFECT) {
                n.quality = "perfect";
                n.timing_score = 100;
            } else if (dev <= THRESHOLD_OK) {
                n.quality = "ok";
                n.timing_status = status;
                const relativeError = (dev - THRESHOLD_PERFECT) / (THRESHOLD_OK - THRESHOLD_PERFECT);
                n.timing_score = Math.max(0, Math.round(100 * (1 - relativeError)));
            } else {
                n.quality = "bad";
                n.timing_status = status;
                n.timing_score = 0;
            }

            totalTimingScore += n.timing_score;
        }
    });

    const totalNotes = alignmentData.length;
    const pitchScore = totalNotes > 0 ? Math.round((hitNotesCount / totalNotes) * 100) : 0;
    const timingScore = hitNotesCount > 0 ? Math.round(totalTimingScore / hitNotesCount) : 0;
    const finalGrade = Math.round((pitchScore * 0.7) + (timingScore * 0.3));

    return { pitchScore, timingScore, finalGrade, alignmentData };
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

        // Python executable path
        const pythonExe = process.env.PYTHON_PATH ||
            path.resolve(__dirname, '../../brain-server/venv/bin/python3');

        const conversionSuccess = convertXmlToMidi(tempXmlPath, tempMidiPath, pythonExe);

        if (!conversionSuccess) {
            throw new Error("Failed to convert Song MusicXML to MIDI.");
        }

        let alignmentData;

        // Choose between cloud mode (brain-server HTTP) or local mode (spawn Python)
        if (BRAIN_URL) {
            logger.info(`A2SA: Using remote brain-server at ${BRAIN_URL}`);
            alignmentData = await callBrainServer(audioPath, tempMidiPath);
        } else {
            logger.info('A2SA: Using local Python alignment');
            alignmentData = await runLocalAlignment(audioPath, tempMidiPath, pythonExe);
        }

        // Cleanup temp files
        if (fs.existsSync(tempXmlPath)) fs.unlinkSync(tempXmlPath);
        if (fs.existsSync(tempMidiPath)) fs.unlinkSync(tempMidiPath);

        // Process results and calculate scores
        const { pitchScore, timingScore, finalGrade, alignmentData: processedData } =
            processAlignmentResults(alignmentData);

        // Save performance to database
        const performance = await Performance.create({
            user_id: req.user.id,
            song_id: parseInt(songId, 10),
            overall_score: finalGrade,
            pitch_accuracy: pitchScore,
            timing_accuracy: timingScore,
            detected_notes: processedData,
            audio_file_path: audioPath
        });

        logger.success(`A2SA: Analysis complete. Score: ${finalGrade}`);

        res.json({
            status: "success",
            performanceId: performance.id,
            grade: finalGrade,
            breakdown: { pitch: pitchScore, timing: timingScore },
            alignment: processedData
        });

    } catch (error) {
        logger.error("A2SA: Controller Error", error);
        if (tempXmlPath && fs.existsSync(tempXmlPath)) fs.unlinkSync(tempXmlPath);
        if (tempMidiPath && fs.existsSync(tempMidiPath)) fs.unlinkSync(tempMidiPath);
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
};
