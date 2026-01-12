// /home/eyalb1380/PlayRightProject/my-app/src/Pages/Recording/components/RecordingHeader.jsx
import React from 'react';
import {
    Paper, Container, Stack, Typography, Chip, Tooltip, IconButton, Collapse, Box, TextField, MenuItem, Button, Slider
} from '@mui/material';
import {
    FiberManualRecord as FiberManualRecordIcon,
    CheckCircle as CheckCircleIcon,
    UploadFile as UploadFileIcon,
    LibraryMusic as LibraryMusicIcon,
    AudioFile as AudioFileIcon,
    Settings as SettingsIcon,
    VolumeUp as VolumeUpIcon,
    VolumeOff as VolumeOffIcon
} from '@mui/icons-material';

const RecordingHeader = ({
    isRecording,
    uploadedFileName,
    handleFileUpload,
    setIsSongRetrieverOpen,
    handleAudioUpload,
    showSettings,
    setShowSettings,
    countdownDuration,
    setCountdownDuration,
    tempo,
    setTempo,
    isMetronomeOn,
    setIsMetronomeOn,
    setShowMetronomeHint,
    metronomeVolume,
    setMetronomeVolume
}) => {
    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 0,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'white',
                zIndex: 10
            }}
        >
            <Container maxWidth="xl">
                <Stack 
                    direction="row" 
                    spacing={2} 
                    alignItems="center" 
                    justifyContent="space-between"
                    sx={{ py: 1.5 }}
                >
                    {/* Left: Title & Status */}
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                            Performance Mode
                        </Typography>
                        <Chip 
                            icon={isRecording ? <FiberManualRecordIcon /> : <CheckCircleIcon />}
                            label={isRecording ? "Recording" : "Ready"} 
                            size="small"
                            color={isRecording ? "error" : "success"}
                            variant="outlined"
                        />
                        {uploadedFileName && (
                            <Chip 
                                label={uploadedFileName} 
                                size="small"
                                color="primary"
                                variant="filled"
                                sx={{ maxWidth: 200 }}
                            />
                        )}
                    </Stack>

                    {/* Right: File Actions */}
                    <Stack direction="row" spacing={1}>
                        <Tooltip title="Upload MusicXML">
                            <IconButton component="label" size="small" color="primary">
                                <UploadFileIcon />
                                <input type="file" hidden accept=".xml,.musicxml" onChange={handleFileUpload} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="My Songs">
                            <IconButton onClick={() => setIsSongRetrieverOpen(true)} size="small" color="primary">
                                <LibraryMusicIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Upload Audio">
                            <IconButton component="label" size="small" color="primary" disabled={isRecording}>
                                <AudioFileIcon />
                                <input type="file" hidden accept="audio/*" onChange={handleAudioUpload} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Settings">
                            <IconButton 
                                onClick={() => setShowSettings(!showSettings)} 
                                size="small" 
                                color={showSettings ? "primary" : "default"}
                            >
                                <SettingsIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Stack>

                {/* Collapsible Settings Panel */}
                <Collapse in={showSettings}>
                    <Box sx={{ pb: 2, pt: 1 }}>
                        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
                            <TextField
                                select
                                label="Countdown"
                                value={countdownDuration}
                                onChange={(e) => setCountdownDuration(Number(e.target.value))}
                                size="small"
                                sx={{ width: 120 }}
                            >
                                <MenuItem value={3}>3 seconds</MenuItem>
                                <MenuItem value={5}>5 seconds</MenuItem>
                                <MenuItem value={10}>10 seconds</MenuItem>
                            </TextField>
                            <TextField
                                label="Tempo (BPM)"
                                type="number"
                                value={tempo}
                                onChange={(e) => setTempo(Number(e.target.value))}
                                size="small"
                                InputProps={{ inputProps: { min: 40, max: 240 } }}
                                sx={{ width: 130 }}
                            />
                            <Button
                                variant={isMetronomeOn ? "contained" : "outlined"}
                                onClick={() => {
                                    if (!isMetronomeOn) setShowMetronomeHint(true);
                                    setIsMetronomeOn(!isMetronomeOn);
                                }}
                                startIcon={isMetronomeOn ? <VolumeUpIcon /> : <VolumeOffIcon />}
                                size="small"
                            >
                                Metronome
                            </Button>
                            {isMetronomeOn && (
                                <Box sx={{ width: 120, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <VolumeOffIcon fontSize="small" color="action" />
                                    <Slider
                                        size="small"
                                        value={metronomeVolume}
                                        min={0}
                                        max={1}
                                        step={0.1}
                                        onChange={(e, val) => setMetronomeVolume(val)}
                                        sx={{ flex: 1 }}
                                    />
                                    <VolumeUpIcon fontSize="small" color="action" />
                                </Box>
                            )}
                        </Stack>
                    </Box>
                </Collapse>
            </Container>
        </Paper>
    );
};

export default RecordingHeader;
