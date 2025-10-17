// src/Pages/Recording/components/TargetNotes.jsx

import React from 'react';
import './TargetNotes.css';

const TargetNotes = ({ song, currentTargetNoteIndex, noteStatuses }) => {
    // If no song is provided, render nothing to avoid errors.
    if (!song) return null;

    const statuses = noteStatuses || new Array(song.length).fill('pending');

    return (
        <div className="target-notes-container">
            <h3>Twinkle, Twinkle, Little Star</h3>
            <div className="sheet-music">
                {song.map((note, index) => (
                    <div
                        key={index}
                        className={`note-box ${statuses[index]} ${index === currentTargetNoteIndex ? 'highlighted' : ''}`}
                    >
                        {note.name}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TargetNotes;