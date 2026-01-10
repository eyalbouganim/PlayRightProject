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

    # 3. NUKE REPEATS (The Fix for "Cannot Expand Stream")
    # We must remove both the Text Expressions (D.C.) AND the Barline Triggers
    
    # A. Remove explicit Repeat Expressions (D.C., Fine, Segno)
    try:
        # music21.repeat.RepeatExpression covers DaCapo, Fine, DalSegno, etc.
        for element in s.recurse().getElementsByClass('RepeatExpression'):
            element.activeSite.remove(element)
    except: pass

    # B. Sanitize Barlines (Remove |: and :| logic)
    # This forces music21 to treat the file as linear (Measure 1 -> 2 -> 3...)
    # ignoring any leftover repeat instructions that cause the crash.
    try:
        for m in s.recurse().getElementsByClass('Measure'):
            # Remove repeat signs from Left Barline
            if m.leftBarline is not None:
                # If it's a repeat barline, destroy it or downgrade it to 'regular'
                if isinstance(m.leftBarline, music21.bar.Repeat):
                    m.leftBarline = None 
            
            # Remove repeat signs from Right Barline
            if m.rightBarline is not None:
                if isinstance(m.rightBarline, music21.bar.Repeat):
                    m.rightBarline = None
    except Exception as e:
        print(f"Warning sanitizing barlines: {e}")

    # 4. Extract the Piano Part (Both Hands)
    if hasattr(s, 'parts') and len(s.parts) > 0:
        s = s.parts[0]

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

        // STEP 2: Scrub MIDI using pretty_midi
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

    // Temp file paths
    let tempXmlPath = null;
    let tempMidiPath = null;

    try {
        // 2. Retrieve Song Data
        const song = await Song.findByPk(songId);
        if (!song) {
            throw new Error(`Song ${songId} not found`);
        }

        const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        // Define paths
        const timestamp = Date.now();
        tempXmlPath = path.join(tempDir, `score-${songId}-${timestamp}.musicxml`);
        tempMidiPath = path.join(tempDir, `score-${songId}-${timestamp}.mid`);

        // 3. Write MusicXML and Convert to MIDI
        // We assume song.musicXml contains the XML string
        fs.writeFileSync(tempXmlPath, song.musicXml);
        
        const pythonExe = path.resolve(__dirname, '../../brain-server/venv/bin/python3');
        
        logger.info(`🧠 A2SA: Converting MusicXML to MIDI for Song ${songId}...`);
        const conversionSuccess = convertXmlToMidi(tempXmlPath, tempMidiPath, pythonExe);
        
        if (!conversionSuccess) {
            throw new Error("Failed to convert Song MusicXML to MIDI. A2SA requires valid MIDI input.");
        }

        // ============================================================
        // [DEBUG SAVE] ENABLED
        // ============================================================
        const debugDir = path.join(__dirname, '..', 'uploads', 'debug');
        if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });

        // Save MIDI with a clear name so you can inspect it
        const debugMidiPath = path.join(debugDir, `DEBUG_score_${songId}_generated.mid`);
        fs.copyFileSync(tempMidiPath, debugMidiPath);
        
        // Save Audio too (to compare in your DAW)
        const debugAudioPath = path.join(debugDir, `DEBUG_perf_${songId}_uploaded.wav`);
        fs.copyFileSync(audioPath, debugAudioPath);

        logger.info(`💾 DEBUG: Saved generated MIDI to: ${debugMidiPath}`);
        logger.info(`💾 DEBUG: Saved uploaded Audio to: ${debugAudioPath}`);
        // ============================================================

        // 4. Spawn Alignment Process
        const scriptPath = path.resolve(__dirname, '../../brain-server/A2SA/python/align_eife.py');
        logger.info(`🧠 A2SA: Spawning brain-server for user ${req.user.id}`);

        const pythonProcess = spawn(pythonExe, [scriptPath, audioPath, tempMidiPath]);

        let resultBuffer = '';
        let errorBuffer = '';

        pythonProcess.stdout.on('data', (data) => { resultBuffer += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorBuffer += data.toString(); });

        pythonProcess.on('close', async (code) => {
            // Cleanup temp files (You can comment these out if you want to keep them too)
            if (fs.existsSync(tempXmlPath)) fs.unlinkSync(tempXmlPath);
            if (fs.existsSync(tempMidiPath)) fs.unlinkSync(tempMidiPath);
            
            // Handle Crash
            if (code !== 0) {
                logger.error(`A2SA: Python process crashed with code ${code}`);
                logger.error(`A2SA Stderr: ${errorBuffer}`);
                // Try to find JSON in stdout even if it crashed (sometimes errors are printed there)
                try {
                    const parsed = JSON.parse(resultBuffer);
                    if (parsed.error) {
                        return res.status(500).json({ error: parsed.error, tool: parsed.tool, code: parsed.code });
                    }
                } catch(e) {}
                
                return res.status(500).json({ error: "Alignment Engine Crashed", details: errorBuffer });
            }

            try {
                // 5. Robust JSON Parsing
                let jsonStartIndex = resultBuffer.indexOf('[');
                let jsonEndIndex = resultBuffer.lastIndexOf(']') + 1;
                
                // If no array, check for object (Error response)
                if (jsonStartIndex === -1) {
                    jsonStartIndex = resultBuffer.indexOf('{');
                    jsonEndIndex = resultBuffer.lastIndexOf('}') + 1;
                }

                if (jsonStartIndex === -1 || jsonEndIndex <= jsonStartIndex) {
                    logger.error("A2SA: No JSON found. Raw Output:", resultBuffer);
                    throw new Error("No valid JSON response from Alignment Engine");
                }
                
                const jsonString = resultBuffer.substring(jsonStartIndex, jsonEndIndex);
                const parsedData = JSON.parse(jsonString);

                // [UPDATED] Check for errors returned by Python script
                if (parsedData.error) {
                    const toolInfo = parsedData.tool ? ` (Tool: ${parsedData.tool}, Code: ${parsedData.code})` : '';
                    throw new Error(`Alignment Script Error: ${parsedData.error}${toolInfo}`);
                }
                
                const alignmentData = parsedData;

                // 6. Grading Logic
                const totalNotes = alignmentData.length;
                const hitNotes = alignmentData.filter(n => n.is_played).length;
                const pitchScore = totalNotes > 0 ? Math.round((hitNotes / totalNotes) * 100) : 0;

                let totalTiming = 0;
                let playedCount = 0;
                alignmentData.forEach(n => {
                    if (n.is_played) {
                        const dev = Math.abs(n.timing_deviation);
                        let score = 100;
                        if (dev > 0.3) score = 0;
                        else if (dev > 0.05) score = 100 - ((dev - 0.05) / 0.25 * 100);
                        totalTiming += score;
                        playedCount++;
                    }
                });
                const timingScore = playedCount > 0 ? Math.round(totalTiming / playedCount) : 0;
                const finalGrade = Math.round((pitchScore * 0.7) + (timingScore * 0.3));

                // 7. Save Performance
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