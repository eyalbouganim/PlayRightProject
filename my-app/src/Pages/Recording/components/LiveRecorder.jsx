// src/Pages/Recording/components/LiveRecorder.jsx

import React from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Stack,
    Chip,
    Alert
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import MicIcon from '@mui/icons-material/Mic';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import NoteDisplay from './NoteDisplay.jsx';

// This is now a "presentational" component.
// It receives all its logic as props from the parent.
const LiveRecorder = ({
    isConnected,
    isRecording,
    status,
    notes,
    error,
    connect,
    startRecording,
    stopRecording,
    reset,
}) => {

    return (
        <Paper elevation={3} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Controls</Typography>
                <Chip
                    label={status}
                    color={isConnected ? 'success' : 'default'}
                    variant="outlined"
                />
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
                {/* Step 1: Show Connect button if not connected */}
                {!isConnected ? (
                    <Button
                        variant="contained"
                        onClick={connect}
                        disabled={status.includes('Connecting')}
                        startIcon={<LinkIcon />}
                    >
                        Connect to Server
                    </Button>
                ) : !isRecording ? (
                    // Step 2: Once connected, show Start button
                    <Button
                        variant="contained"
                        color="success"
                        onClick={startRecording} // Uses the function from props
                        disabled={!status.includes('Ready')}
                        startIcon={<MicIcon />}
                    >
                        Start Recording
                    </Button>
                ) : (
                    // Step 3: Once recording, show Stop button
                    <Button
                        variant="contained"
                        color="error"
                        onClick={stopRecording} // Uses the function from props
                        startIcon={<StopCircleIcon />}
                    >
                        Stop Recording
                    </Button>
                )}

                <Button
                    variant="outlined"
                    onClick={reset} // Uses the function from props
                    disabled={!isConnected}
                    startIcon={<ReplayIcon />}
                >
                    Reset
                </Button>
            </Stack>

            {/* This will now correctly display the notes from the parent */}
            <NoteDisplay notes={notes} />
        </Paper>
    );
};

export default LiveRecorder;