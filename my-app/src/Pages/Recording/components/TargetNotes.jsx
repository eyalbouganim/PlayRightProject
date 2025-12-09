// src/Pages/Recording/components/TargetNotes.jsx

import React from 'react';
import { Paper, Typography, Stack, Box } from '@mui/material';

const TargetNotes = ({ song, currentTargetNoteIndex, noteStatuses }) => {
    // If no song is provided, render nothing to avoid errors.
    if (!song) return null;

    const statuses = noteStatuses || new Array(song.length).fill('pending');

    const getStatusColor = (status) => {
        switch (status) {
            case 'correct':
                return 'success.main';
            case 'incorrect':
                return 'error.main';
            default:
                return 'grey.700';
        }
    };

    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" align="center" gutterBottom>
                Twinkle, Twinkle, Little Star
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                {song.map((note, index) => (
                    <Box
                        key={index}
                        sx={{
                            width: 50,
                            height: 50,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: getStatusColor(statuses[index]),
                            color: 'white',
                            borderRadius: 1,
                            fontWeight: 'bold',
                            border: index === currentTargetNoteIndex ? '3px solid' : 'none',
                            borderColor: 'primary.main',
                            boxSizing: 'border-box',
                        }}
                    >
                        {note.name}
                    </Box>
                ))}
            </Stack>
        </Paper>
    );
};

export default TargetNotes;