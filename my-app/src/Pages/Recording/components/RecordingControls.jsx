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
            elevation={4}
            sx={{
                borderRadius: 0,
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'white',
                zIndex: 100,
                position: 'relative'
            }}
        >
            <Container maxWidth="xl">
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ py: 2.5, px: 1 }}
                >
                    {/* Left: Playback */}
                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                        {playbackUrl && !isScoring && (
                            <Box sx={{ width: '100%', maxWidth: 400 }}>
                                <audio
                                    src={playbackUrl}
                                    controls
                                    style={{
                                        width: '100%',
                                        height: '44px',
                                        borderRadius: '8px'
                                    }}
                                />
                            </Box>
                        )}
                    </Box>

                    {/* Center: Recording Controls */}
                    <Stack
                        direction="row"
                        spacing={2}
                        sx={{
                            flex: playbackUrl ? 'none' : 1,
                            justifyContent: 'center'
                        }}
                    >
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
                                    py: 1.5,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    minWidth: 200,
                                    fontSize: '1.05rem',
                                    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                                    '&:hover': {
                                        boxShadow: '0 6px 16px rgba(76, 175, 80, 0.4)',
                                    },
                                    '&:disabled': {
                                        boxShadow: 'none'
                                    }
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
                                    py: 1.5,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    minWidth: 200,
                                    fontSize: '1.05rem',
                                    animation: 'pulse 2s infinite',
                                    boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
                                    '&:hover': {
                                        boxShadow: '0 6px 16px rgba(244, 67, 54, 0.4)',
                                    }
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
                                px: 3.5,
                                py: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                fontSize: '1rem',
                                borderWidth: 2,
                                '&:hover': {
                                    borderWidth: 2,
                                    bgcolor: 'rgba(0, 0, 0, 0.04)'
                                }
                            }}
                        >
                            Reset
                        </Button>
                    </Stack>

                    {/* Right: Spacer for balance */}
                    <Box sx={{ flex: 1 }} />
                </Stack>
            </Container>
        </Paper>
    );
};

export default RecordingControls;
