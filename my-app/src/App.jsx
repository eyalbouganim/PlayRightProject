import { useRef, useState } from 'react';
import './App.css';

function App() {
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const startRecording = async () => {
    try {
      setError(null);
      setResult(null);

      // Request mic
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Prefer opus/webm (most browsers). We'll convert on the server if needed.
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mr;

      const chunks = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });

        const form = new FormData();
        form.append('audio', blob, 'clip.webm');

        try {
          const resp = await fetch('/api/analyze', {
            method: 'POST',
            body: form,
          });
          if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
          const json = await resp.json();
          setResult(json);
        } catch (e) {
          setError(`Analysis failed: ${e.message}`);
        } finally {
          // release mic
          stream.getTracks().forEach((t) => t.stop());
        }
      };

      mr.start();
      setRecording(true);

      // Stop after 2 seconds (good for single notes)
      setTimeout(() => {
        if (mr.state === 'recording') {
          mr.stop();
          setRecording(false);
        }
      }, 2000);
    } catch (e) {
      setError(`Microphone access failed: ${e.message}`);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎵 Note Detector</h1>

        <div className="recording-section">
          <button
            onClick={startRecording}
            disabled={recording}
            className={`record-btn ${recording ? 'recording' : ''}`}
          >
            {recording ? '🔴 Recording... (2s)' : '🎤 Record Note'}
          </button>

          {recording && (
            <button onClick={stopRecording} className="stop-btn">
              ⏹️ Stop Early
            </button>
          )}
        </div>

        {error && (
          <div className="error">
            ❌ {error}
          </div>
        )}

        {result && (
          <div className="result">
            <h2>🎯 Detection Result</h2>
            {result.success ? (
              <div className="analysis">
                <p><strong>Note:</strong> {result.analysis?.note ?? 'Unknown'}</p>
                <p><strong>Frequency:</strong> {result.analysis?.frequency?.toFixed ? result.analysis.frequency.toFixed(1) : result.analysis?.frequency} Hz</p>
                <p><strong>Confidence:</strong> {result.analysis?.confidence?.toFixed ? result.analysis.confidence.toFixed(1) : result.analysis?.confidence}%</p>
                {typeof result.overallScore !== 'undefined' && (
                  <p><strong>Score:</strong> {result.overallScore}/100</p>
                )}
                {Array.isArray(result.feedback) && result.feedback.length > 0 && (
                  <div className="feedback">
                    <strong>Feedback:</strong>
                    <ul>
                      {result.feedback.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p>❌ {result.error}</p>
            )}
          </div>
        )}

        <div className="instructions">
          <p>🎶 Play a single note, then click “Record Note”.</p>
          <p>📱 Allow microphone access when prompted.</p>
        </div>
      </header>
    </div>
  );
}

export default App;