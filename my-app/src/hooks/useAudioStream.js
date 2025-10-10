// src/hooks/useAudioStream.js
import { useState, useEffect, useCallback } from 'react';
import audioStreamService from '../services/audioStreamService';

export const useAudioStream = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('Disconnected');
    const [notes, setNotes] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Set up callbacks
        audioStreamService.onStatus((message) => {
            setStatus(message);
            if (message.includes('Ready')) {
                setIsConnected(true);
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
    }, []);

    const connect = useCallback(async () => {
        try {
            setError(null);
            setStatus('Connecting...');
            await audioStreamService.connect();
        } catch (err) {
            setError('Failed to connect to server');
            setIsConnected(false);
        }
    }, []);

    const startRecording = useCallback(async () => {
        const success = await audioStreamService.startRecording();
        if (success) {
            setIsRecording(true);
            setError(null);
        }
    }, []);

    const stopRecording = useCallback(() => {
        audioStreamService.stopRecording();
        setIsRecording(false);
    }, []);

    const reset = useCallback(() => {
        audioStreamService.reset();
        setNotes([]);
        setError(null);
    }, []);

    const disconnect = useCallback(() => {
        audioStreamService.disconnect();
        setIsConnected(false);
        setIsRecording(false);
        setStatus('Disconnected');
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
        disconnect
    };
};