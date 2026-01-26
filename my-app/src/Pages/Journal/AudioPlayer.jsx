import React, { useState, useEffect, useRef } from 'react';
import { Box, IconButton, Typography, Slider } from '@mui/material';
import {
    PlayArrow as PlayIcon,
    Pause as PauseIcon,
    MusicNote as MusicNoteIcon
} from '@mui/icons-material';
import { formatDuration } from './journalUtils';

const AudioPlayer = ({ audioFilePath }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    // Build the URL - audio files are served from /uploads/audio/
    // Handle absolute paths by extracting the part starting from 'uploads/'
    const relativePath = audioFilePath && audioFilePath.includes('uploads/')
        ? audioFilePath.substring(audioFilePath.indexOf('uploads/'))
        : audioFilePath;
    const audioUrl = relativePath ? `http://localhost:3001/${relativePath}` : null;

    useEffect(() => {
        if (!isLoaded) return;
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => setDuration(audio.duration);
        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [isLoaded]);

    const togglePlay = () => {
        if (!isLoaded) {
            setIsLoaded(true);
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.play().catch(console.error);
                    setIsPlaying(true);
                }
            }, 100);
            return;
        }
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(console.error);
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (_, newValue) => {
        if (audioRef.current) {
            audioRef.current.currentTime = newValue;
            setCurrentTime(newValue);
        }
    };

    if (!audioUrl) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2, p: 1.5, mt: 2 }}>
                <MusicNoteIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 16 }} />
                <Typography variant="caption" color="text.disabled">No recording</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(66, 165, 245, 0.05) 100%)',
            borderRadius: 2,
            p: 1.5,
            mt: 2,
            border: '1px solid rgba(25, 118, 210, 0.1)'
        }}>
            {isLoaded && <audio ref={audioRef} src={audioUrl} preload="metadata" />}
            <IconButton
                onClick={togglePlay}
                size="small"
                sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, width: 36, height: 36 }}
            >
                {isPlaying ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
            </IconButton>
            <Box sx={{ flexGrow: 1, mx: 2 }}>
                <Slider
                    value={currentTime}
                    max={duration || 100}
                    onChange={handleSeek}
                    size="small"
                    disabled={!isLoaded}
                    sx={{ color: 'primary.main', '& .MuiSlider-thumb': { width: 12, height: 12 } }}
                />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', minWidth: 70 }}>
                {formatDuration(currentTime)} / {formatDuration(duration)}
            </Typography>
        </Box>
    );
};

export default AudioPlayer;