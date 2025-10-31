import React, { useState, useEffect } from 'react';
import { useAudioStream } from '../../hooks/useAudioStream';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import LiveRecorder from './components/LiveRecorder';
import SheetMusicDisplay from './components/SheetMusicDisplay';
import { parseMusicXMLToNotes } from '../../utils/musicXMLParser';
import './recording.css';

// Default Twinkle Twinkle Little Star MusicXML
const defaultMusicXML = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
    <part-list>
        <score-part id="P1">
            <part-name>Twinkle Twinkle Little Star</part-name>
        </score-part>
    </part-list>
    <part id="P1">
        <measure number="1">
            <attributes>
                <divisions>1</divisions>
                <key><fifths>0</fifths></key>
                <time><beats>4</beats><beat-type>4</beat-type></time>
                <clef><sign>G</sign><line>2</line></clef>
            </attributes>
            <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
            <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
            <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
            <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
        </measure>
        <measure number="2">
            <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
            <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
            <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note>
        </measure>
        <measure number="3">
            <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
            <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
            <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
            <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
        </measure>
        <measure number="4">
            <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
            <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
            <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note>
            <barline location="right"><bar-style>light-heavy</bar-style></barline>
        </measure>
    </part>
</score-partwise>`;

const Recording = () => {
    const streamHook = useAudioStream();
    const recorderHook = useAudioRecorder();
    const { notes: detectedNotes, isRecording } = streamHook;

    // State
    const [musicXML, setMusicXML] = useState(defaultMusicXML);
    const [uploadedMusicXmlPath, setUploadedMusicXmlPath] = useState(null);
    const [uploadedFileName, setUploadedFileName] = useState(null);
    const [songToPlay, setSongToPlay] = useState([]);
    const [currentTargetNoteIndex, setCurrentTargetNoteIndex] = useState(0);
    const [noteStatuses, setNoteStatuses] = useState([]);
    const [processedNotesCount, setProcessedNotesCount] = useState(0);
    const [isScoring, setIsScoring] = useState(false);
    const [playbackUrl, setPlaybackUrl] = useState(null);
    const [tempo, setTempo] = useState(120); // Default tempo
    const [timingTolerance, setTimingTolerance] = useState(0.3); // Default tolerance

    // Parse MusicXML whenever it changes
    useEffect(() => {
        try {
            const notes = parseMusicXMLToNotes(musicXML);
            console.log('Parsed notes from MusicXML:', notes);
            setSongToPlay(notes);
            setNoteStatuses(new Array(notes.length).fill('pending'));
            setCurrentTargetNoteIndex(0);
            setProcessedNotesCount(0);
        } catch (error) {
            console.error('Error parsing MusicXML:', error);
            alert('Error loading sheet music. Please check the file format.');
        }
    }, [musicXML]);

    // Handle file upload - Upload to server and display
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // First, upload the MusicXML file to the server
            const formData = new FormData();
            formData.append('musicXmlFile', file);

            // Get the token from localStorage
            const token = localStorage.getItem('token');
            if (!token) {
                alert('You are not logged in. Please log in to upload files.');
                throw new Error('Authentication token not found');
            }

            // Add the Authorization header to the request
            const headers = {
                'Authorization': `Bearer ${token}`
            };

            const uploadResponse = await fetch('http://localhost:3001/api/performances/upload-musicxml', {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload MusicXML file');
            }

            const uploadResult = await uploadResponse.json();
            console.log('MusicXML uploaded:', uploadResult);

            // Store the server file path
            setUploadedMusicXmlPath(uploadResult.filePath);
            setUploadedFileName(uploadResult.fileName);

            // Read the file content for display
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                setMusicXML(content);
            };
            reader.readAsText(file);

            alert(`MusicXML file "${uploadResult.fileName}" uploaded successfully!`);
        } catch (error) {
            console.error('Error uploading MusicXML:', error);
            alert('Failed to upload MusicXML file. Please try again.');
        }
    };

    // Live comparison logic
    useEffect(() => {
        if (!isRecording || detectedNotes.length <= processedNotesCount || currentTargetNoteIndex >= songToPlay.length) {
            return;
        }

        const nextNoteToProcess = detectedNotes[processedNotesCount];
        const targetNote = songToPlay[currentTargetNoteIndex];

        if (nextNoteToProcess.note === targetNote.name) {
            const newStatuses = [...noteStatuses];
            newStatuses[currentTargetNoteIndex] = 'correct';
            setNoteStatuses(newStatuses);
            setCurrentTargetNoteIndex(prevIndex => prevIndex + 1);
        } else {
            const newStatuses = [...noteStatuses];
            newStatuses[currentTargetNoteIndex] = 'incorrect';
            setNoteStatuses(newStatuses);
        }
        setProcessedNotesCount(prevCount => prevCount + 1);
    }, [detectedNotes, isRecording, currentTargetNoteIndex, processedNotesCount, noteStatuses, songToPlay]);

    // Scoring Logic - Updated to include MusicXML path
    const submitForScoring = (audioBlob) => {
        console.log('Submitting audio for scoring...', audioBlob);
        setIsScoring(true);
        const formData = new FormData();
        formData.append('audioFile', audioBlob, 'performance.webm');
        formData.append('songId', 'twinkle_twinkle');

        // Add MusicXML path if available
        if (uploadedMusicXmlPath) {
            formData.append('musicXmlPath', uploadedMusicXmlPath);
            console.log('Sending MusicXML path:', uploadedMusicXmlPath);
        }

        // Add tempo and timing tolerance
        formData.append('tempo', tempo.toString());
        formData.append('timingTolerance', timingTolerance.toString());

        // Get the token from localStorage for the analysis request
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication error. Please log in again.');
            setIsScoring(false);
            return;
        }

        const headers = {
            'Authorization': `Bearer ${token}`
        };

        fetch('http://localhost:3001/api/performances/analyze', { 
            method: 'POST', 
            body: formData,
            headers: headers
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Analysis result received in React:', data);
                setIsScoring(false);

                if (data && data.playedNotes) {
                    console.log("Played Notes:", data.playedNotes);
                    
                    // Display comparison results if available
                    if (data.comparison) {
                        const { pitch_accuracy, timing_accuracy, overall_score, details } = data.comparison;
                        
                        // Create detailed feedback message
                        let feedbackMessage = `🎵 Performance Analysis 🎵\n\n`;
                        feedbackMessage += `Pitch Accuracy: ${pitch_accuracy}%\n`;
                        feedbackMessage += `Timing Accuracy: ${timing_accuracy}%\n`;
                        feedbackMessage += `Overall Score: ${overall_score}%\n\n`;
                        
                        // Add summary
                        feedbackMessage += `Total Notes: ${data.comparison.total_expected}\n`;
                        feedbackMessage += `Correct Notes: ${data.comparison.correct_notes}\n`;
                        feedbackMessage += `On-Time Notes: ${data.comparison.on_time_notes}\n`;
                        
                        alert(feedbackMessage);
                        
                        // Log detailed results
                        console.log('Detailed comparison:', details);
                    } else {
                        alert('Performance recorded successfully! (No comparison data available)');
                    }
                } else if (data && data.error) {
                    alert(`Analysis Error: ${data.error}`);
                    console.error("Analysis Error:", data.error);
                } else {
                    alert('Received unexpected data format from server.');
                    console.error('Unexpected data:', data);
                }
            })
            .catch(err => {
                console.error('Error submitting score:', err);
                setIsScoring(false);
                alert(`Error submitting score: ${err.message}`);
            });
    };

    // Playback and Submission Logic
    useEffect(() => {
        if (recorderHook.audioBlob) {
            const url = URL.createObjectURL(recorderHook.audioBlob);
            setPlaybackUrl(url);
            submitForScoring(recorderHook.audioBlob);
        }
        return () => {
            if (playbackUrl) {
                URL.revokeObjectURL(playbackUrl);
            }
        };
    }, [recorderHook.audioBlob]);

    // Control Functions
    const handleStart = async () => {
        setPlaybackUrl(null);
        setCurrentTargetNoteIndex(0);
        setNoteStatuses(new Array(songToPlay.length).fill('pending'));
        setProcessedNotesCount(0);

        await streamHook.startRecording();
        recorderHook.startFullRecording();
    };

    const handleStop = () => {
        streamHook.stopRecording();
        recorderHook.stopFullRecording();
    };

    const handleReset = () => {
        streamHook.reset();
        recorderHook.stopFullRecording();
        setCurrentTargetNoteIndex(0);
        setNoteStatuses(new Array(songToPlay.length).fill('pending'));
        setProcessedNotesCount(0);
        setIsScoring(false);
        setPlaybackUrl(null);
    };

    return (
        <div className="recording-page">
            {/* File Upload */}
            <div className="upload-section">
                <label htmlFor="musicxml-upload" className="upload-label">
                    📁 Upload MusicXML file (or use default Twinkle Twinkle):
                    <input
                        id="musicxml-upload"
                        type="file"
                        accept=".xml,.musicxml"
                        onChange={handleFileUpload}
                        className="file-input"
                    />
                </label>
                {uploadedFileName && (
                    <div className="upload-success">
                        ✓ Uploaded: {uploadedFileName}
                    </div>
                )}
            </div>

            {/* Tempo and Tolerance Settings */}
            <div className="settings-section">
                <div className="setting-item">
                    <label htmlFor="tempo-input">Tempo (BPM):</label>
                    <input
                        id="tempo-input"
                        type="number"
                        min="40"
                        max="240"
                        value={tempo}
                        onChange={(e) => setTempo(parseInt(e.target.value))}
                        className="setting-input"
                    />
                </div>
                <div className="setting-item">
                    <label htmlFor="tolerance-input">Timing Tolerance (seconds):</label>
                    <input
                        id="tolerance-input"
                        type="number"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={timingTolerance}
                        onChange={(e) => setTimingTolerance(parseFloat(e.target.value))}
                        className="setting-input"
                    />
                </div>
            </div>

            <SheetMusicDisplay
                musicXML={musicXML}
                currentTargetNoteIndex={currentTargetNoteIndex}
                noteStatuses={noteStatuses}
            />

            <LiveRecorder
                isConnected={streamHook.isConnected}
                isRecording={streamHook.isRecording}
                status={streamHook.status}
                notes={detectedNotes}
                error={streamHook.error || recorderHook.recorderError}
                connect={streamHook.connect}
                startRecording={handleStart}
                stopRecording={handleStop}
                reset={handleReset}
                disconnect={streamHook.disconnect}
            />

            {currentTargetNoteIndex >= songToPlay.length && !isRecording && songToPlay.length > 0 && (
                <div className="completion-message"><h2>🎉 Well Done! 🎉</h2></div>
            )}

            {playbackUrl && (
                <div className="playback-container">
                    <h4>Listen to your performance:</h4>
                    <audio src={playbackUrl} controls />
                    {isScoring && <p>Calculating your score...</p>}
                </div>
            )}
        </div>
    );
};

export default Recording;