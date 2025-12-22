import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Container, Paper, useTheme } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import BarChartIcon from '@mui/icons-material/BarChart';

const Home = () => {
    const navigate = useNavigate();
    const theme = useTheme();

    const handlePracticeClick = () => {
        navigate('/recording');
    };

    const handleStatisticsClick = () => {
        navigate('/statistics');
    };

    return (
        <Box
            component="main"
            sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '100vh',
                py: 8,
                bgcolor: 'background.default'
            }}
        >
            <Container maxWidth="lg">
                <Box sx={{ textAlign: 'center', mb: 8 }}>
                    <Typography
                        variant="h2"
                        component="h1"
                        sx={{
                            fontWeight: 800,
                            background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.02em',
                            mb: 2,
                            filter: 'drop-shadow(0 4px 6px rgba(25, 118, 210, 0.4))',
                        }}
                    >
                        PlayRight
                    </Typography>
                    <Typography
                        variant="h5"
                        color="text.secondary"
                        sx={{ fontWeight: 600, maxWidth: '600px', mx: 'auto' }}
                    >
                        Master your instrument with intelligent feedback and progress tracking.
                    </Typography>
                </Box>

                {/* --- FLEXBOX CONTAINER --- */}
                <Box
                    sx={{
                        display: 'flex',
                        // 'column' for mobile (xs), 'row' for tablet/desktop (md)
                        flexDirection: { xs: 'column', md: 'row' },
                        // gap puts space between the cards
                        gap: 4,
                        // Center the items horizontally
                        justifyContent: 'center',
                        // Ensure they are the same height
                        alignItems: 'stretch', 
                    }}
                >
                    {/* Practice Card */}
                    <Paper
                        elevation={0}
                        sx={{
                            // Make the card flexible. 
                            // On desktop, it takes 1 unit of space (flex: 1).
                            // width: '100%' ensures it fills the flex container on mobile.
                            flex: 1,
                            width: '100%', 
                            p: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            bgcolor: 'rgba(255, 255, 255, 0.7)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.5)',
                            borderRadius: 4,
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            cursor: 'pointer',
                            '&:hover': {
                                transform: 'translateY(-8px) scale(1.02)',
                                boxShadow: '0 20px 50px rgba(25, 118, 210, 0.25)',
                                borderColor: 'primary.main',
                                bgcolor: 'rgba(255, 255, 255, 0.9)',
                            },
                        }}
                        onClick={handlePracticeClick}
                    >
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: '50%',
                                bgcolor: 'primary.light',
                                color: 'primary.contrastText',
                                mb: 3,
                                opacity: 0.9
                            }}
                        >
                            <MusicNoteIcon fontSize="large" />
                        </Box>
                        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
                            Practice
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, flexGrow: 1 }}>
                            Start a recording session. Get real-time analysis on your pitch, rhythm, and tempo.
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            fullWidth
                            sx={{
                                borderRadius: '50px',
                                py: 1.5,
                                fontSize: '1.1rem',
                                textTransform: 'none',
                                fontWeight: 600
                            }}
                        >
                            Start Session
                        </Button>
                    </Paper>

                    {/* Statistics Card */}
                    <Paper
                        elevation={0}
                        sx={{
                            flex: 1,
                            width: '100%',
                            p: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            bgcolor: 'rgba(255, 255, 255, 0.7)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.5)',
                            borderRadius: 4,
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            cursor: 'pointer',
                            '&:hover': {
                                transform: 'translateY(-8px) scale(1.02)',
                                boxShadow: '0 20px 50px rgba(25, 118, 210, 0.25)',
                                borderColor: 'primary.main',
                                bgcolor: 'rgba(255, 255, 255, 0.9)',
                            },
                        }}
                        onClick={handleStatisticsClick}
                    >
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: '50%',
                                bgcolor: 'action.selected',
                                color: 'primary.main',
                                mb: 3,
                            }}
                        >
                            <BarChartIcon fontSize="large" />
                        </Box>
                        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
                            Statistics
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, flexGrow: 1 }}>
                            Visualize your progress. Review past sessions and identify areas for improvement.
                        </Typography>
                        <Button
                            variant="outlined"
                            size="large"
                            fullWidth
                            sx={{
                                borderRadius: '50px',
                                py: 1.5,
                                fontSize: '1.1rem',
                                textTransform: 'none',
                                fontWeight: 600,
                                borderWidth: 2,
                                '&:hover': { borderWidth: 2 }
                            }}
                        >
                            View Dashboard
                        </Button>
                    </Paper>
                </Box>
            </Container>
        </Box>
    );
};

export default Home;