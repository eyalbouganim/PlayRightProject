// src/Pages/Recording/components/LiveRecorder.jsx

import React from 'react';
import NoteDisplay from './NoteDisplay.jsx'; // ## NEW: Re-import NoteDisplay ##
import './LiveRecorder.css';

const LiveRecorder = ({
    isConnected, isRecording, status, error, notes, // ## NEW: Accept "notes" as a prop ##
    connect, startRecording, stopRecording, reset, disconnect
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
                {!isConnected ? (
                    <button 
                        className="btn btn-connect" 
                        onClick={connect} 
                        disabled={status.includes('Connecting')}
                    >
                        🔗 Connect to Server
                    </button>
                ) : !isRecording ? (
                    <button 
                        className="btn btn-start" 
                        onClick={startRecording}
                        disabled={!status.includes('Ready')}
                    >
                        🎤 Start Recording
                    </button>
                ) : (
                    <button 
                        className="btn btn-stop" 
                        onClick={stopRecording}
                    >
                        🛑 Stop Recording
                    </button>
                )}

                <button 
                    className="btn btn-reset" 
                    onClick={reset} 
                    disabled={!isConnected}
                >
                    🔄 Reset
                </button>
            </div>

            {/* ## NEW: Add the NoteDisplay component back in ## */}
            <NoteDisplay notes={notes} />
        </div>
    );
};

export default LiveRecorder;