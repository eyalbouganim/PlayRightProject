// src/Pages/Recording/components/NoteDisplay.jsx
import { Box, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';
import React from 'react';
const NoteDisplay = ({ notes }) => {
    // Get last 10 notes for display
    const recentNotes = notes.slice(-10).reverse();

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6">Detected Notes</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Total: {notes.length}
            </Typography>
            <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
                {recentNotes.length === 0 ? (
                    <ListItem>
                        <ListItemText primary="No notes detected yet..." />
                    </ListItem>
                ) : (
                    recentNotes.map((note, index) => (
                        <React.Fragment key={index}>
                            <ListItem>
                                <ListItemText
                                    primary={
                                        <Typography component="span" variant="body1" sx={{ fontWeight: 'bold' }}>
                                            {note.note}
                                        </Typography>
                                    }
                                    secondary={
                                        // Defensive check to prevent crashes if properties are missing
                                        `at ${typeof note.start_time === 'number' ? note.start_time.toFixed(2) : 'N/A'}s ` +
                                        `for ${typeof note.duration === 'number' ? note.duration.toFixed(2) : 'N/A'}s`
                                    }
                                />
                            </ListItem>
                            {index < recentNotes.length - 1 && <Divider component="li" />}
                        </React.Fragment>
                    ))
                )}
            </List>
        </Box>
    );
};

export default NoteDisplay;