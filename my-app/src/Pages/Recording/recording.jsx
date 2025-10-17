// src/Pages/Recording/Recording.jsx

import React, { useState, useEffect } from 'react';
import { useAudioStream } from '../../hooks/useAudioStream';
import LiveRecorder from './components/LiveRecorder';
import TargetNotes from './components/TargetNotes';
import './recording.css';

const songToPlay = [
    { name: 'C4' }, { name: 'C4' }, { name: 'G4' }, { name: 'G4' }
];

const Recording = () => {
    const audioStream = useAudioStream();
    const { notes: detectedNotes, isRecording } = audioStream;

    const [currentTargetNoteIndex, setCurrentTargetNoteIndex] = useState(0);
    const [noteStatuses, setNoteStatuses] = useState(new Array(songToPlay.length).fill('pending'));

    // Add a state to count how many notes we've already processed.
    const [processedNotesCount, setProcessedNotesCount] = useState(0);

    // The comparison logic is now more robust.
    useEffect(() => {
        // Only run if there's a new, unprocessed note.
        if (!isRecording || detectedNotes.length <= processedNotesCount || currentTargetNoteIndex >= songToPlay.length) {
            return;
        }

        // Get the next unprocessed note, not just the last one.
        const nextNoteToProcess = detectedNotes[processedNotesCount];
        const targetNote = songToPlay[currentTargetNoteIndex];

        // Compare the new note to the target note.
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

        // "Consume" the note by incrementing the counter.
        setProcessedNotesCount(prevCount => prevCount + 1);

    }, [detectedNotes, isRecording, currentTargetNoteIndex, processedNotesCount]);
    
    // The reset function must also reset our new counter.
    const handleReset = () => {
        audioStream.reset();
        setCurrentTargetNoteIndex(0);
        setNoteStatuses(new Array(songToPlay.length).fill('pending'));
        setProcessedNotesCount(0); // Reset the processed notes counter.
    };

    return (
        <div className="recording-page">
            <TargetNotes
                song={songToPlay}
                noteStatuses={noteStatuses}
                currentTargetNoteIndex={currentTargetNoteIndex}
            />
            
            <LiveRecorder 
                {...audioStream} 
                reset={handleReset} 
                notes={detectedNotes}
            />
            
            {currentTargetNoteIndex >= songToPlay.length && (
                <div className="completion-message">
                    <h2>🎉 Well Done! 🎉</h2>
                </div>
            )}
        </div>
    );
};

export default Recording;