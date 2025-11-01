import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Typography,
    CircularProgress,
    Box,
    Alert
} from '@mui/material';

const SongRetriever = ({ open, onClose, onSongSelected, token }) => {
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open) {
            const fetchSongs = async () => {
                setLoading(true);
                setError(null);
                try {
                    const response = await fetch('http://localhost:3001/api/songs', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Failed to fetch songs. Please try again later.');
                    }

                    const data = await response.json();
                    setSongs(data);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };

            fetchSongs();
        }
    }, [open, token]);

    const handleSongClick = async (songId) => {
        try {
            const response = await fetch(`http://localhost:3001/api/songs/${songId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load the selected song.');
            }

            const songData = await response.json();
            onSongSelected(songData); // Pass the full song object back
            onClose(); // Close the dialog
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Load a Song</DialogTitle>
            <DialogContent>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress />
                    </Box>
                )}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {!loading && !error && (
                    <List>
                        {songs.length > 0 ? (
                            songs.map((song) => (
                                <ListItem key={song.id} disablePadding>
                                    <ListItemButton onClick={() => handleSongClick(song.id)}>
                                        <ListItemText
                                            primary={song.title}
                                            secondary={`Uploaded on: ${new Date(song.createdAt).toLocaleDateString()}`}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))
                        ) : (
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ my: 2 }}>
                                You haven't uploaded any songs yet.
                            </Typography>
                        )}
                    </List>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default SongRetriever;