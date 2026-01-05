import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Typography,
    Box,
    Alert,
    TextField,
    InputAdornment,
    IconButton,
    Avatar,
    Skeleton,
    Stack,
    useTheme,
    alpha
} from '@mui/material';
import {
    Search as SearchIcon,
    Close as CloseIcon,
    MusicNote as MusicNoteIcon,
    LibraryMusic as LibraryMusicIcon,
    ChevronRight as ChevronRightIcon
} from '@mui/icons-material';

const SongRetriever = ({ open, onClose, onSongSelected, token }) => {
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const theme = useTheme();

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

    // Filter songs based on search term
    const filteredSongs = songs.filter(song => 
        song.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
        <Dialog 
            open={open} 
            onClose={onClose} 
            fullWidth 
            maxWidth="sm"
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    overflow: 'hidden',
                    maxHeight: '80vh',
                    boxShadow: 24
                }
            }}
        >
            {/* Header */}
            <Box sx={{ 
                px: 3, 
                py: 2, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                bgcolor: 'primary.main',
                color: 'white'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'white', color: 'primary.main', width: 32, height: 32 }}>
                        <LibraryMusicIcon fontSize="small" />
                    </Avatar>
                    <Typography variant="h6" fontWeight="bold" color="inherit">
                        Select a Song
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: 'inherit' }}>
                    <CloseIcon />
                </IconButton>
            </Box>

            <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '500px' }}>
                {/* Search Bar */}
                <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #eee' }}>
                    <TextField
                        fullWidth
                        placeholder="Search your library..."
                        variant="outlined"
                        size="small"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                            sx: { bgcolor: '#f8f9fa', borderRadius: 2 }
                        }}
                    />
                </Box>

                {/* Content Area */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2, pb: 2 }}>
                    {error && (
                        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {loading ? (
                        <Stack spacing={1} sx={{ mt: 1 }}>
                            {[1, 2, 3, 4].map((i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1 }}>
                                    <Skeleton variant="circular" width={40} height={40} />
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Skeleton variant="text" width="60%" height={24} />
                                        <Skeleton variant="text" width="40%" height={20} />
                                    </Box>
                                </Box>
                            ))}
                        </Stack>
                    ) : (
                        <List sx={{ pt: 1 }}>
                            {filteredSongs.length > 0 ? (
                                filteredSongs.map((song) => (
                                    <ListItem key={song.id} disablePadding sx={{ mb: 1 }}>
                                        <ListItemButton 
                                            onClick={() => handleSongClick(song.id)}
                                            sx={{ 
                                                borderRadius: 2,
                                                border: '1px solid #e0e0e0',
                                                bgcolor: 'white',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    bgcolor: '#e3f2fd',
                                                    borderColor: 'primary.main',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                                                }
                                            }}
                                        >
                                            <Avatar sx={{ 
                                                bgcolor: 'primary.main', 
                                                color: 'white',
                                                mr: 2
                                            }}>
                                                <MusicNoteIcon />
                                            </Avatar>
                                            <ListItemText
                                                primary={
                                                    <Typography variant="subtitle1" fontWeight="600">
                                                        {song.title}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Typography variant="caption" color="text.secondary">
                                                        Added {new Date(song.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </Typography>
                                                }
                                            />
                                            <ChevronRightIcon color="action" fontSize="small" />
                                        </ListItemButton>
                                    </ListItem>
                                ))
                            ) : (
                                <Box sx={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    height: '300px',
                                    opacity: 0.7
                                }}>
                                    <LibraryMusicIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                                    <Typography variant="h6" color="text.secondary">
                                        {searchTerm ? 'No songs found' : 'Your library is empty'}
                                    </Typography>
                                    <Typography variant="body2" color="text.disabled">
                                        {searchTerm ? 'Try a different search term' : 'Upload a MusicXML file to get started'}
                                    </Typography>
                                </Box>
                            )}
                        </List>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default SongRetriever;