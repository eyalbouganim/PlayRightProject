import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = () => {
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);
    const [audioBlob, setAudioBlob] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState(null);

    const startFullRecording = useCallback(async () => {
        setError(null);
        setAudioBlob(null);
        audioChunksRef.current = [];

        try {
            // Ask for permission and wait for stream
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    channelCount: 1, 
                    sampleRate: 44100, // Better compatibility than 22050
                    echoCancellation: false, // Music mode settings
                    noiseSuppression: false,
                    autoGainControl: false 
                } 
            });
            streamRef.current = stream;

            // Use the stream's native mimeType if possible, fallback to webm
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                ? 'audio/webm;codecs=opus' 
                : 'audio/webm';

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.start(); 
            setIsRecording(true);
            console.log('🎤 Recorder Started');

        } catch (err) {
            console.error('❌ Recorder Error:', err);
            setError(err.message);
        }
    }, []);

    // [CRITICAL CHANGE] Returns a Promise that resolves with the Blob
    const stopFullRecording = useCallback(() => {
        return new Promise((resolve) => {
            const recorder = mediaRecorderRef.current;
            
            if (!recorder || recorder.state !== 'recording') {
                resolve(null);
                return;
            }

            // We define the logic to run ONCE the recorder effectively stops
            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setIsRecording(false);
                
                // Cleanup Microphone Stream
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
                
                console.log('✅ Recorder Stopped. Blob Size:', blob.size);
                resolve(blob); // Resolve the promise with the data
            };

            recorder.stop();
        });
    }, []);

    return { 
        isFullRecording: isRecording, 
        audioBlob, 
        recorderError: error, 
        startFullRecording, 
        stopFullRecording 
    };
};