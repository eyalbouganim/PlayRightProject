// src/Pages/Recording/components/NoteDisplay.jsx
import './NoteDisplay.css';

const NoteDisplay = ({ notes }) => {
    // Get last 10 notes for display
    const recentNotes = notes.slice(-10).reverse();

    return (
        <div className="note-display">
            <h3>Detected Notes</h3>
            <div className="note-count">
                Total: {notes.length} notes
            </div>
            <div className="note-list">
                {recentNotes.length === 0 ? (
                    <p className="no-notes">No notes detected yet...</p>
                ) : (
                    recentNotes.map((note, index) => (
                        <div key={index} className="note-item">
                            <span className="note-name">{note.note}</span>
                            <span className="note-time">
                                {note.start_time.toFixed(2)}s
                            </span>
                            <span className="note-duration">
                                {note.duration.toFixed(2)}s
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NoteDisplay;