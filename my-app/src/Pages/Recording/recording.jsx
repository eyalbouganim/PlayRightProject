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
    const [songToPlay, setSongToPlay] = useState([]);
    const [currentTargetNoteIndex, setCurrentTargetNoteIndex] = useState(0);
    const [noteStatuses, setNoteStatuses] = useState([]);
    const [processedNotesCount, setProcessedNotesCount] = useState(0);
    const [isScoring, setIsScoring] = useState(false);
    const [playbackUrl, setPlaybackUrl] = useState(null);

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

    // Handle file upload
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            setMusicXML(e.target.result);
        };
        reader.readAsText(file);
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

    // Scoring Logic
    const submitForScoring = (audioBlob) => {
        console.log('Submitting audio for scoring...', audioBlob);
        setIsScoring(true);
        const formData = new FormData();
        formData.append('audioFile', audioBlob, 'performance.webm');
        formData.append('songId', 'twinkle_twinkle');

        fetch('http://localhost:3001/api/performances', { method: 'POST', body: formData })
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
                    const notesString = JSON.stringify(data.playedNotes, null, 2);
                    alert(`Analysis complete!\nDetected Notes:\n${notesString}`);
                    console.log("Played Notes:", data.playedNotes);
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
            <div className="upload-section" style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
                <label htmlFor="musicxml-upload" style={{ cursor: 'pointer' }}>
                    📁 Upload MusicXML file (or use default Twinkle Twinkle):
                    <input
                        id="musicxml-upload"
                        type="file"
                        accept=".xml,.musicxml"
                        onChange={handleFileUpload}
                        style={{ marginLeft: '10px' }}
                    />
                </label>
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
                <div className="playback-container" style={{ marginTop: '20px' }}>
                    <h4>Listen to your performance:</h4>
                    <audio src={playbackUrl} controls />
                    {isScoring && <p>Calculating your score...</p>}
                </div>
            )}
        </div>
    );
};

export default Recording;