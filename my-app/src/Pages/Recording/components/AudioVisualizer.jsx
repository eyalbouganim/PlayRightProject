import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

const AudioVisualizer = ({ stream, isRecording }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);

    useEffect(() => {
        if (!stream || !isRecording || !canvasRef.current) return;

        // 1. Setup Audio Context & Analyser
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 128; // Lower resolution for wider bars
            
            sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
            sourceRef.current.connect(analyserRef.current);
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // 2. Animation Loop
        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // Clear with slight fade for trail effect
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 1.5;

                // Gradient Color based on volume
                const r = barHeight + 25 * (i / bufferLength);
                const g = 250 * (i / bufferLength);
                const b = 50;

                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            // We don't close the context here to avoid killing the parent stream
        };
    }, [stream, isRecording]);

    return (
        <Box sx={{ 
            width: '100%', 
            height: '150px', 
            bgcolor: 'rgba(0,0,0,0.8)', 
            borderRadius: 3, 
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            {!isRecording ? (
                <Box sx={{ width: '100%', height: '2px', bgcolor: '#555' }} /> // Flat line when idle
            ) : (
                <canvas 
                    ref={canvasRef} 
                    width={1200} 
                    height={150} 
                    style={{ width: '100%', height: '100%' }} 
                />
            )}
        </Box>
    );
};

export default AudioVisualizer;
