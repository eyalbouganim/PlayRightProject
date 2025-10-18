// src/services/performancesService.js

const calculate = (correctNotes, playedNotes) => {
    let mistakes = 0;
    let correctHits = 0;
    
    // We'll compare up to the length of the original song
    for (let i = 0; i < correctNotes.length; i++) {
        const targetNote = correctNotes[i];
        const playedNote = playedNotes[i]; // Simple 1-to-1 comparison for now

        if (playedNote && playedNote.note === targetNote.name) {
            correctHits++;
        } else {
            // This counts both wrong notes and missed notes as a mistake
            mistakes++;
        }
    }

    // Calculate the final score as a percentage of correct notes
    const noteScore = (correctHits / correctNotes.length) * 100;

    // Return a structured result object
    return {
        noteScore: Math.round(noteScore),
        mistakes,
        notesAttempted: playedNotes.length,
        notesTotal: correctNotes.length
    };
};

// Export the function so the controller can use it
export default {
    calculate
};