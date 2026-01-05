// src/Pages/Recording/components/NoteDisplay.jsx
import { Box, Typography, Chip, Fade } from '@mui/material';
import React from 'react';

const NoteDisplay = ({ notes }) => {
    // Get last 8 notes for display
    const recentNotes = notes.slice(-8);

    return (
        <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 1, 
            height: 48,
            width: '100%',
            bgcolor: 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(5px)',
            borderRadius: 4,
            px: 2
        }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1, fontWeight: 600, letterSpacing: 1 }}>
                DETECTED:
            </Typography>
            
            {recentNotes.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Waiting for input...
                </Typography>
            ) : (
                recentNotes.map((note, index) => (
                    <Fade in={true} key={`${index}-${note.note}`}>
                        <Chip 
                            label={note.note} 
                            size="small" 
                            color={index === recentNotes.length - 1 ? "primary" : "default"}
                            variant={index === recentNotes.length - 1 ? "filled" : "outlined"}
                            sx={{ 
                                fontWeight: 'bold',
                                minWidth: 32,
                                opacity: 0.4 + ((index + 1) / recentNotes.length) * 0.6
                            }} 
                        />
                    </Fade>
                ))
            )}
        </Box>
    );
};

export default NoteDisplay;