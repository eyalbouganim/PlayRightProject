import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardMedia,
    CardContent,
    CardActions,
    Button,
    Chip,
    TextField,
    InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useNavigate } from 'react-router-dom';

const DEFAULT_IMAGE = "https://waryhub.com/files/preview/960x960/11749650502uvhmelowysrqtxsoyzpvw3uqchrr3vmihvw05bl9ixktf4y9bqdcmkiyobwnduei45gztuskbzt249bqqij0ftlnqcrqsjue8cvd.png";

const MusicLibrary = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [songs, setSongs] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch('http://localhost:3001/api/songs', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch songs');
                }
                return response.json();
            })
            .then(data => setSongs(Array.isArray(data) ? data : []))
            .catch(error => {
                console.error('Error fetching songs:', error);
                setSongs([]);
            });
    }, []);

    const handlePractice = (songId) => {
        navigate('/recording', { state: { songId } });
    };

    const filteredSongs = songs.filter(song => {
        if (!searchTerm.trim()) return true;
        const search = searchTerm.toLowerCase();
        const title = (song.title || '').toLowerCase();
        const composer = (song.composer || '').toLowerCase();
        return title.includes(search) || composer.includes(search);
    });

    const getDifficultyColor = (difficulty) => {
        switch(difficulty) {
            case 'Easy': return 'success';
            case 'Medium': return 'warning';
            case 'Hard': return 'error';
            default: return 'default';
        }
    };

    return (
        <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
            <Container maxWidth="lg">
                <Box sx={{ textAlign: 'center', mb: 6 }}>
                    <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
                        Music Library
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                        Browse our collection of sheet music and start practicing.
                        It's up to you to add more songs to the library!
                    </Typography>
                    
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        maxWidth: '500px',
                        mx: 'auto'
                    }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Search by title or composer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.8)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: 2,
                                '& .MuiOutlinedInput-root': { borderRadius: 2 }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>
                </Box>

                {filteredSongs.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="h6" color="text.secondary">
                            {searchTerm ? `No songs found for "${searchTerm}"` : 'No songs available'}
                        </Typography>
                    </Box>
                ) : (
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)'
                    },
                    gap: 4
                }}>
                    {filteredSongs.map((song) => (
                            <Card 
                                key={song.id}
                                sx={{ 
                                    height: '100%', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    borderRadius: 4,
                                    bgcolor: 'rgba(255, 255, 255, 0.7)',
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(255, 255, 255, 0.5)',
                                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
                                    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                                    '&:hover': { 
                                        transform: 'translateY(-8px)', 
                                        boxShadow: '0 20px 50px rgba(25, 118, 210, 0.25)' 
                                    }
                                }}
                            >
                                <CardMedia
                                    component="img"
                                    height="200"
                                    image={song.image || DEFAULT_IMAGE}
                                    alt={song.title}
                                />
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography gutterBottom variant="h6" component="h2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                            {song.title}
                                        </Typography>
                                        <Chip 
                                            label={song.difficulty} 
                                            color={getDifficultyColor(song.difficulty)} 
                                            size="small" 
                                            variant="outlined"
                                            sx={{ fontWeight: 600 }}
                                        />
                                    </Box>
                                    <Typography variant="subtitle2" color="primary.main" gutterBottom>
                                        {song.composer}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        {song.description}
                                    </Typography>
                                </CardContent>
                                <CardActions sx={{ p: 2, pt: 0 }}>
                                    <Button size="small" startIcon={<PlayArrowIcon />}>
                                        Preview
                                    </Button>
                                    <Button 
                                        size="small" 
                                        variant="contained" 
                                        startIcon={<MusicNoteIcon />}
                                        onClick={() => handlePractice(song.id)}
                                        sx={{ ml: 'auto', borderRadius: 20, textTransform: 'none', fontWeight: 600 }}
                                    >
                                        Practice
                                    </Button>
                                </CardActions>
                            </Card>
                    ))}
                </Box>
                )}
            </Container>
        </Box>
    );
};

export default MusicLibrary;