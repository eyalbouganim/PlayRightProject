import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Box,
    Typography,
    Button,
    Paper,
    TextField,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    CircularProgress
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import MicIcon from '@mui/icons-material/Mic';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import { useAudioStream } from '../../hooks/useAudioStream';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import LiveRecorder from './components/LiveRecorder';
import SheetMusicDisplay from './components/SheetMusicDisplay';
import { defaultMusicXML } from '../../assets/defaultMusicXML';
import SongRetriever from './components/SongRetriever';
import { parseMusicXMLToNotes } from '../../utils/musicXMLParser';
import RecordingScore from './components/RecordingScore';

const Recording = () => {
    const navigate = useNavigate();
    const streamHook = useAudioStream();
    const recorderHook = useAudioRecorder();
    const { notes: detectedNotes, isRecording } = streamHook;

    // Get the auth token once for the entire component
    const token = localStorage.getItem('token');

    // EFFECT: Check for authentication token on component mount.
    // If no token is found, redirect the user to the login page.
    useEffect(() => {
        if (!token) {
            console.error("No authentication token found. Redirecting to login.");
            navigate('/login');
        }
    }, [token, navigate]);

    // State
    const [musicXML, setMusicXML] = useState(defaultMusicXML);
    const [uploadedFileName, setUploadedFileName] = useState(null);
    const [uploadedSongId, setUploadedSongId] = useState(null); // To store the ID of the uploaded song
    const [songToPlay, setSongToPlay] = useState([]);
    const [currentTargetNoteIndex, setCurrentTargetNoteIndex] = useState(0);
    const [noteStatuses, setNoteStatuses] = useState([]);
    const [processedNotesCount, setProcessedNotesCount] = useState(0);
    const [isScoring, setIsScoring] = useState(false);
    const [playbackUrl, setPlaybackUrl] = useState(null);
    const [tempo, setTempo] = useState(120); // Default tempo
    const [timingTolerance, setTimingTolerance] = useState(0.3); // Default tolerance
    const [isSongRetrieverOpen, setIsSongRetrieverOpen] = useState(false);
    const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
    const [performanceResults, setPerformanceResults] = useState(null);

    // Parse MusicXML whenever it changes
    useEffect(() => {
        try {
            const notes = parseMusicXMLToNotes(musicXML);
            console.log('Parsed notes from MusicXML:', notes);
            setSongToPlay(notes);
            setNoteStatuses(new Array(notes.length).fill('pending'));
            setCurrentTargetNoteIndex(0);
            setProcessedNotesCount(0);
        } catch (error) {
            console.error('Error parsing MusicXML:', error);
            alert('Error loading sheet music. Please check the file format.');
        }
    }, [musicXML]);

    // Handle file upload - Upload to server and display
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // Upload the MusicXML file to create a new song entry
            const formData = new FormData();
            formData.append('musicXmlFile', file);


            // Add the Authorization header to the request
            const headers = {
                'Authorization': `Bearer ${token}`
            };

            const uploadResponse = await fetch('http://localhost:3001/api/songs/upload', {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (!uploadResponse.ok) {
                // Handle auth error specifically
                if (uploadResponse.status === 401 || uploadResponse.status === 403) {
                    throw new Error('Not authorized, token failed');
                }
                throw new Error('Failed to upload and save song');
            }

            const uploadResult = await uploadResponse.json();
            console.log('Song uploaded and saved:', uploadResult);

            setUploadedSongId(uploadResult.song.id);
            setUploadedFileName(uploadResult.song.title);

            // Read the file content for display
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                setMusicXML(content);
            };
            reader.readAsText(file);

            alert(`Song "${uploadResult.song.title}" uploaded successfully!`);
        } catch (error) {
            console.error('Error uploading MusicXML:', error);
            alert('Failed to upload MusicXML file. Please try again.');
        }
    };

    // Handle song selection from the retriever
    const handleSongRetrieved = (song) => {
        if (song && song.musicXml) {
            console.log('Song retrieved:', song);
            setMusicXML(song.musicXml);
            setUploadedSongId(song.id);
            setUploadedFileName(song.title);
        } else {
            alert('Could not load the selected song. The file might be corrupted or missing.');
        }
    };

    // Live comparison logic
    useEffect(() => {
        if (!isRecording || detectedNotes.length <= processedNotesCount || currentTargetNoteIndex >= songToPlay.length) {
            return;
        }

        const nextNoteToProcess = detectedNotes[processedNotesCount];
        const targetNote = songToPlay[currentTargetNoteIndex];

        if (nextNoteToProcess.note === targetNote.name) {
            const newStatuses = [...noteStatuses];
            newStatuses[currentTargetNoteIndex] = 'correct';
            setNoteStatuses(newStatuses);
            setCurrentTargetNoteIndex(prevIndex => prevIndex + 1);
        } else {
            const newStatuses = [...noteStatuses];
            newStatuses[currentTargetNoteIndex] = 'incorrect';
            setNoteStatuses(newStatuses);
        }
        setProcessedNotesCount(prevCount => prevCount + 1);
    }, [detectedNotes, isRecording, currentTargetNoteIndex, processedNotesCount, noteStatuses, songToPlay]);

    // [UPDATED] Submission Logic
    const submitForScoring = async (audioBlob) => {
        console.log('🚀 Submitting to A2SA...');
        setIsScoring(true);

        const formData = new FormData();
        formData.append('audio', audioBlob, 'performance.wav');
        
        // Ensure songId is set
        if (!uploadedSongId) {
            alert("No song selected. Please upload or select a song first.");
            setIsScoring(false);
            return;
        }
        formData.append('songId', uploadedSongId);

        try {
            // Check your port! Ensure this matches your Node server port (3001 or 5000)
            const response = await fetch('http://localhost:3001/api/a2sa/align', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) throw new Error("Analysis failed");

            const data = await response.json();
            console.log("✅ A2SA Results:", data);

            if (data.status === 'success') {
                setPerformanceResults(data.alignment);
                setResultsDialogOpen(true);
            }
        } catch (err) {
            console.error(err);
            alert("Analysis Error: " + err.message);
        } finally {
            setIsScoring(false);
        }
    };

const handleStop = async () => {
        // Stop the visualizer (waveform)
        if (streamHook.stopRecording) streamHook.stopRecording();
        
        // Stop the real recorder and WAIT for the file
        // This 'blob' is guaranteed to be the complete audio file
        const blob = await recorderHook.stopFullRecording();
        
        if (blob && blob.size > 0) {
            // Create URL for playback
            const url = URL.createObjectURL(blob);
            setPlaybackUrl(url);
            
            // Send to Backend immediately
            submitForScoring(blob); 
        } else {
            console.error("Recording failed: Blob was empty");
        }
    };

    // Control Functions
    const handleStart = async () => {
        setPlaybackUrl(null);
        setCurrentTargetNoteIndex(0);
        setNoteStatuses(new Array(songToPlay.length).fill('pending'));
        setProcessedNotesCount(0);

        await streamHook.startRecording();
        recorderHook.startFullRecording();
    };

    const handleReset = () => {
        streamHook.reset();
        recorderHook.stopFullRecording();
        setCurrentTargetNoteIndex(0);
        setNoteStatuses(new Array(songToPlay.length).fill('pending'));
        setProcessedNotesCount(0);
        setIsScoring(false);
        setPlaybackUrl(null);
    };

    return (
        <Container maxWidth="xl" sx={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', py: 2 }}>
            {/* Top Bar: Compact Header & File Controls */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 3,
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    flexShrink: 0
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', md: 'flex-start' } }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: '-0.01em' }}>
                        Studio Session
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                        <Chip 
                            label={streamHook.status} 
                            color={streamHook.isConnected ? (streamHook.isRecording ? 'error' : 'success') : 'default'} 
                            size="small" 
                            variant="filled"
                        />
                        {uploadedFileName ? (
                            <Chip label={uploadedFileName} size="small" color="primary" variant="outlined" />
                        ) : (
                            <Typography variant="caption" color="text.secondary">Default: "Twinkle Twinkle Little Star"</Typography>
                        )}
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileIcon />}
                    size="small"
                    sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 600 }}
                >
                    Upload XML
                    <input
                        type="file"
                        hidden
                        accept=".xml,.musicxml"
                        onChange={handleFileUpload}
                    />
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<LibraryMusicIcon />}
                    onClick={() => setIsSongRetrieverOpen(true)}
                    size="small"
                    sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 600 }}
                >
                    My Songs
                </Button>

                <Divider orientation="vertical" flexItem sx={{ mx: 1, display: { xs: 'none', md: 'block' } }} />

                {/* Recording Controls */}
                {!streamHook.isConnected ? (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={streamHook.connect}
                        disabled={streamHook.status.includes('Connecting')}
                        startIcon={<LinkIcon />}
                        sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 600 }}
                    >
                        Connect
                    </Button>
                ) : !streamHook.isRecording ? (
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleStart}
                        disabled={!streamHook.status.includes('Ready')}
                        startIcon={<MicIcon />}
                        sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 600 }}
                    >
                        Record
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleStop}
                        startIcon={<StopCircleIcon />}
                        sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 600 }}
                    >
                        Stop
                    </Button>
                )}

                <Button
                    variant="outlined"
                    color="inherit"
                    onClick={handleReset}
                    disabled={!streamHook.isConnected}
                    startIcon={<ReplayIcon />}
                    sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 600 }}
                >
                    Reset
                </Button>
                </Box>
            </Paper>

            <SongRetriever
                open={isSongRetrieverOpen}
                onClose={() => setIsSongRetrieverOpen(false)}
                onSongSelected={handleSongRetrieved}
                token={token}
            />

            {/* Note Display & Errors (if any) */}
            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'center', width: '100%', flexShrink: 0, zIndex: 10 }}>
                <LiveRecorder
                    notes={detectedNotes}
                    error={streamHook.error || recorderHook.recorderError}
                />
            </Box>

            {/* Main Sheet Music Area - Takes remaining space */}
            <Paper 
                elevation={0} 
                sx={{ 
                    flexGrow: 1,
                    overflow: 'hidden',
                    borderRadius: 3,
                    bgcolor: 'white',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    mb: 2
                }}
            >
                <Box sx={{ width: '100%', height: '100%', p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', height: '100%' }}>
                    <SheetMusicDisplay
                        musicXML={musicXML}
                        currentTargetNoteIndex={currentTargetNoteIndex}
                        noteStatuses={noteStatuses}
                    />
                    </Box>
                </Box>
            </Paper>

            {/* Feedback & Playback Section - Appears at bottom */}
            {currentTargetNoteIndex >= songToPlay.length && !isRecording && songToPlay.length > 0 && (
                <Box sx={{ textAlign: 'center', mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 3, color: 'white', boxShadow: 2, flexShrink: 0 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        🎉 Session Complete! 🎉
                    </Typography>
                    <Typography variant="subtitle1">
                        Great job! Check your playback below.
                    </Typography>
                </Box>
            )}

            {playbackUrl && (
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 2, 
                        borderRadius: 3,
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        textAlign: 'center',
                        flexShrink: 0
                    }}
                >
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
                        Session Playback
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                        <audio src={playbackUrl} controls style={{ width: '100%', maxWidth: '500px' }} />
                    </Box>
                    {isScoring && (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 2 }}>
                            <CircularProgress size={20} />
                            <Typography variant="body2" color="text.secondary">Analyzing performance...</Typography>
                        </Box>
                    )}
                </Paper>
            )}

            {/* Performance Results Dialog */}
            <Dialog 
                open={resultsDialogOpen} 
                onClose={() => setResultsDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        bgcolor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)'
                    }
                }}
            >
                <DialogTitle sx={{ textAlign: 'center', bgcolor: 'primary.main', color: 'white', py: 3 }}>
                    <Typography variant="h5" fontWeight="bold">Performance Analysis</Typography>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <RecordingScore performanceResults={performanceResults} />
                </DialogContent>
                <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
                    <Button 
                        onClick={() => setResultsDialogOpen(false)} 
                        variant="contained" 
                        size="large"
                        sx={{ borderRadius: '50px', px: 4, fontWeight: 600 }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default Recording;