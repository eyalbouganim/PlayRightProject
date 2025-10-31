import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Typography, Button } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

const Home = () => {
    const navigate = useNavigate();

    const handlePracticeClick = () => {
        navigate('/recording');
    };

    return (
        <Container
            component="main"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-around', // Pushes title up and button down
                minHeight: '100vh',
                textAlign: 'center',
                py: 4, // Padding on top and bottom
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
        </Container>
    );
};

export default Home;