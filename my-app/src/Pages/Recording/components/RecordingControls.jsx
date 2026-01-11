// /home/eyalb1380/PlayRightProject/my-app/src/Pages/Recording/components/RecordingControls.jsx
import React from 'react';
import { Paper, Container, Stack, Box, Button } from '@mui/material';
import { Mic as MicIcon, StopCircle as StopCircleIcon, Replay as ReplayIcon } from '@mui/icons-material';

const RecordingControls = ({
    playbackUrl,
    isScoring,
    isRecording,
    musicXML,
    handleStart,
    handleStop,
    handleReset
}) => {
    return (
        <Paper
            elevation={3}
            sx={{
                borderRadius: 0,
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'white',
                zIndex: 10
            }}
        >
            <Container maxWidth="xl">
                <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    spacing={2} 
                    alignItems="center" 
                    justifyContent="space-between"
                    sx={{ py: 2 }}
                >
                    {/* Left: Playback */}
                    {playbackUrl && !isScoring && (
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <audio 
                                src={playbackUrl} 
                                controls 
                                style={{ 
                                    width: '100%',
                                    maxWidth: '400px',
                                    height: '40px'
                                }} 
                            />
                        </Box>
                    )}

                    {/* Center: Recording Controls */}
                    <Stack direction="row" spacing={2} sx={{ flex: playbackUrl ? 'none' : 1, justifyContent: 'center' }}>
                        {!isRecording ? (
                            <Button
                                variant="contained"
                                color="success"
                                size="large"
                                onClick={handleStart}
                                startIcon={<MicIcon />}
                                disabled={!musicXML}
                                sx={{ 
                                    borderRadius: 3, 
                                    px: 4,
                                    py: 1.2,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    minWidth: 180,
                                    fontSize: '1rem'
                                }}
                            >
                                Start Recording
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                color="error"
                                size="large"
                                onClick={handleStop}
                                startIcon={<StopCircleIcon />}
                                sx={{ 
                                    borderRadius: 3, 
                                    px: 4,
                                    py: 1.2,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    minWidth: 180,
                                    fontSize: '1rem',
                                    animation: 'pulse 2s infinite'
                                }}
                            >
                                Stop Recording
                            </Button>
                        )}

                        <Button
                            variant="outlined"
                            size="large"
                            onClick={handleReset}
                            startIcon={<ReplayIcon />}
                            sx={{ 
                                borderRadius: 3, 
                                px: 3,
                                py: 1.2,
                                fontWeight: 600,
                                textTransform: 'none',
                                fontSize: '1rem'
                            }}
                        >
                            Reset
                        </Button>
                    </Stack>

                    {/* Right: Spacer for balance */}
                    {playbackUrl && <Box sx={{ flex: 1 }} />}
                </Stack>
            </Container>
        </Paper>
    );
};

export default RecordingControls;
