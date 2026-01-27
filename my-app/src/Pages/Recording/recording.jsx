import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../config/api';
import {
    Container,
    Box,
    Typography,
    Paper,
    CircularProgress,
    Grid,
    Card,
    CardContent,
    CardActionArea,
    Grow,
    Snackbar,
    Alert
} from '@mui/material';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import SheetMusicDisplay from './components/SheetMusicDisplay';
import SongRetriever from './components/SongRetriever';
import RecordingHeader from './components/RecordingHeader';
import RecordingControls from './components/RecordingControls';
import AnalysisDialog from './components/AnalysisDialog';
import { parseMusicXMLToNotes } from '../../utils/musicXMLParser';

const Recording = () => {
    const navigate = useNavigate();
    const recorderHook = useAudioRecorder();

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
    const [uploadedSongId, setUploadedSongId] = useState(null);
    const [songToPlay, setSongToPlay] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [currentTargetNoteIndex, setCurrentTargetNoteIndex] = useState(0);
    const [noteStatuses, setNoteStatuses] = useState([]);
    const [processedNotesCount, setProcessedNotesCount] = useState(0);
    const [isScoring, setIsScoring] = useState(false);
    const [playbackUrl, setPlaybackUrl] = useState(null);
    const [tempo, setTempo] = useState(120);
    const [isMetronomeOn, setIsMetronomeOn] = useState(false);
    const [metronomeVolume, setMetronomeVolume] = useState(0.5);
    const metronomeVolumeRef = useRef(metronomeVolume);
    const [countdownDuration, setCountdownDuration] = useState(3);
    const [isCountingDown, setIsCountingDown] = useState(false);
    const [currentCountdown, setCurrentCountdown] = useState(0);
    const [timingTolerance, setTimingTolerance] = useState(0.3);
    const [isSongRetrieverOpen, setIsSongRetrieverOpen] = useState(false);
    const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
    const [performanceResults, setPerformanceResults] = useState(null);
    const [availableSongs, setAvailableSongs] = useState([]);
    const [isLoadingSongs, setIsLoadingSongs] = useState(false);
    const [showMetronomeHint, setShowMetronomeHint] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const fetchSongs = async () => {
            if (!token) return;
            setIsLoadingSongs(true);
            try {
                const response = await fetch(`${API_BASE}/api/songs?mode=performance`, {
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

    useEffect(() => {
        if (!musicXML) return;
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

    useEffect(() => {
        let timer;
        if (isCountingDown && currentCountdown > 0) {
            timer = setTimeout(() => {
                setCurrentCountdown((prev) => prev - 1);
            }, 1000);
        } else if (isCountingDown && currentCountdown === 0) {
            setIsCountingDown(false);
        }
        return () => clearTimeout(timer);
    }, [isCountingDown, currentCountdown]);

    useEffect(() => {
        metronomeVolumeRef.current = metronomeVolume;
    }, [metronomeVolume]);

    // Metronome Logic
    useEffect(() => {
        let audioContext = null;
        let timerID = null;

        if (isRecording && !isCountingDown && isMetronomeOn) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioContext = new AudioContext();
                let nextNoteTime = audioContext.currentTime;
                const lookahead = 25.0;
                const scheduleAheadTime = 0.1;

                const scheduleNote = (time) => {
                    const osc = audioContext.createOscillator();
                    const envelope = audioContext.createGain();

                    osc.frequency.value = 800;
                    osc.type = 'sine'; 
                    
                    envelope.gain.setValueAtTime(metronomeVolumeRef.current, time);
                    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

                    osc.connect(envelope);
                    envelope.connect(audioContext.destination);

                    osc.start(time);
                    osc.stop(time + 0.03);
                };

                const scheduler = () => {
                    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
                        scheduleNote(nextNoteTime);
                        const secondsPerBeat = 60.0 / tempo;
                        nextNoteTime += secondsPerBeat;
                    }
                    timerID = setTimeout(scheduler, lookahead);
                };

                scheduler();
            } catch (e) {
                console.error("Metronome error:", e);
            }
        }

        return () => {
            if (timerID) clearTimeout(timerID);
            if (audioContext) {
                audioContext.close().catch(e => console.error("Error closing AudioContext:", e));
            }
        };
    }, [isRecording, isCountingDown, isMetronomeOn, tempo]);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('musicXmlFile', file);

            const headers = {
                'Authorization': `Bearer ${token}`
            };

            const uploadResponse = await fetch(`${API_BASE}/api/songs/upload`, {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (!uploadResponse.ok) {
                if (uploadResponse.status === 401 || uploadResponse.status === 403) {
                    throw new Error('Not authorized, token failed');
                }
                throw new Error('Failed to upload and save song');
            }

            const uploadResult = await uploadResponse.json();
            console.log('Song uploaded and saved:', uploadResult);

            setUploadedSongId(uploadResult.song.id);
            setUploadedFileName(uploadResult.song.title);

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
                setUploadedSongId(songData.id);
                setUploadedFileName(songData.title);
            } else {
                throw new Error('MusicXML data missing');
            }
        } catch (error) {
            console.error('Error loading song:', error);
            alert('Could not load the selected song. The file might be corrupted or missing.');
        }
    };

    const submitForScoring = async (audioBlob) => {
        console.log('🚀 Submitting to A2SA...');
        setIsScoring(true);

        const formData = new FormData();
        formData.append('audio', audioBlob, audioBlob.name || 'performance.wav');
        
        if (!uploadedSongId) {
            alert("No song selected. Please upload or select a song first.");
            setIsScoring(false);
            return;
        }
        formData.append('songId', uploadedSongId);

        try {
            const response = await fetch(`${API_BASE}/api/a2sa/align`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) throw new Error("Analysis failed");

            const data = await response.json();
            console.log("✅ A2SA Results:", data);

            if (data.status === 'success') {
                setPerformanceResults(data);
                setResultsDialogOpen(true);
            }
        } catch (err) {
            console.error(err);
            alert("Analysis Error: " + err.message);
        } finally {
            setIsScoring(false);
        }
    };

    const handleAudioUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPlaybackUrl(url);
            submitForScoring(file);
        }
    };

    const handleStop = async () => {
        setIsCountingDown(false);
        const blob = await recorderHook.stopFullRecording();
        setIsRecording(false);
        
        if (blob && blob.size > 0) {
            const url = URL.createObjectURL(blob);
            setPlaybackUrl(url);
            submitForScoring(blob); 
        } else {
            console.error("Recording failed: Blob was empty");
        }
    };

    const handleStart = async () => {
        setPlaybackUrl(null);
        setCurrentTargetNoteIndex(0);
        setNoteStatuses(new Array(songToPlay.length).fill('pending'));
        setProcessedNotesCount(0);

        recorderHook.startFullRecording();
        setIsRecording(true);

        setIsCountingDown(true);
        setCurrentCountdown(countdownDuration);
    };

    const handleReset = () => {
        setIsCountingDown(false);
        recorderHook.stopFullRecording();
        setIsRecording(false);
        setCurrentTargetNoteIndex(0);
        setNoteStatuses(new Array(songToPlay.length).fill('pending'));
        setProcessedNotesCount(0);
        setIsScoring(false);
        setPlaybackUrl(null);
    };

    const handleCursorUpdate = (newIndex) => {
        if (newIndex <= songToPlay.length) {
            setCurrentTargetNoteIndex(newIndex);
        }
    };

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#f8f9fa' }}>
            <SongRetriever
                open={isSongRetrieverOpen}
                onClose={() => setIsSongRetrieverOpen(false)}
                onSongSelected={handleSongRetrieved}
                token={token}
            />

            <RecordingHeader
                isRecording={isRecording}
                uploadedFileName={uploadedFileName}
                handleFileUpload={handleFileUpload}
                setIsSongRetrieverOpen={setIsSongRetrieverOpen}
                handleAudioUpload={handleAudioUpload}
                showSettings={showSettings}
                setShowSettings={setShowSettings}
                countdownDuration={countdownDuration}
                setCountdownDuration={setCountdownDuration}
                tempo={tempo}
                setTempo={setTempo}
                isMetronomeOn={isMetronomeOn}
                setIsMetronomeOn={setIsMetronomeOn}
                setShowMetronomeHint={setShowMetronomeHint}
                metronomeVolume={metronomeVolume}
                setMetronomeVolume={setMetronomeVolume}
            />

            {/* Main Content Area - Sheet Music Focused */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', pb: 2 }}>
                <Container
                    maxWidth="xl"
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        pt: 2,
                        pb: 0,
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >

                    {/* Countdown Overlay */}
                    {isCountingDown && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'rgba(255, 255, 255, 0.95)',
                                zIndex: 1000,
                                borderRadius: 4,
                            }}
                        >
                            <Typography
                                variant="h1"
                                sx={{
                                    color: 'primary.main',
                                    fontWeight: 900,
                                    fontSize: '12rem',
                                    textShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
                                    animation: 'countdownPulse 1s ease-in-out'
                                }}
                            >
                                {currentCountdown}
                            </Typography>
                        </Box>
                    )}

                    {/* Sheet Music Display - Takes Full Space */}
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
                            flexDirection: 'column',
                            position: 'relative'
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
                                    pb: 8, // More padding at bottom
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
                                        <LibraryMusicIcon sx={{ fontSize: 80, color: 'primary.main', mb: 3, opacity: 0.3 }} />
                                        <Typography variant="h4" sx={{ mb: 1, fontWeight: 700, color: 'text.primary' }}>
                                            Select a Song to Begin
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
                                                                        <LibraryMusicIcon sx={{ fontSize: 48, color: 'primary.main', flexShrink: 0 }} />
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
                                            noteStatuses={noteStatuses}
                                            bpm={tempo}
                                            isPlaying={isRecording && !isCountingDown}
                                            onCursorUpdate={handleCursorUpdate}
                                        />
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Paper>
                </Container>
            </Box>

            {/* Bottom Control Bar */}
            <RecordingControls
                playbackUrl={playbackUrl}
                isScoring={isScoring}
                isRecording={isRecording}
                musicXML={musicXML}
                handleStart={handleStart}
                handleStop={handleStop}
                handleReset={handleReset}
            />

            {/* Completion Message - Floating */}
            {currentTargetNoteIndex >= songToPlay.length && !isRecording && songToPlay.length > 0 && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 999,
                        animation: 'fadeInScale 0.5s ease-out'
                    }}
                >
                    <Paper 
                        elevation={8}
                        sx={{ 
                            p: 4, 
                            background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                            borderRadius: 4, 
                            color: 'white', 
                            textAlign: 'center',
                            minWidth: 400
                        }}
                    >
                        <Typography variant="h3" sx={{ fontWeight: 900, mb: 1 }}>
                            🎉 Great Job! 🎉
                        </Typography>
                        <Typography variant="h6" sx={{ opacity: 0.95 }}>
                            Performance complete! Check your results below.
                        </Typography>
                    </Paper>
                </Box>
            )}

            {/* Analysis Dialog - Now includes both loading and results */}
            <AnalysisDialog
                open={isScoring || resultsDialogOpen}
                onClose={() => setResultsDialogOpen(false)}
                performanceResults={performanceResults}
                performanceId={performanceResults?.performanceId}
            />

            {/* Metronome Hint */}
            <Snackbar
                open={showMetronomeHint}
                autoHideDuration={5000}
                onClose={() => setShowMetronomeHint(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert 
                    onClose={() => setShowMetronomeHint(false)} 
                    severity="info" 
                    variant="filled"
                    sx={{ borderRadius: 2 }}
                >
                    💡 Tip: Use headphones with the metronome for best results!
                </Alert>
            </Snackbar>

            <style>
                {`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.8; }
                    }
                    @keyframes musicWave {
                        0%, 100% { height: 20%; opacity: 0.5; }
                        50% { height: 100%; opacity: 1; }
                    }
                    @keyframes countdownPulse {
                        0% { transform: scale(0.8); opacity: 0; }
                        50% { transform: scale(1.1); }
                        100% { transform: scale(1); opacity: 1; }
                    }
                    @keyframes fadeInScale {
                        0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0; }
                        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    }
                `}
            </style>
        </Box>
    );
};

export default Recording;