// src/Pages/Recording/recording.jsx
import React from 'react';
import LiveRecorder from './components/LiveRecorder';
import './recording.css';

const Recording = () => {
    return (
        <div className="recording-page">
            <LiveRecorder />
        </div>
    );
};

export default Recording;