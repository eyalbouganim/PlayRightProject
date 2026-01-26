import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import SchoolIcon from '@mui/icons-material/School';

const About = () => {
    return (
        <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
            <Paper sx={{
                p: 4,
                bgcolor: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(20px)',
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
                <Typography variant="h3" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    About PlayRight
                </Typography>
                <Typography variant="h5" color="text.secondary" paragraph sx={{ fontStyle: 'italic' }}>
                    Master your instrument with intelligent feedback.
                </Typography>

                <Typography paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
                    PlayRight was built to bridge the gap between solo practice and professional guidance.
                    Using advanced audio processing, we listen to your playing and analyze it using
                    state-of-the-art AI technology.
                </Typography>

                <Box sx={{ mt: 4, mb: 3 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Two Modes to Master Your Craft
                    </Typography>
                </Box>

                {/* Performance Mode */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    mb: 3,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'rgba(244, 67, 54, 0.08)',
                    border: '1px solid rgba(244, 67, 54, 0.2)'
                }}>
                    <Box sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: '#f44336',
                        color: 'white',
                        mr: 2,
                        display: 'flex'
                    }}>
                        <MicIcon />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#f44336', mb: 0.5 }}>
                            1. Performance Mode
                        </Typography>
                        <Typography sx={{ color: 'text.secondary' }}>
                            Rock your performances and get a detailed analysis and grade using our flagship
                            PlayRight model. This mode provides comprehensive feedback on your playing,
                            so you might want to concentrate here!
                        </Typography>
                    </Box>
                </Box>

                {/* Learning Mode */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    mb: 4,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'rgba(76, 175, 80, 0.08)',
                    border: '1px solid rgba(76, 175, 80, 0.2)'
                }}>
                    <Box sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: '#4caf50',
                        color: 'white',
                        mr: 2,
                        display: 'flex'
                    }}>
                        <SchoolIcon />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#4caf50', mb: 0.5 }}>
                            2. Learning Mode
                        </Typography>
                        <Typography sx={{ color: 'text.secondary' }}>
                            Practice the basics with live note detection, right on the spot! This mode helps
                            you learn fundamental scales and exercises. Play the right note, and our cursor
                            advances until you complete the exercise.
                        </Typography>
                    </Box>
                </Box>

                <Typography
                    variant="h5"
                    sx={{
                        textAlign: 'center',
                        fontWeight: 700,
                        color: 'primary.main',
                        mt: 4,
                        mb: 2
                    }}
                >
                    Keep Rockin'!
                </Typography>

                <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                        Created by Eyal Bouganim
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
};

export default About;