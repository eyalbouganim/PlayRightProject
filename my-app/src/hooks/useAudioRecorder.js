import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = () => {
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null); // Keep track of the stream to stop it
    const [audioBlob, setAudioBlob] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState(null);

    const startFullRecording = useCallback(async () => {
        setError(null);
        setAudioBlob(null); // Clear previous blob
        audioChunksRef.current = []; // Clear previous chunks

        try {
            console.log('🎤 (Recorder Hook) Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1,
                    sampleRate: 22050, // Match your analysis sample rate
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            streamRef.current = stream; // Store the stream
            console.log('✅ (Recorder Hook) Microphone access granted');

            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                     console.log('📦 (Recorder Hook) Audio chunk received:', event.data.size, 'bytes');
                }
            };

            recorder.onstop = () => {
                console.log('🎵 (Recorder Hook) MediaRecorder stopped, creating blob...');
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                console.log('✅ (Recorder Hook) Audio blob created:', blob.size, 'bytes');
                setAudioBlob(blob); // Make the final blob available
                setIsRecording(false);
                // Stop the tracks after the blob is created
                if (streamRef.current) {
                     streamRef.current.getTracks().forEach(track => track.stop());
                     streamRef.current = null;
                     console.log('🎤 (Recorder Hook) Microphone stream stopped.');
                }
            };
            
             recorder.onerror = (event) => {
                 console.error('❌ (Recorder Hook) MediaRecorder Error:', event.error);
                 setError(`MediaRecorder error: ${event.error.name}`);
                 setIsRecording(false);
                 // Also stop tracks on error
                 if (streamRef.current) {
                     streamRef.current.getTracks().forEach(track => track.stop());
                     streamRef.current = null;
                 }
             };

            recorder.start();
            setIsRecording(true);
            console.log('🎤 (Recorder Hook) MediaRecorder started');

        } catch (err) {
            console.error('❌ (Recorder Hook) Failed to start recording:', err);
            setError(`Failed to get microphone: ${err.message}`);
            setIsRecording(false);
        }
    }, []); // useCallback ensures this function has a stable identity

    const stopFullRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log('🛑 (Recorder Hook) Stopping MediaRecorder...');
            mediaRecorderRef.current.stop(); // This triggers the onstop handler
            // Stream tracks are stopped in the onstop handler itself
        } else {
             console.warn('(Recorder Hook) Stop called but not recording.');
             // Ensure tracks are stopped if something went wrong
             if (streamRef.current) {
                 streamRef.current.getTracks().forEach(track => track.stop());
                 streamRef.current = null;
             }
             setIsRecording(false); // Ensure state is consistent
        }
    }, []);

    return { 
        isFullRecording: isRecording, 
        audioBlob, 
        recorderError: error, // Expose potential errors
        startFullRecording, 
        stopFullRecording 
    };
};