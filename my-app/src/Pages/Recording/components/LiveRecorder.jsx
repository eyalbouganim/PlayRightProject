// src/Pages/Recording/components/LiveRecorder.jsx
import React from 'react';
import { useAudioStream } from '../../../hooks/useAudioStream';
import NoteDisplay from './NoteDisplay.jsx';
import './LiveRecorder.css';

const LiveRecorder = () => {
    const {
        isConnected,
        isRecording,
        status,
        notes,
        error,
        connect,
        startRecording,
        stopRecording,
        reset,
        disconnect
    } = useAudioStream();

    const handleStart = async () => {
        if (!isConnected) {
            await connect();
        }
        await startRecording();
    };

    return (
        <div className="live-recorder">
            <div className="recorder-header">
                <h2>Live Piano Note Detection</h2>
                <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                    {status}
                </div>
            </div>

            {error && (
                <div className="error-message">
                    ⚠️ {error}
                </div>
            )}

            <div className="controls">
                {!isRecording ? (
                    <button 
                        className="btn btn-start" 
                        onClick={handleStart}
                        disabled={isRecording}
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

                {isConnected && (
                    <button 
                        className="btn btn-disconnect" 
                        onClick={disconnect}
                    >
                        ❌ Disconnect
                    </button>
                )}
            </div>

            <NoteDisplay notes={notes} />
        </div>
    );
};

export default LiveRecorder;