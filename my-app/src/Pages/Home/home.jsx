import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import BarChartIcon from '@mui/icons-material/BarChart';

const Home = () => {
    const navigate = useNavigate();

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
                width: '100%',
                flexGrow: 1, // Make the box fill the remaining vertical space
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-around', // Pushes title up and button down, vertically
                textAlign: 'center',
                p: { xs: 2, sm: 4, md: 6 }, // Adjusted responsive padding
            }}
        >
            <Box>
                <Typography
                    variant="h1"
                    component="h1"
                    sx={{
                        fontWeight: 700,
                        color: 'primary.main', // Using the light blue from your theme
                        textShadow: '2px 2px 10px rgba(0,0,0,0.6)',
                        letterSpacing: '0.05em',
                    }}
                >
                    PlayRight
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 4 }}>
                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handlePracticeClick}
                    startIcon={<MusicNoteIcon />}
                    sx={{
                        padding: '15px 40px',
                        fontSize: '1.2rem',
                        borderRadius: '50px', // Pill shape button
                        boxShadow: (theme) => `0 4px 20px ${theme.palette.primary.main}60`, // Glow effect
                    }}
                >
                    Go to Practice
                </Button>

                <Button
                    variant="outlined"
                    color="primary"
                    size="large"
                    onClick={handleStatisticsClick}
                    startIcon={<BarChartIcon />}
                    sx={{
                        padding: '15px 40px',
                        fontSize: '1.2rem',
                        borderRadius: '50px', // Pill shape button
                        borderWidth: '2px',
                        '&:hover': { borderWidth: '2px' }
                    }}
                >
                    View Statistics
                </Button>
            </Box>
        </Box>
    );
};

export default Home;