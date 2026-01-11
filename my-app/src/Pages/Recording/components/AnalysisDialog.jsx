// /home/eyalb1380/PlayRightProject/my-app/src/Pages/Recording/components/AnalysisDialog.jsx
import React from 'react';
import { Dialog, Stack, Box, Typography } from '@mui/material';

const AnalysisDialog = ({ open }) => {
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
};

export default AnalysisDialog;
