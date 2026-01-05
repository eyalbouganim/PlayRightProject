import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

const About = () => {
    return (
        <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
            <Paper sx={{ 
                p: 4, 
                bgcolor: 'rgba(255, 255, 255, 0.7)', 
                backdropFilter: 'blur(20px)',
                borderRadius: 4 
            }}>
                <Typography variant="h3" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    About PlayRight
                </Typography>
                <Typography variant="h6" color="text.secondary" paragraph>
                    Master your instrument with intelligent feedback.
                </Typography>
                <Typography paragraph>
                    PlayRight was built to bridge the gap between solo practice and professional guidance. 
                    Using advanced audio processing, we listen to your playing in real-time and provide instant 
                    feedback on pitch and rhythm.
                </Typography>
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        The Team
                    </Typography>
                    <Typography variant="body1">
                        Created by Eyal Bouganim.
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
};

export default About;