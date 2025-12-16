import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Box,
    Typography,
    Button,
    Paper,
    Grid,
    TextField,
    Stack,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import { useAudioStream } from '../../hooks/useAudioStream';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import LiveRecorder from './components/LiveRecorder';
import SheetMusicDisplay from './components/SheetMusicDisplay';
import { defaultMusicXML } from '../../assets/defaultMusicXML';
import SongRetriever from './components/SongRetriever';
import { parseMusicXMLToNotes } from '../../utils/musicXMLParser';

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

    // Scoring Logic - Updated to include MusicXML path
    const submitForScoring = (audioBlob) => {
        console.log('Submitting audio for scoring...', audioBlob);
        setIsScoring(true);
        const formData = new FormData();
        formData.append('audioFile', audioBlob, 'performance.webm');

        // The backend needs to know which song to compare against.
        // We send the songId if we have one (from an upload or from 'My Songs').
        // If not, we send 'default' so the backend knows to use the default song.
        if (uploadedSongId) {
            formData.append('songId', uploadedSongId);
            console.log('Submitting performance for songId:', uploadedSongId);
        } else {
            formData.append('songId', 'default');
        }

        // Add tempo and timing tolerance
        formData.append('tempo', tempo.toString());
        formData.append('timingTolerance', timingTolerance.toString());


        const headers = {
            'Authorization': `Bearer ${token}`
        };

        fetch('http://localhost:3001/api/performances/analyze', { 
            method: 'POST', 
            body: formData,
            headers: headers
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Analysis result received in React:', data);
                setIsScoring(false);

                if (data && data.playedNotes) {
                    console.log("Played Notes:", data.playedNotes);
                    
                    // Display comparison results if available
                    if (data.comparison) {
                        setPerformanceResults(data.comparison);
                        setResultsDialogOpen(true);
                        
                        // Log detailed results
                        console.log('Detailed comparison:', data.comparison.details);
                    } else {
                        alert('Performance recorded successfully! (No comparison data available)');
                    }
                } else if (data && data.error) {
                    alert(`Analysis Error: ${data.error}`);
                    console.error("Analysis Error:", data.error);
                } else {
                    alert('Received unexpected data format from server.');
                    console.error('Unexpected data:', data);
                }
            })
            .catch(err => {
                console.error('Error submitting score:', err);
                setIsScoring(false);
                alert(`Error submitting score: ${err.message}`);
            });
    };

    // Playback and Submission Logic
    useEffect(() => {
        if (recorderHook.audioBlob) {
            const url = URL.createObjectURL(recorderHook.audioBlob);
            setPlaybackUrl(url);
            submitForScoring(recorderHook.audioBlob, uploadedSongId);
        }
        return () => {
            if (playbackUrl) {
                URL.revokeObjectURL(playbackUrl);
            }
        };
    }, [recorderHook.audioBlob, uploadedSongId]);

    // Control Functions
    const handleStart = async () => {
        setPlaybackUrl(null);
        setCurrentTargetNoteIndex(0);
        setNoteStatuses(new Array(songToPlay.length).fill('pending'));
        setProcessedNotesCount(0);

        await streamHook.startRecording();
        recorderHook.startFullRecording();
    };

    const handleStop = () => {
        streamHook.stopRecording();
        recorderHook.stopFullRecording();
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
        <Container maxWidth="lg" sx={{ my: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileIcon />}
                    size="small"
                >
                    Upload MusicXML
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
                    size="small"
                    onClick={() => setIsSongRetrieverOpen(true)}
                >
                    Load My Songs
                </Button>
                <Typography variant="body2" color="text.secondary">
                    Or use the default "Twinkle Twinkle Little Star".
                </Typography>
                {uploadedFileName && (
                    <Chip label={`Uploaded: ${uploadedFileName}`} color="success" size="small" />
                )}
            </Box>

            <SongRetriever
                open={isSongRetrieverOpen}
                onClose={() => setIsSongRetrieverOpen(false)}
                onSongSelected={handleSongRetrieved}
                token={token}
            />

            <Paper elevation={3} sx={{ p: 2, mb: 3, overflowX: 'auto' }}>
                <SheetMusicDisplay
                    musicXML={musicXML}
                    currentTargetNoteIndex={currentTargetNoteIndex}
                    noteStatuses={noteStatuses}
                />
            </Paper>

            <LiveRecorder
                isConnected={streamHook.isConnected}
                isRecording={streamHook.isRecording}
                status={streamHook.status}
                notes={detectedNotes}
                error={streamHook.error || recorderHook.recorderError}
                connect={streamHook.connect}
                startRecording={handleStart}
                stopRecording={handleStop}
                reset={handleReset}
                disconnect={streamHook.disconnect}
            />

            {currentTargetNoteIndex >= songToPlay.length && !isRecording && songToPlay.length > 0 && (
                <Typography variant="h4" color="primary" align="center" sx={{ mt: 4 }}>
                    🎉 Well Done! 🎉
                </Typography>
            )}

            {playbackUrl && (
                <Paper elevation={3} sx={{ p: 2, mt: 4 }}>
                    <Typography variant="h6">Listen to your performance:</Typography>
                    <audio src={playbackUrl} controls />
                    {isScoring && <Typography variant="body2" sx={{ mt: 1 }}>Calculating your score...</Typography>}
                </Paper>
            )}

            {/* Performance Results Dialog */}
            <Dialog 
                open={resultsDialogOpen} 
                onClose={() => setResultsDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
                    Performance Analysis
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    {performanceResults && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                                <Typography variant="h2" color="primary" sx={{ fontWeight: 'bold' }}>
                                    {performanceResults.overall_score}%
                                </Typography>
                                <Typography variant="subtitle1" color="text.secondary">
                                    Overall Score
                                </Typography>
                            </Box>
                            
                            <Divider />
                            
                            <Grid container spacing={2} sx={{ textAlign: 'center' }}>
                                <Grid item xs={6}>
                                    <Typography variant="h5" color="text.primary">{performanceResults.pitch_accuracy}%</Typography>
                                    <Typography variant="body2" color="text.secondary">Pitch Accuracy</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="h5" color="text.primary">{performanceResults.timing_accuracy}%</Typography>
                                    <Typography variant="body2" color="text.secondary">Timing Accuracy</Typography>
                                </Grid>
                            </Grid>

                            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                                <Stack spacing={1}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2">Total Notes:</Typography>
                                        <Typography variant="body2" fontWeight="bold">{performanceResults.total_expected}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2">Correct Notes:</Typography>
                                        <Typography variant="body2" fontWeight="bold" color="success.main">{performanceResults.correct_notes}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2">On-Time Notes:</Typography>
                                        <Typography variant="body2" fontWeight="bold" color="info.main">{performanceResults.on_time_notes}</Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
                    <Button 
                        onClick={() => setResultsDialogOpen(false)} 
                        variant="contained" 
                        size="large"
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default Recording;