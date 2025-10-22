import React, { useState, useEffect } from 'react';
import { useAudioStream } from '../../hooks/useAudioStream';
import { useAudioRecorder } from '../../hooks/useAudioRecorder'; // Your recorder hook
import LiveRecorder from './components/LiveRecorder';
// import TargetNotes from './components/TargetNotes';
import SheetMusicDisplay from './components/SheetMusicDisplay';
import './recording.css';

const songToPlay = [
    { name: 'C4' }, { name: 'C4' }, { name: 'G4' }, { name: 'G4' },
    { name: 'A4' }, { name: 'A4' }, { name: 'G4' }, { name: 'F4' },
    { name: 'F4' }, { name: 'E4' }, { name: 'E4' }, { name: 'D4' },
    { name: 'D4' }, { name: 'C4' }
];

const Recording = () => {
    // Hook 1: For live streaming notes
    const streamHook = useAudioStream();
    
    // Hook 2: For recording the full file. It now manages its own stream.
    const recorderHook = useAudioRecorder(); 

    const { notes: detectedNotes, isRecording } = streamHook;

    // Game state (unchanged)
    const [currentTargetNoteIndex, setCurrentTargetNoteIndex] = useState(0);
    const [noteStatuses, setNoteStatuses] = useState(new Array(songToPlay.length).fill('pending'));
    const [processedNotesCount, setProcessedNotesCount] = useState(0);
    const [isScoring, setIsScoring] = useState(false);
    const [playbackUrl, setPlaybackUrl] = useState(null);

    // Live comparison logic (unchanged)
    useEffect(() => {
        if (!isRecording || detectedNotes.length <= processedNotesCount || currentTargetNoteIndex >= songToPlay.length) {
            return;
        }
        // ... (comparison logic is the same) ...
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
    }, [detectedNotes, isRecording, currentTargetNoteIndex, processedNotesCount, noteStatuses]);

    // Scoring Logic (unchanged)
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
                // Convert the playedNotes array to a nicely formatted JSON string for the alert
                const notesString = JSON.stringify(data.playedNotes, null, 2); // null, 2 adds indentation
                alert(`Analysis complete!\nDetected Notes:\n${notesString}`);
                console.log("Played Notes:", data.playedNotes);
            } else if (data && data.error) {
                 alert(`Analysis Error: ${data.error}`);
                 console.error("Analysis Error:", data.error);
            }
             else {
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
    
    // Playback and Submission Logic (unchanged)
    useEffect(() => {
        if (recorderHook.audioBlob) {
            const url = URL.createObjectURL(recorderHook.audioBlob);
            setPlaybackUrl(url);
            submitForScoring(recorderHook.audioBlob);
        }
        // Cleanup function
        return () => {
            if (playbackUrl) {
                URL.revokeObjectURL(playbackUrl);
            }
        };
    }, [recorderHook.audioBlob]); // Dependency array is correct

    // --- Wrapped Control Functions ---
    // These now simply call the respective hook functions
    const handleStart = async () => {
        setPlaybackUrl(null); 
        setCurrentTargetNoteIndex(0);
        setNoteStatuses(new Array(songToPlay.length).fill('pending'));
        setProcessedNotesCount(0);
        
        await streamHook.startRecording();  // Start live feedback stream
        recorderHook.startFullRecording(); // Start full recording
    };

    const handleStop = () => {
        streamHook.stopRecording();      // Stop live feedback stream
        recorderHook.stopFullRecording(); // Stop full recording (will trigger blob creation)
    };

    const handleReset = () => {
        streamHook.reset();
        recorderHook.stopFullRecording(); // Ensure recorder stops if it was running
        setCurrentTargetNoteIndex(0);
        setNoteStatuses(new Array(songToPlay.length).fill('pending'));
        setProcessedNotesCount(0);
        setIsScoring(false);
        setPlaybackUrl(null);
    };

    // --- Render ---
    return (
        <div className="recording-page">
            {/* <TargetNotes
                song={songToPlay}
                noteStatuses={noteStatuses}
                currentTargetNoteIndex={currentTargetNoteIndex}
            /> */}

            <SheetMusicDisplay
                currentTargetNoteIndex={currentTargetNoteIndex}
                noteStatuses={noteStatuses}
            />
            
            {/* Pass only the necessary props from streamHook, plus the wrapped functions */}
            <LiveRecorder 
                isConnected={streamHook.isConnected}
                isRecording={streamHook.isRecording} // Controls the button display
                status={streamHook.status}
                notes={detectedNotes}
                error={streamHook.error || recorderHook.recorderError} // Show errors from either hook
                connect={streamHook.connect}
                startRecording={handleStart} // Pass the wrapped start
                stopRecording={handleStop}   // Pass the wrapped stop
                reset={handleReset} 
                disconnect={streamHook.disconnect} 
            />
            
            {/* Completion Message (unchanged) */}
            {currentTargetNoteIndex >= songToPlay.length && !isRecording && (
                 <div className="completion-message"><h2>🎉 Well Done! 🎉</h2></div>
            )}

            {/* Playback Container (unchanged) */}
            {playbackUrl && (
                 <div className="playback-container" style={{marginTop: '20px'}}>
                     <h4>Listen to your performance:</h4>
                     <audio src={playbackUrl} controls />
                     {isScoring && <p>Calculating your score...</p>}
                     <button /* ... download logic ... */>💾 Download Recording</button>
                 </div>
            )}
        </div>
    );
};

export default Recording;