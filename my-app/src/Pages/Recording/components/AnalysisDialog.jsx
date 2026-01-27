// /home/eyalb1380/PlayRightProject/my-app/src/Pages/Recording/components/AnalysisDialog.jsx
import React, { useState } from 'react';
import { API_BASE } from '../../../config/api';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Box,
    Typography,
    Button,
    CircularProgress,
    IconButton
} from '@mui/material';
import {
    Close as CloseIcon,
    AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import RecordingScore from './RecordingScore';

const AnalysisDialog = ({ open, onClose, performanceResults, performanceId }) => {
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [aiFeedback, setAiFeedback] = useState('');
    const [showFeedback, setShowFeedback] = useState(false);

    // Show loading state if results aren't ready yet
    const isLoading = open && !performanceResults;

    const handleViewAIFeedback = async () => {
        if (!performanceId) {
            setAiFeedback("Unable to generate feedback - performance ID not available.");
            setShowFeedback(true);
            return;
        }

        setShowFeedback(true);
        setFeedbackLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/performances/${performanceId}/feedback`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch AI feedback');

            const data = await response.json();
            setAiFeedback(data.feedback);

        } catch (err) {
            console.error(err);
            setAiFeedback("Sorry, we couldn't generate feedback at this moment. Please try again.");
        } finally {
            setFeedbackLoading(false);
        }
    };

    const handleClose = () => {
        setShowFeedback(false);
        setAiFeedback('');
        if (onClose) onClose();
    };

    // Loading State
    if (isLoading) {
        return (
            <Dialog
                open={open}
                PaperProps={{
                    sx: {
                        borderRadius: 6,
                        p: 6,
                        background: 'rgba(255, 255, 255, 0.98)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 24px 64px rgba(102, 126, 234, 0.3)',
                        maxWidth: 500
                    }
                }}
            >
                <Stack spacing={4} alignItems="center">
                    <Box sx={{ display: 'flex', gap: 1.5, height: 100, alignItems: 'center' }}>
                        {[0, 1, 2, 3, 4].map((i) => (
                            <Box
                                key={i}
                                sx={{
                                    width: 14,
                                    height: '100%',
                                    borderRadius: 8,
                                    background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
                                    animation: 'musicWave 1.2s ease-in-out infinite',
                                    animationDelay: `${i * 0.15}s`
                                }}
                            />
                        ))}
                    </Box>
                    <Box>
                        <Typography variant="h4" sx={{
                            background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: 800,
                            textAlign: 'center',
                            mb: 1
                        }}>
                            Analyzing Performance
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
                            Calculating pitch accuracy and timing
                        </Typography>
                    </Box>
                </Stack>
            </Dialog>
        );
    }

    // Results State - Production-level design
    return (
        <Dialog
            open={open && !isLoading}
            onClose={handleClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 4,
                    boxShadow: '0 24px 64px rgba(0,0,0,0.2)'
                }
            }}
        >
            <DialogTitle
                sx={{
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    py: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <Box sx={{ flex: 1 }} />
                <Typography variant="h5" fontWeight="bold">
                    📊 Performance Analysis
                </Typography>
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <IconButton onClick={handleClose} sx={{ color: 'white' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ mt: 3, px: 4, pb: 2 }}>
                {/* Performance Score Graph */}
                <RecordingScore performanceResults={performanceResults} />

                {/* AI Feedback Section */}
                {!showFeedback ? (
                    <Box sx={{ mt: 4, textAlign: 'center' }}>
                        <Button
                            variant="outlined"
                            size="large"
                            startIcon={<AutoAwesomeIcon />}
                            onClick={handleViewAIFeedback}
                            sx={{
                                borderRadius: 4,
                                px: 4,
                                py: 1.5,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '1rem',
                                borderColor: 'primary.main',
                                borderWidth: 2,
                                color: 'primary.main',
                                '&:hover': {
                                    borderWidth: 2,
                                    borderColor: 'primary.dark',
                                    bgcolor: 'primary.50',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                                },
                                transition: 'all 0.2s'
                            }}
                        >
                            Get AI Performance Feedback
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ mt: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <AutoAwesomeIcon color="primary" />
                            <Typography variant="h6" fontWeight="bold" color="primary.main">
                                AI Performance Analysis
                            </Typography>
                        </Box>

                        {feedbackLoading ? (
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                py: 4,
                                gap: 2,
                                bgcolor: '#f5f9ff',
                                borderRadius: 3,
                                borderLeft: '4px solid #1976d2'
                            }}>
                                <CircularProgress size={40} thickness={4} />
                                <Typography color="text.secondary">
                                    Generating personalized feedback...
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                <Box sx={{
                                    p: 3,
                                    bgcolor: '#f5f9ff',
                                    borderRadius: 3,
                                    borderLeft: '4px solid #1976d2'
                                }}>
                                    <Typography variant="body1" sx={{
                                        fontStyle: 'italic',
                                        lineHeight: 1.7,
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        "{aiFeedback || "No feedback available for this session."}"
                                    </Typography>
                                </Box>
                                <Typography
                                    variant="caption"
                                    display="block"
                                    sx={{
                                        mt: 2,
                                        color: 'text.disabled',
                                        textAlign: 'right'
                                    }}
                                >
                                    Powered by Gemini 2.5 Flash
                                </Typography>
                            </>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
                <Button
                    onClick={handleClose}
                    variant="contained"
                    size="large"
                    sx={{
                        borderRadius: 3,
                        px: 5,
                        py: 1.2,
                        fontWeight: 700,
                        textTransform: 'none'
                    }}
                >
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AnalysisDialog;
