import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../config/api';
import {
    Container,
    Box,
    Typography,
    Paper,
    Button,
    CircularProgress,
    Grid,
    Card,
    CardActionArea,
    Grow,
    Snackbar,
    Alert,
    IconButton,
    Tooltip,
    AppBar,
    Toolbar,
    Chip,
    Dialog,
    DialogContent,
    DialogActions
} from '@mui/material';
import LibraryMusicIconImport from '@mui/icons-material/LibraryMusic';
import MicIconImport from '@mui/icons-material/Mic';
import StopIconImport from '@mui/icons-material/Stop';
import RefreshIconImport from '@mui/icons-material/Refresh';
import MusicNoteIconImport from '@mui/icons-material/MusicNote';
import { useAudioStream } from '../../hooks/useAudioStream';
import SheetMusicDisplay from '../Recording/components/SheetMusicDisplay';
import SongRetriever from '../Recording/components/SongRetriever';
import { parseMusicXMLToNotes } from '../../utils/musicXMLParser';

const Learn = () => {
    const navigate = useNavigate();
    const audioStream = useAudioStream();

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            console.error("No authentication token found. Redirecting to login.");
            navigate('/login');
        }
    }, [token, navigate]);

    // State
    const [musicXML, setMusicXML] = useState(null);
    const [uploadedFileName, setUploadedFileName] = useState(null);
    const [songToPlay, setSongToPlay] = useState([]);
    const [currentTargetNoteIndex, setCurrentTargetNoteIndex] = useState(0);
    const [tempo] = useState(120);
    const [availableSongs, setAvailableSongs] = useState([]);
    const [isLoadingSongs, setIsLoadingSongs] = useState(false);
    const [isSongRetrieverOpen, setIsSongRetrieverOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');
    const [completionDialogOpen, setCompletionDialogOpen] = useState(false);

    // Track the last processed note index to prevent duplicate comparisons
    const lastProcessedNoteIndexRef = useRef(-1);

    // Define showSnackbar before using it in useEffects
    const showSnackbar = useCallback((message, severity = 'info') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    }, []);

    // Fetch available songs - Learning Mode only
    useEffect(() => {
        const fetchSongs = async () => {
            if (!token) return;
            setIsLoadingSongs(true);
            try {
                const response = await fetch(`${API_BASE}/api/songs?mode=learn`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setAvailableSongs(data);
                }
            } catch (error) {
                console.error("Failed to fetch songs", error);
            } finally {
                setIsLoadingSongs(false);
            }
        };

        if (!musicXML) {
            fetchSongs();
        }
    }, [token, musicXML]);

    // Parse MusicXML to notes
    useEffect(() => {
        if (!musicXML) return;
        try {
            const notes = parseMusicXMLToNotes(musicXML);
            console.log('Parsed notes from MusicXML:', notes);
            setSongToPlay(notes);
            setCurrentTargetNoteIndex(0);
        } catch (error) {
            console.error('Error parsing MusicXML:', error);
            showSnackbar('Error loading sheet music. Please check the file format.', 'error');
        }
    }, [musicXML]);

    // Auto-skip rests when cursor reaches them
    useEffect(() => {
        if (!audioStream.isRecording || songToPlay.length === 0) {
            return;
        }

        // Skip through consecutive rests automatically
        let nextIndex = currentTargetNoteIndex;
        while (nextIndex < songToPlay.length && songToPlay[nextIndex].isRest) {
            console.log(`⏭️ Skipping rest at index ${nextIndex}`);
            nextIndex++;
        }

        // Update cursor if we skipped any rests
        if (nextIndex !== currentTargetNoteIndex) {
            setCurrentTargetNoteIndex(nextIndex);
        }
    }, [currentTargetNoteIndex, songToPlay, audioStream.isRecording]);

    // Handle detected notes from live audio stream
    useEffect(() => {
        if (!audioStream.isRecording || audioStream.notes.length === 0 || songToPlay.length === 0) {
            return;
        }

        const currentNoteIndex = audioStream.notes.length - 1;

        // Skip if we've already processed this note
        if (currentNoteIndex <= lastProcessedNoteIndexRef.current) {
            return;
        }

        // Get the last detected note
        const lastDetectedNote = audioStream.notes[currentNoteIndex];
        const targetNote = songToPlay[currentTargetNoteIndex];

        if (!targetNote) {
            console.log('✅ Song complete! All notes played.');
            // Show completion dialog
            setCompletionDialogOpen(true);
            audioStream.stopRecording();
            return;
        }

        // Extract note name from detected note (Python returns {note: 'C4', midi: 60, ...})
        const detectedNoteName = lastDetectedNote.note || lastDetectedNote.name || lastDetectedNote;
        const targetNoteName = targetNote.name || targetNote;

        console.log(`🎵 Detected: ${detectedNoteName}, Target: ${targetNoteName}, Note Index: ${currentNoteIndex}`);

        // Mark this note as processed
        lastProcessedNoteIndexRef.current = currentNoteIndex;

        // Check if the detected note matches the target note
        if (detectedNoteName === targetNoteName) {
            console.log(`✅ Correct note played: ${targetNoteName}`);
            // Move cursor to next note
            setCurrentTargetNoteIndex(prev => prev + 1);
        } else {
            console.log(`❌ Wrong note: expected ${targetNoteName}, got ${detectedNoteName}`);
        }
    }, [audioStream.notes.length, audioStream.isRecording, songToPlay, currentTargetNoteIndex, showSnackbar, audioStream.notes]);

    const handleSongRetrieved = async (song) => {
        if (!song) return;

        try {
            let songData = song;

            if (!songData.musicXml && songData.id) {
                const response = await fetch(`${API_BASE}/api/songs/${songData.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    songData = await response.json();
                }
            }

            if (songData && songData.musicXml) {
                console.log('Song retrieved:', songData);
                setMusicXML(songData.musicXml);
                setUploadedFileName(songData.title);
                showSnackbar(`Loaded: ${songData.title}`, 'success');
            } else {
                throw new Error('MusicXML data missing');
            }
        } catch (error) {
            console.error('Error loading song:', error);
            showSnackbar('Could not load the selected song. The file might be corrupted or missing.', 'error');
        }
    };

    const handleStartRecording = async () => {
        if (!musicXML) {
            showSnackbar('Please select a song first!', 'warning');
            return;
        }

        try {
            // Connect to audio stream if not connected
            if (!audioStream.isConnected) {
                showSnackbar('Connecting to server...', 'info');
                await audioStream.connect();
                // Wait a bit for the connection to be fully established
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Reset progress and notes
            setCurrentTargetNoteIndex(0);
            lastProcessedNoteIndexRef.current = -1; // Reset processed note tracker
            audioStream.reset();

            // Start live recording
            await audioStream.startRecording();
            showSnackbar('Recording started! Play along with the sheet music.', 'info');
        } catch (error) {
            console.error('Error starting recording:', error);
            showSnackbar('Failed to start recording. Please try again.', 'error');
        }
    };

    const handleStopRecording = () => {
        audioStream.stopRecording();
        setCompletionDialogOpen(true);
    };

    const handleReset = () => {
        audioStream.stopRecording();
        audioStream.reset();
        setCurrentTargetNoteIndex(0);
        lastProcessedNoteIndexRef.current = -1; // Reset processed note tracker
        setCompletionDialogOpen(false);
        showSnackbar('Practice session reset.', 'info');
    };

    const handlePracticeAgain = () => {
        setCompletionDialogOpen(false);
        handleReset();
    };

    const handleGoToPerformance = () => {
        navigate('/recording');
    };

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#f5f7fa' }}>
            {/* Header */}
            <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
                <Toolbar sx={{ py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 2 }}>
                        <MusicNoteIconImport sx={{ fontSize: 32, color: 'primary.main' }} />
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                Learning Mode
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Practice without pressure - no grading, just learning
                            </Typography>
                        </Box>
                    </Box>

                    {uploadedFileName && (
                        <Chip
                            label={uploadedFileName}
                            color="primary"
                            variant="outlined"
                            sx={{ mr: 2, fontWeight: 600 }}
                        />
                    )}

                    <Tooltip title="Choose from Library">
                        <IconButton
                            onClick={() => setIsSongRetrieverOpen(true)}
                            disabled={audioStream.isRecording}
                            sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'primary.dark' },
                                '&:disabled': { bgcolor: 'grey.300' }
                            }}
                        >
                            <LibraryMusicIconImport />
                        </IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>

            {/* Song Retriever Dialog */}
            <SongRetriever
                open={isSongRetrieverOpen}
                onClose={() => setIsSongRetrieverOpen(false)}
                onSongSelected={handleSongRetrieved}
                token={token}
            />

            {/* Main Content Area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', pb: 2 }}>
                <Container
                    maxWidth="xl"
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        pt: 2,
                        pb: 0,
                        overflow: 'hidden'
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            flex: 1,
                            overflow: 'hidden',
                            borderRadius: 3,
                            bgcolor: 'white',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            border: '1px solid rgba(0, 0, 0, 0.06)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <Box
                            sx={{
                                width: '100%',
                                height: '100%',
                                overflow: 'auto',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <Box
                                sx={{
                                    width: '100%',
                                    p: 4,
                                    pb: 8,
                                    minHeight: '100%',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                {!musicXML ? (
                                    <Box
                                        sx={{
                                            width: '100%',
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: availableSongs.length > 0 ? 'flex-start' : 'center',
                                            pt: availableSongs.length > 0 ? 2 : 0
                                        }}
                                    >
                                        <LibraryMusicIconImport sx={{ fontSize: 80, color: 'primary.main', mb: 3, opacity: 0.3 }} />
                                        <Typography variant="h4" sx={{ mb: 1, fontWeight: 700, color: 'text.primary' }}>
                                            Select a Song to Practice
                                        </Typography>
                                        <Typography variant="body1" color="text.secondary" sx={{ mb: 5 }}>
                                            Choose from your library or upload a new MusicXML file
                                        </Typography>

                                        {isLoadingSongs ? (
                                            <CircularProgress />
                                        ) : (
                                            <Grid
                                                container
                                                spacing={3}
                                                sx={{
                                                    width: '100%',
                                                    maxWidth: 1000,
                                                    mb: 6
                                                }}
                                            >
                                                {availableSongs.map((song, index) => (
                                                    <Grid item xs={12} sm={6} md={4} key={song.id || index}>
                                                        <Grow in={true} timeout={(index + 1) * 150}>
                                                            <Card
                                                                elevation={0}
                                                                sx={{
                                                                    height: 160,
                                                                    borderRadius: 3,
                                                                    border: '1px solid',
                                                                    borderColor: 'divider',
                                                                    transition: 'all 0.2s',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    '&:hover': {
                                                                        transform: 'translateY(-4px)',
                                                                        boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                                                                        borderColor: 'primary.main'
                                                                    }
                                                                }}
                                                            >
                                                                <CardActionArea
                                                                    onClick={() => handleSongRetrieved(song)}
                                                                    sx={{
                                                                        height: '100%',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        p: 3
                                                                    }}
                                                                >
                                                                    <Box
                                                                        sx={{
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            gap: 2,
                                                                            width: '100%'
                                                                        }}
                                                                    >
                                                                        <LibraryMusicIconImport sx={{ fontSize: 48, color: 'primary.main', flexShrink: 0 }} />
                                                                        <Box sx={{ textAlign: 'center', width: '100%' }}>
                                                                            <Typography
                                                                                variant="subtitle1"
                                                                                fontWeight="bold"
                                                                                sx={{
                                                                                    mb: 0.5,
                                                                                    overflow: 'hidden',
                                                                                    textOverflow: 'ellipsis',
                                                                                    display: '-webkit-box',
                                                                                    WebkitLineClamp: 2,
                                                                                    WebkitBoxOrient: 'vertical',
                                                                                    lineHeight: 1.3,
                                                                                    minHeight: '2.6em'
                                                                                }}
                                                                            >
                                                                                {song.title || "Untitled"}
                                                                            </Typography>
                                                                            <Typography
                                                                                variant="caption"
                                                                                color="text.secondary"
                                                                                sx={{
                                                                                    overflow: 'hidden',
                                                                                    textOverflow: 'ellipsis',
                                                                                    whiteSpace: 'nowrap',
                                                                                    display: 'block'
                                                                                }}
                                                                            >
                                                                                {song.artist || "Unknown Artist"}
                                                                            </Typography>
                                                                        </Box>
                                                                    </Box>
                                                                </CardActionArea>
                                                            </Card>
                                                        </Grow>
                                                    </Grid>
                                                ))}
                                                {availableSongs.length === 0 && (
                                                    <Grid item xs={12}>
                                                        <Typography variant="body2" color="text.secondary" textAlign="center">
                                                            No songs in your library yet. Upload one to get started!
                                                        </Typography>
                                                    </Grid>
                                                )}
                                            </Grid>
                                        )}
                                    </Box>
                                ) : (
                                    <Box sx={{ width: '100%', height: '100%' }}>
                                        <SheetMusicDisplay
                                            musicXML={musicXML}
                                            currentTargetNoteIndex={currentTargetNoteIndex}
                                            noteStatuses={[]}
                                            bpm={tempo}
                                            isPlaying={false}
                                            onCursorUpdate={() => {}}
                                        />
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Paper>
                </Container>
            </Box>

            {/* Bottom Control Bar */}
            <Paper
                elevation={8}
                sx={{
                    borderTop: '1px solid #e0e0e0',
                    bgcolor: 'white',
                    py: 2,
                    px: 3
                }}
            >
                <Container maxWidth="xl">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        {!audioStream.isRecording ? (
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<MicIconImport />}
                                onClick={handleStartRecording}
                                disabled={!musicXML}
                                sx={{
                                    minWidth: 200,
                                    py: 1.5,
                                    borderRadius: 3,
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    textTransform: 'none',
                                    bgcolor: 'error.main',
                                    '&:hover': { bgcolor: 'error.dark' },
                                    '&:disabled': { bgcolor: 'grey.300' }
                                }}
                            >
                                Start Practice
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<StopIconImport />}
                                    onClick={handleStopRecording}
                                    sx={{
                                        minWidth: 200,
                                        py: 1.5,
                                        borderRadius: 3,
                                        fontWeight: 700,
                                        fontSize: '1rem',
                                        textTransform: 'none',
                                        bgcolor: 'error.dark',
                                        '&:hover': { bgcolor: 'error.main' }
                                    }}
                                >
                                    Stop Practice
                                </Button>

                                <Chip
                                    icon={<MicIconImport sx={{ animation: 'pulse 1.5s infinite' }} />}
                                    label="Recording..."
                                    color="error"
                                    sx={{ px: 2, py: 2.5, fontSize: '0.95rem', fontWeight: 600 }}
                                />
                            </>
                        )}

                        <Button
                            variant="outlined"
                            size="large"
                            startIcon={<RefreshIconImport />}
                            onClick={handleReset}
                            disabled={!musicXML}
                            sx={{
                                minWidth: 150,
                                py: 1.5,
                                borderRadius: 3,
                                fontWeight: 600,
                                textTransform: 'none'
                            }}
                        >
                            Reset
                        </Button>
                    </Box>

                    {musicXML && (
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                                Practice at your own pace. Your performance is being recorded for later analysis.
                            </Typography>
                        </Box>
                    )}
                </Container>
            </Paper>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={4000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity={snackbarSeverity}
                    variant="filled"
                    sx={{ borderRadius: 2 }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            {/* Completion Dialog */}
            <Dialog
                open={completionDialogOpen}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        overflow: 'hidden',
                        position: 'relative',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                            pointerEvents: 'none'
                        }
                    }
                }}
            >
                <DialogContent sx={{ textAlign: 'center', py: 6, px: 4, position: 'relative', zIndex: 1 }}>
                    <Box sx={{ mb: 3, animation: 'bounce 1s ease-in-out' }}>
                        <Typography variant="h2" sx={{ fontSize: '4rem', mb: 2 }}>
                            🎉
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                            Well Done!
                        </Typography>
                        <Typography variant="h6" sx={{ opacity: 0.95, fontWeight: 400 }}>
                            You've completed the practice session!
                        </Typography>
                    </Box>

                    <Typography variant="body1" sx={{ mb: 4, fontSize: '1.1rem', opacity: 0.9 }}>
                        Practice the basics again? Or go to Performance Mode and be a pro?
                    </Typography>
                </DialogContent>

                <DialogActions sx={{ flexDirection: 'column', gap: 2, p: 4, pt: 0, position: 'relative', zIndex: 1 }}>
                    <Button
                        variant="contained"
                        size="large"
                        fullWidth
                        onClick={handleGoToPerformance}
                        sx={{
                            bgcolor: 'white',
                            color: '#667eea',
                            py: 2,
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            borderRadius: 3,
                            textTransform: 'none',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                            '&:hover': {
                                bgcolor: '#f0f0f0',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 12px 20px rgba(0,0,0,0.3)'
                            },
                            transition: 'all 0.2s'
                        }}
                    >
                        🎸 Go to Performance Mode
                    </Button>

                    <Button
                        variant="outlined"
                        size="large"
                        fullWidth
                        onClick={handlePracticeAgain}
                        sx={{
                            borderColor: 'white',
                            color: 'white',
                            py: 1.5,
                            fontSize: '1rem',
                            fontWeight: 600,
                            borderRadius: 3,
                            textTransform: 'none',
                            borderWidth: 2,
                            '&:hover': {
                                borderColor: 'white',
                                bgcolor: 'rgba(255,255,255,0.1)',
                                borderWidth: 2
                            }
                        }}
                    >
                        🔄 Practice Again
                    </Button>
                </DialogActions>
            </Dialog>

            <style>
                {`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }

                    @keyframes bounce {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-20px); }
                    }
                `}
            </style>
        </Box>
    );
};

export default Learn;
