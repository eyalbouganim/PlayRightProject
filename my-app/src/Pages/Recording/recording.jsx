// src/Pages/Recording/recording.jsx
import LiveRecorder from './components/LiveRecorder';
import TargetNotes from './components/TargetNotes';
import './recording.css';

const Recording = () => {
    return (
        <div className="recording-page">
            <LiveRecorder />
            <TargetNotes />
        </div>
    );
};

export default Recording;