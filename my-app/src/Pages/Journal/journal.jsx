import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Box,
    Container,
    Paper,
    Typography,
    TextField,
    Checkbox,
    Card,
    CardContent,
    IconButton,
    Tooltip,
    Chip,
    Stack,
    CircularProgress,
    Alert,
    Slider,
    Button
} from '@mui/material';
import {
    EmojiEvents as TrophyIcon,
    Whatshot as FireIcon,
    CheckCircle as CheckCircleIcon,
    RadioButtonUnchecked as UncheckedIcon,
    PlayArrow as PlayIcon,
    Pause as PauseIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    MusicNote as MusicNoteIcon,
    Star as StarIcon,
    ExpandMore as ExpandMoreIcon,
    AutoGraph as AutoGraphIcon,
    NoteAlt as NoteIcon,
    Add as AddIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import Confetti from 'react-confetti';

const PAGE_SIZE = 5;

// --- Helper Functions ---

const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const generateHeatmapFromPerformances = (performances) => {
    const today = new Date();
    const data = [];
    const dateMap = new Map();

    performances.forEach(perf => {
        const date = new Date(perf.createdAt).toDateString();
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    for (let i = 111; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const count = dateMap.get(date.toDateString()) || 0;
        let intensity = 0;
        if (count === 1) intensity = 1;
        else if (count === 2) intensity = 2;
        else if (count === 3) intensity = 3;
        else if (count >= 4) intensity = 4;
        data.push({ date: date.toDateString(), intensity, count });
    }

    return data;
};

const calculateStreak = (performances) => {
    if (!performances.length) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const practiceDays = new Set(
        performances.map(p => {
            const d = new Date(p.createdAt);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        })
    );

    let streak = 0;
    let checkDate = new Date(today);

    if (!practiceDays.has(checkDate.getTime())) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (practiceDays.has(checkDate.getTime())) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
};

// --- Components ---

const HeatmapSquare = ({ date, intensity, count }) => {
    const colors = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
    return (
        <Tooltip title={`${date}: ${count} session${count !== 1 ? 's' : ''}`}>
            <Box
                sx={{
                    width: 10,
                    height: 10,
                    bgcolor: colors[intensity],
                    borderRadius: '2px',
                    m: '1px',
                    border: '1px solid rgba(255,255,255,0.03)',
                    '&:hover': {
                        transform: 'scale(1.3)',
                        boxShadow: '0 0 6px rgba(57, 211, 83, 0.5)'
                    }
                }}
            />
        </Tooltip>
    );
};

const ContributionHeatmap = ({ heatmapData }) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{
                display: 'grid',
                gridTemplateRows: 'repeat(7, 1fr)',
                gridAutoFlow: 'column',
                gap: '1px',
                p: 1.5,
                bgcolor: '#0d1117',
                borderRadius: 2
            }}>
                {heatmapData.map((day, index) => (
                    <HeatmapSquare key={index} date={day.date} intensity={day.intensity} count={day.count} />
                ))}
            </Box>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Less</Typography>
                {[0, 1, 2, 3, 4].map(i => (
                    <Box key={i} sx={{ width: 8, height: 8, bgcolor: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'][i], borderRadius: '2px' }} />
                ))}
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>More</Typography>
            </Stack>
        </Box>
    );
};

// Lazy audio player
const AudioPlayer = ({ audioFilePath }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    const audioUrl = audioFilePath ? `http://localhost:3001/${audioFilePath}` : null;

    useEffect(() => {
        if (!isLoaded) return;
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => setDuration(audio.duration);
        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [isLoaded]);

    const togglePlay = () => {
        if (!isLoaded) {
            setIsLoaded(true);
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.play();
                    setIsPlaying(true);
                }
            }, 100);
            return;
        }
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (_, newValue) => {
        if (audioRef.current) {
            audioRef.current.currentTime = newValue;
            setCurrentTime(newValue);
        }
    };

    if (!audioUrl) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2, p: 1.5, mt: 2 }}>
                <MusicNoteIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 16 }} />
                <Typography variant="caption" color="text.disabled">No recording</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(66, 165, 245, 0.05) 100%)',
            borderRadius: 2,
            p: 1.5,
            mt: 2,
            border: '1px solid rgba(25, 118, 210, 0.1)'
        }}>
            {isLoaded && <audio ref={audioRef} src={audioUrl} preload="metadata" />}
            <IconButton
                onClick={togglePlay}
                size="small"
                sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    width: 36,
                    height: 36
                }}
            >
                {isPlaying ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
            </IconButton>
            <Box sx={{ flexGrow: 1, mx: 2 }}>
                <Slider
                    value={currentTime}
                    max={duration || 100}
                    onChange={handleSeek}
                    size="small"
                    disabled={!isLoaded}
                    sx={{ color: 'primary.main', '& .MuiSlider-thumb': { width: 12, height: 12 } }}
                />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', minWidth: 70 }}>
                {formatDuration(currentTime)} / {formatDuration(duration)}
            </Typography>
        </Box>
    );
};

// Personal Best Card
const PersonalBestCard = React.memo(({ perf, notes, editingNoteId, tempNote, setTempNote, handleEditNote, handleSaveNote }) => {
    return (
        <Card
            sx={{
                borderRadius: 3,
                background: 'linear-gradient(145deg, #ffffff 0%, #fefefe 100%)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                boxShadow: '0 4px 20px -8px rgba(255, 193, 7, 0.2)',
                overflow: 'hidden',
                position: 'relative',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: 'linear-gradient(90deg, #ffc107 0%, #ff9800 100%)'
                }
            }}
        >
            <CardContent sx={{ pt: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                            <StarIcon sx={{ color: '#ffc107', fontSize: 20 }} />
                            <Typography variant="h6" fontWeight="700" color="text.primary">
                                {perf.song?.title || 'Unknown Song'}
                            </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            {new Date(perf.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </Typography>
                    </Box>
                    <Box sx={{
                        textAlign: 'center',
                        bgcolor: 'success.main',
                        color: 'white',
                        borderRadius: 2,
                        px: 2,
                        py: 1,
                        minWidth: 70
                    }}>
                        <Typography variant="h5" fontWeight="800" lineHeight={1}>
                            {Math.round(perf.overallScore)}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>SCORE</Typography>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={3} mb={2}>
                    <Box>
                        <Typography variant="caption" color="text.secondary">Pitch</Typography>
                        <Typography variant="body1" fontWeight="600" color="primary.main">
                            {perf.pitchAccuracy ? `${Math.round(perf.pitchAccuracy)}%` : '-'}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">Timing</Typography>
                        <Typography variant="body1" fontWeight="600" color="secondary.main">
                            {perf.timingAccuracy ? `${Math.round(perf.timingAccuracy)}%` : '-'}
                        </Typography>
                    </Box>
                </Stack>

                <AudioPlayer audioFilePath={perf.audioFilePath} />

                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight="600">NOTES</Typography>
                        {editingNoteId === perf.id ? (
                            <IconButton size="small" onClick={() => handleSaveNote(perf.id)} sx={{ bgcolor: 'primary.main', color: 'white', width: 28, height: 28, '&:hover': { bgcolor: 'primary.dark' } }}>
                                <SaveIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        ) : (
                            <IconButton size="small" onClick={() => handleEditNote(perf)}>
                                <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        )}
                    </Stack>
                    {editingNoteId === perf.id ? (
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            variant="outlined"
                            size="small"
                            placeholder="Add notes about this performance..."
                            value={tempNote}
                            onChange={(e) => setTempNote(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' } }}
                        />
                    ) : (
                        <Typography variant="body2" sx={{ fontStyle: notes[perf.id] ? 'normal' : 'italic', color: notes[perf.id] ? 'text.primary' : 'text.disabled', fontSize: '0.875rem' }}>
                            {notes[perf.id] || "Click edit to add notes."}
                        </Typography>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
});

// Personal Notes Card
const PersonalNoteCard = ({ note, onEdit, onDelete, isEditing, editValue, setEditValue, onSave }) => {
    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: '#fffef5',
                border: '1px solid rgba(255, 193, 7, 0.15)',
                position: 'relative'
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="caption" color="text.secondary">
                    {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Typography>
                <Stack direction="row" spacing={0.5}>
                    {isEditing ? (
                        <IconButton size="small" onClick={onSave} sx={{ bgcolor: 'primary.main', color: 'white', width: 26, height: 26, '&:hover': { bgcolor: 'primary.dark' } }}>
                            <SaveIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                    ) : (
                        <>
                            <IconButton size="small" onClick={onEdit}>
                                <EditIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <IconButton size="small" onClick={onDelete} sx={{ color: 'error.main' }}>
                                <DeleteIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                        </>
                    )}
                </Stack>
            </Stack>
            {isEditing ? (
                <TextField
                    fullWidth
                    multiline
                    rows={2}
                    variant="standard"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    sx={{ mt: 1 }}
                    slotProps={{ input: { disableUnderline: true, sx: { fontSize: '0.9rem' } } }}
                />
            ) : (
                <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                    {note.content}
                </Typography>
            )}
        </Paper>
    );
};

const Journal = () => {
    const [performances, setPerformances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination
    const [bestsVisible, setBestsVisible] = useState(PAGE_SIZE);

    // Weekly Goal
    const [weeklyGoal, setWeeklyGoal] = useState(() => localStorage.getItem('playright_weekly_goal') || 'Master the F-major Arpeggio');
    const [goalAchieved, setGoalAchieved] = useState(() => localStorage.getItem('playright_goal_achieved') === 'true');
    const [showConfetti, setShowConfetti] = useState(false);

    // Performance Notes
    const [perfNotes, setPerfNotes] = useState(() => {
        const saved = localStorage.getItem('playright_performance_notes');
        return saved ? JSON.parse(saved) : {};
    });
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [tempNote, setTempNote] = useState('');

    // Personal Notes (general)
    const [personalNotes, setPersonalNotes] = useState(() => {
        const saved = localStorage.getItem('playright_personal_notes');
        return saved ? JSON.parse(saved) : [];
    });
    const [newNoteText, setNewNoteText] = useState('');
    const [editingPersonalNoteId, setEditingPersonalNoteId] = useState(null);
    const [editingPersonalNoteValue, setEditingPersonalNoteValue] = useState('');

    useEffect(() => {
        const fetchPerformances = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('User not authenticated');
                    setLoading(false);
                    return;
                }

                const response = await fetch('http://localhost:3001/api/performances/stats/user', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error('Failed to fetch performances');
                const data = await response.json();
                setPerformances(data);
                setLoading(false);
            } catch (err) {
                console.error('Error:', err);
                setError('Failed to load your journal.');
                setLoading(false);
            }
        };
        fetchPerformances();
    }, []);

    // Persist to localStorage
    useEffect(() => { localStorage.setItem('playright_weekly_goal', weeklyGoal); }, [weeklyGoal]);
    useEffect(() => { localStorage.setItem('playright_goal_achieved', goalAchieved.toString()); }, [goalAchieved]);
    useEffect(() => { localStorage.setItem('playright_performance_notes', JSON.stringify(perfNotes)); }, [perfNotes]);
    useEffect(() => { localStorage.setItem('playright_personal_notes', JSON.stringify(personalNotes)); }, [personalNotes]);

    // Memoized values
    const heatmapData = useMemo(() => generateHeatmapFromPerformances(performances), [performances]);
    const currentStreak = useMemo(() => calculateStreak(performances), [performances]);
    const personalBests = useMemo(() =>
        performances.filter(p => (p.overallScore || 0) > 85).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        [performances]
    );
    const avgScore = useMemo(() =>
        performances.length > 0 ? Math.round(performances.reduce((acc, p) => acc + (p.overallScore || 0), 0) / performances.length) : 0,
        [performances]
    );

    const visibleBests = personalBests.slice(0, bestsVisible);

    const handleGoalCheck = (e) => {
        const checked = e.target.checked;
        setGoalAchieved(checked);
        if (checked) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 5000);
        }
    };

    const handleEditNote = (perf) => {
        setEditingNoteId(perf.id);
        setTempNote(perfNotes[perf.id] || '');
    };

    const handleSaveNote = (id) => {
        setPerfNotes(prev => ({ ...prev, [id]: tempNote }));
        setEditingNoteId(null);
    };

    // Personal Notes handlers
    const handleAddPersonalNote = () => {
        if (!newNoteText.trim()) return;
        const newNote = { id: Date.now(), content: newNoteText.trim(), createdAt: new Date().toISOString() };
        setPersonalNotes(prev => [newNote, ...prev]);
        setNewNoteText('');
    };

    const handleEditPersonalNote = (note) => {
        setEditingPersonalNoteId(note.id);
        setEditingPersonalNoteValue(note.content);
    };

    const handleSavePersonalNote = () => {
        setPersonalNotes(prev => prev.map(n => n.id === editingPersonalNoteId ? { ...n, content: editingPersonalNoteValue } : n));
        setEditingPersonalNoteId(null);
    };

    const handleDeletePersonalNote = (id) => {
        setPersonalNotes(prev => prev.filter(n => n.id !== id));
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress size={48} />
            </Box>
        );
    }

    if (error) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4 }}>
                <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
            </Container>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa', pb: 8 }}>
            {showConfetti && <Confetti numberOfPieces={400} recycle={false} />}

            <Container maxWidth="xl" sx={{ pt: 4 }}>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h3" fontWeight="800" sx={{
                        background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Your Journal
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                        Track goals, celebrate achievements, and reflect on your progress
                    </Typography>
                </Box>

                {/* Main Layout */}
                <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', lg: 'row' } }}>

                    {/* LEFT: Whiteboard */}
                    <Box sx={{ width: { xs: '100%', lg: 340 }, flexShrink: 0 }}>
                        <Box sx={{ position: { lg: 'sticky' }, top: 24 }}>
                            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: 'white', border: '1px solid rgba(0,0,0,0.06)', mb: 3 }}>
                                <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                                    <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', display: 'flex' }}>
                                        <FireIcon sx={{ color: 'white', fontSize: 22 }} />
                                    </Box>
                                    <Typography variant="h6" fontWeight="700">The Whiteboard</Typography>
                                </Stack>

                                {/* Weekly Goal */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="overline" color="text.secondary" fontWeight="600">Weekly Goal</Typography>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            mt: 1,
                                            bgcolor: '#fffde7',
                                            borderRadius: 2,
                                            border: '1px solid rgba(255, 193, 7, 0.2)',
                                            position: 'relative'
                                        }}
                                    >
                                        {goalAchieved && (
                                            <Box sx={{ position: 'absolute', top: -8, right: -8, bgcolor: '#4caf50', borderRadius: '50%', p: 0.3 }}>
                                                <CheckCircleIcon sx={{ color: 'white', fontSize: 20 }} />
                                            </Box>
                                        )}
                                        <TextField
                                            fullWidth
                                            variant="standard"
                                            multiline
                                            value={weeklyGoal}
                                            onChange={(e) => { setWeeklyGoal(e.target.value); setGoalAchieved(false); }}
                                            slotProps={{
                                                input: {
                                                    disableUnderline: true,
                                                    sx: { fontSize: '0.95rem', textDecoration: goalAchieved ? 'line-through' : 'none', color: goalAchieved ? 'text.secondary' : 'text.primary' }
                                                }
                                            }}
                                        />
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                            <Tooltip title={goalAchieved ? "Reset" : "Mark achieved"}>
                                                <Checkbox
                                                    icon={<UncheckedIcon />}
                                                    checkedIcon={<CheckCircleIcon sx={{ color: '#4caf50' }} />}
                                                    checked={goalAchieved}
                                                    onChange={handleGoalCheck}
                                                />
                                            </Tooltip>
                                        </Box>
                                    </Paper>
                                </Box>

                                {/* Streak */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="overline" color="text.secondary" fontWeight="600">Practice Streak</Typography>
                                    <Paper variant="outlined" sx={{ p: 2, mt: 1, borderRadius: 2, borderColor: 'rgba(0,0,0,0.08)' }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                            <Typography variant="body2" fontWeight="600" color="text.secondary">Current</Typography>
                                            <Chip
                                                label={`${currentStreak} Day${currentStreak !== 1 ? 's' : ''}`}
                                                size="small"
                                                sx={{ fontWeight: 'bold', bgcolor: currentStreak > 0 ? 'success.main' : 'grey.200', color: currentStreak > 0 ? 'white' : 'text.secondary' }}
                                                icon={<FireIcon sx={{ color: currentStreak > 0 ? 'white !important' : 'inherit', fontSize: '16px !important' }} />}
                                            />
                                        </Stack>
                                        <ContributionHeatmap heatmapData={heatmapData} />
                                    </Paper>
                                </Box>

                                {/* Stats */}
                                <Box sx={{ pt: 2, borderTop: '1px solid rgba(0,0,0,0.06)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, textAlign: 'center' }}>
                                    <Box>
                                        <Typography variant="h5" fontWeight="800" color="primary.main">{performances.length}</Typography>
                                        <Typography variant="caption" color="text.secondary">Sessions</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="h5" fontWeight="800" sx={{ color: '#ffc107' }}>{personalBests.length}</Typography>
                                        <Typography variant="caption" color="text.secondary">Bests</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="h5" fontWeight="800" color="success.main">{avgScore}%</Typography>
                                        <Typography variant="caption" color="text.secondary">Avg</Typography>
                                    </Box>
                                </Box>
                            </Paper>

                            {/* Personal Notes */}
                            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: 'white', border: '1px solid rgba(0,0,0,0.06)' }}>
                                <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                                    <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)', display: 'flex' }}>
                                        <NoteIcon sx={{ color: 'white', fontSize: 22 }} />
                                    </Box>
                                    <Typography variant="h6" fontWeight="700">Personal Notes</Typography>
                                </Stack>

                                {/* Add new note */}
                                <Box sx={{ mb: 2 }}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={2}
                                        placeholder="Write a thought, idea, or reflection..."
                                        value={newNoteText}
                                        onChange={(e) => setNewNoteText(e.target.value)}
                                        variant="outlined"
                                        size="small"
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.9rem' } }}
                                    />
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={handleAddPersonalNote}
                                        disabled={!newNoteText.trim()}
                                        sx={{ mt: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                    >
                                        Add Note
                                    </Button>
                                </Box>

                                {/* Notes list */}
                                <Stack spacing={1.5} sx={{ maxHeight: 300, overflowY: 'auto' }}>
                                    {personalNotes.length === 0 ? (
                                        <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>
                                            No notes yet. Start journaling!
                                        </Typography>
                                    ) : (
                                        personalNotes.map(note => (
                                            <PersonalNoteCard
                                                key={note.id}
                                                note={note}
                                                onEdit={() => handleEditPersonalNote(note)}
                                                onDelete={() => handleDeletePersonalNote(note.id)}
                                                isEditing={editingPersonalNoteId === note.id}
                                                editValue={editingPersonalNoteValue}
                                                setEditValue={setEditingPersonalNoteValue}
                                                onSave={handleSavePersonalNote}
                                            />
                                        ))
                                    )}
                                </Stack>
                            </Paper>
                        </Box>
                    </Box>

                    {/* RIGHT: Personal Bests */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        {personalBests.length > 0 ? (
                            <Box>
                                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                                    <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)', display: 'flex' }}>
                                        <TrophyIcon sx={{ color: 'white' }} />
                                    </Box>
                                    <Typography variant="h5" fontWeight="700">Personal Bests</Typography>
                                    <Chip label={`${personalBests.length} achievements`} size="small" sx={{ bgcolor: 'rgba(255, 193, 7, 0.15)', color: '#f57c00', fontWeight: 600 }} />
                                </Stack>

                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 3 }}>
                                    {visibleBests.map((perf) => (
                                        <PersonalBestCard
                                            key={perf.id}
                                            perf={perf}
                                            notes={perfNotes}
                                            editingNoteId={editingNoteId}
                                            tempNote={tempNote}
                                            setTempNote={setTempNote}
                                            handleEditNote={handleEditNote}
                                            handleSaveNote={handleSaveNote}
                                        />
                                    ))}
                                </Box>

                                {bestsVisible < personalBests.length && (
                                    <Box sx={{ textAlign: 'center', mt: 4 }}>
                                        <Button
                                            variant="outlined"
                                            onClick={() => setBestsVisible(prev => prev + PAGE_SIZE)}
                                            endIcon={<ExpandMoreIcon />}
                                            sx={{ borderRadius: 3, px: 4, textTransform: 'none', fontWeight: 600, borderColor: 'rgba(255, 193, 7, 0.5)', color: '#f57c00' }}
                                        >
                                            Show More ({personalBests.length - bestsVisible} remaining)
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 12, px: 4, bgcolor: 'white', borderRadius: 4, border: '1px dashed rgba(0,0,0,0.1)' }}>
                                <AutoGraphIcon sx={{ fontSize: 80, color: 'primary.light', mb: 3 }} />
                                <Typography variant="h5" color="text.secondary" fontWeight="600" gutterBottom>
                                    Your journey starts here
                                </Typography>
                                <Typography variant="body1" color="text.disabled" sx={{ maxWidth: 400, mx: 'auto' }}>
                                    Score above 85% to earn a spot in your Personal Bests. Keep practicing!
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Container>
        </Box>
    );
};

export default Journal;
