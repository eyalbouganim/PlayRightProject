// src/hooks/useAudioStream.js
import { useState, useEffect, useCallback } from 'react';
// ## THE FIX: Import the singleton instance directly ##
import audioStreamService from '../services/audioStreamService'; 
// REMOVED: const audioStreamService = new AudioStreamService(); (This was wrong)

export const useAudioStream = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('Disconnected');
    const [notes, setNotes] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Set up callbacks using the imported singleton instance
        audioStreamService.onStatus((message) => {
            setStatus(message);
            if (message.includes('Connected') || message.includes('Ready')) {
                setIsConnected(true);
            } else if (message.includes('Disconnected')) {
                setIsConnected(false);
                setIsRecording(false);
            }
        });

        audioStreamService.onNotes((newNotes) => {
            setNotes(prev => [...prev, ...newNotes]);
        });

        audioStreamService.onError((errorMessage) => {
            setError(errorMessage);
        });

        // Cleanup on unmount
        return () => {
            audioStreamService.disconnect();
        };
    }, []); // Empty dependency array ensures this runs only once

    const connect = useCallback(async () => {
        // Ensure not already connected or connecting
        if (isConnected || status.includes('Connecting')) return; 
        try {
            setError(null);
            setStatus('Connecting...');
            await audioStreamService.connect();
            // Status update will set isConnected via the callback
        } catch (err) {
            setError('Failed to connect to server');
            setIsConnected(false);
            setStatus('Connection Failed');
        }
    }, [isConnected, status]); // Added dependencies

    const startRecording = useCallback(async () => {
        if (!isConnected || isRecording) { // Prevent starting if not connected or already recording
             setError(isRecording ? 'Already recording.' : 'Not connected to server.');
            return;
        }
        setError(null);
        const success = await audioStreamService.startRecording();
        if (success) {
            setIsRecording(true);
        } else {
             setError('Failed to start recording (Mic access denied?)');
        }
    }, [isConnected, isRecording]); // Added dependencies

    const stopRecording = useCallback(() => {
        // Only stop if actually recording
        if (!isRecording) return; 
        audioStreamService.stopRecording();
        setIsRecording(false);
    }, [isRecording]); // Added dependency

    const reset = useCallback(() => {
        // Reset server state and local notes/error
        audioStreamService.reset();
        setNotes([]);
        setError(null);
    }, []);

    const disconnect = useCallback(() => {
        audioStreamService.disconnect();
        // State updates handled by onStatus callback
    }, []);

    return {
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
        // Expose the raw stream object from the singleton service instance
        stream: audioStreamService.stream
    };
};