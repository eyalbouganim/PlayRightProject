import React from 'react';
import './TargetNotes.css';

// This is the array of notes for our test song.
// Each object contains the note's name for display and comparison.
const twinkleTwinkle = [
    { name: 'C4' }, { name: 'C4' }, { name: 'G4' }, { name: 'G4' },
    { name: 'A4' }, { name: 'A4' }, { name: 'G4' }, { name: 'F4' },
    { name: 'F4' }, { name: 'E4' }, { name: 'E4' }, { name: 'D4' },
    { name: 'D4' }, { name: 'C4' }
];

/**
 * A component to display the sheet music for a song.
 * @param {object} props
 * @param {number} props.currentTargetNoteIndex - The index of the note the user should play now.
 * @param {string[]} props.noteStatuses - An array of statuses ('pending', 'correct', 'incorrect') for each note.
 */
const TargetNotes = ({ currentTargetNoteIndex, noteStatuses }) => {
    // If no statuses are provided, create a default array of 'pending'.
    const statuses = noteStatuses || new Array(twinkleTwinkle.length).fill('pending');

    return (
        <div className="target-notes-container">
            <h3>Twinkle, Twinkle, Little Star</h3>
            <div className="sheet-music">
                {twinkleTwinkle.map((note, index) => (
                    <div
                        key={index}
                        className={`
                            note-box 
                            ${statuses[index]} 
                            ${index === currentTargetNoteIndex ? 'highlighted' : ''}
                        `}
                    >
                        {note.name}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TargetNotes;