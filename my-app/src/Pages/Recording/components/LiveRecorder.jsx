// src/Pages/Recording/components/LiveRecorder.jsx

import React from 'react';
import NoteDisplay from './NoteDisplay.jsx';
import './LiveRecorder.css';

// This is now a "presentational" component.
// It receives all its logic as props from the parent.
const LiveRecorder = ({
    isConnected,
    isRecording,
    status,
    notes,
    error,
    connect,
    startRecording,
    stopRecording,
    reset,
    disconnect,
    // Note: We are now receiving startRecording and stopRecording as props,
    // so we don't need the internal handleStart function anymore.
}) => {

    return (
        <div className="live-recorder">
            <div className="recorder-header">
                <h2>Controls</h2>
                <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                    {status}
                </div>
            </div>

            {error && <div className="error-message">⚠️ {error}</div>}

            <div className="controls">
                {/* Step 1: Show Connect button if not connected */}
                {!isConnected ? (
                    <button
                        className="btn btn-connect"
                        onClick={connect}
                        disabled={status.includes('Connecting')}
                    >
                        🔗 Connect to Server
                    </button>
                ) : !isRecording ? (
                    // Step 2: Once connected, show Start button
                    <button
                        className="btn btn-start"
                        onClick={startRecording} // Uses the function from props
                        disabled={!status.includes('Ready')}
                    >
                        🎤 Start Recording
                    </button>
                ) : (
                    // Step 3: Once recording, show Stop button
                    <button
                        className="btn btn-stop"
                        onClick={stopRecording} // Uses the function from props
                    >
                        🛑 Stop Recording
                    </button>
                )}

                <button
                    className="btn btn-reset"
                    onClick={reset} // Uses the function from props
                    disabled={!isConnected}
                >
                    🔄 Reset
                </button>
            </div>

            {/* This will now correctly display the notes from the parent */}
            <NoteDisplay notes={notes} />
        </div>
    );
};

export default LiveRecorder;