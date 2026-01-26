import React, { useState, useEffect, useMemo } from 'react';
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
    Button
} from '@mui/material';
import {
    EmojiEvents as TrophyIcon,
    Whatshot as FireIcon,
    CheckCircle as CheckCircleIcon,
    RadioButtonUnchecked as UncheckedIcon,
    ExpandMore as ExpandMoreIcon,
    AutoGraph as AutoGraphIcon,
    NoteAlt as NoteIcon,
    Add as AddIcon,
    Lightbulb as WishIcon
} from '@mui/icons-material';
import Confetti from 'react-confetti';
import ContributionHeatmap from './Heatmap';
import PersonalBestCard from './PersonalBestCard';
import NoteCard from './NoteCard';
import { generateHeatmapFromPerformances, calculateStreak } from './journalUtils';

const PAGE_SIZE = 5;

const Journal = () => {
    const [performances, setPerformances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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

    // Personal Notes
    const [personalNotes, setPersonalNotes] = useState(() => {
        const saved = localStorage.getItem('playright_personal_notes');
        return saved ? JSON.parse(saved) : [];
    });
    const [newPersonalNote, setNewPersonalNote] = useState('');
    const [editingPersonalId, setEditingPersonalId] = useState(null);
    const [editingPersonalValue, setEditingPersonalValue] = useState('');

    // Wish List
    const [wishList, setWishList] = useState(() => {
        const saved = localStorage.getItem('playright_wish_list');
        return saved ? JSON.parse(saved) : [];
    });
    const [newWish, setNewWish] = useState('');
    const [editingWishId, setEditingWishId] = useState(null);
    const [editingWishValue, setEditingWishValue] = useState('');

    useEffect(() => {
        const fetchPerformances = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) { setError('User not authenticated'); setLoading(false); return; }
                const response = await fetch('http://localhost:3001/api/performances/stats/user', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to fetch');
                setPerformances(await response.json());
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
    useEffect(() => { localStorage.setItem('playright_wish_list', JSON.stringify(wishList)); }, [wishList]);

    // Memoized values
    const heatmapData = useMemo(() => generateHeatmapFromPerformances(performances), [performances]);
    const currentStreak = useMemo(() => calculateStreak(performances), [performances]);
    const personalBests = useMemo(() => performances.filter(p => (p.overallScore || 0) > 85).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [performances]);
    const avgScore = useMemo(() => performances.length > 0 ? Math.round(performances.reduce((acc, p) => acc + (p.overallScore || 0), 0) / performances.length) : 0, [performances]);
    const visibleBests = personalBests.slice(0, bestsVisible);

    // Handlers
    const handleGoalCheck = (e) => {
        setGoalAchieved(e.target.checked);
        if (e.target.checked) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 5000); }
    };

    const handleEditNote = (perf) => { setEditingNoteId(perf.id); setTempNote(perfNotes[perf.id] || ''); };
    const handleSaveNote = (id) => { setPerfNotes(prev => ({ ...prev, [id]: tempNote })); setEditingNoteId(null); };

    // Personal Notes handlers
    const addPersonalNote = () => {
        if (!newPersonalNote.trim()) return;
        setPersonalNotes(prev => [{ id: Date.now(), content: newPersonalNote.trim(), createdAt: new Date().toISOString() }, ...prev]);
        setNewPersonalNote('');
    };
    const editPersonalNote = (note) => { setEditingPersonalId(note.id); setEditingPersonalValue(note.content); };
    const savePersonalNote = () => { setPersonalNotes(prev => prev.map(n => n.id === editingPersonalId ? { ...n, content: editingPersonalValue } : n)); setEditingPersonalId(null); };
    const deletePersonalNote = (id) => { setPersonalNotes(prev => prev.filter(n => n.id !== id)); };

    // Wish List handlers
    const addWish = () => {
        if (!newWish.trim()) return;
        setWishList(prev => [{ id: Date.now(), content: newWish.trim(), createdAt: new Date().toISOString() }, ...prev]);
        setNewWish('');
    };
    const editWish = (wish) => { setEditingWishId(wish.id); setEditingWishValue(wish.content); };
    const saveWish = () => { setWishList(prev => prev.map(w => w.id === editingWishId ? { ...w, content: editingWishValue } : w)); setEditingWishId(null); };
    const deleteWish = (id) => { setWishList(prev => prev.filter(w => w.id !== id)); };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress size={48} /></Box>;
    if (error) return <Container maxWidth="xl" sx={{ mt: 4 }}><Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert></Container>;

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

                {/* Top Section: Whiteboard + Notes + Wishlist */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 5 }}>
                    {/* Whiteboard Card */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: 'white', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                            <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', display: 'flex' }}>
                                <FireIcon sx={{ color: 'white', fontSize: 22 }} />
                            </Box>
                            <Typography variant="h6" fontWeight="700">The Whiteboard</Typography>
                        </Stack>

                        {/* Weekly Goal */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="overline" color="text.secondary" fontWeight="600">Weekly Goal</Typography>
                            <Paper elevation={0} sx={{ p: 2, mt: 1, bgcolor: '#fffde7', borderRadius: 2, border: '1px solid rgba(255, 193, 7, 0.2)', position: 'relative' }}>
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
                                    slotProps={{ input: { disableUnderline: true, sx: { fontSize: '0.95rem', textDecoration: goalAchieved ? 'line-through' : 'none', color: goalAchieved ? 'text.secondary' : 'text.primary' } } }}
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                    <Tooltip title={goalAchieved ? "Reset" : "Mark achieved"}>
                                        <Checkbox icon={<UncheckedIcon />} checkedIcon={<CheckCircleIcon sx={{ color: '#4caf50' }} />} checked={goalAchieved} onChange={handleGoalCheck} />
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
                                    <Chip label={`${currentStreak} Day${currentStreak !== 1 ? 's' : ''}`} size="small" sx={{ fontWeight: 'bold', bgcolor: currentStreak > 0 ? 'success.main' : 'grey.200', color: currentStreak > 0 ? 'white' : 'text.secondary' }} icon={<FireIcon sx={{ color: currentStreak > 0 ? 'white !important' : 'inherit', fontSize: '16px !important' }} />} />
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

                    {/* Personal Notes Card */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: 'white', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                            <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)', display: 'flex' }}>
                                <NoteIcon sx={{ color: 'white', fontSize: 22 }} />
                            </Box>
                            <Typography variant="h6" fontWeight="700">Personal Notes</Typography>
                        </Stack>

                        <Box sx={{ mb: 2 }}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                placeholder="Write a thought, reflection, or insight..."
                                value={newPersonalNote}
                                onChange={(e) => setNewPersonalNote(e.target.value)}
                                variant="outlined"
                                size="small"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' } }}
                            />
                            <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={addPersonalNote} disabled={!newPersonalNote.trim()} sx={{ mt: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600, bgcolor: '#9c27b0', '&:hover': { bgcolor: '#7b1fa2' } }}>
                                Add Note
                            </Button>
                        </Box>

                        <Stack spacing={1.5} sx={{ maxHeight: 220, overflowY: 'auto' }}>
                            {personalNotes.length === 0 ? (
                                <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 3, fontStyle: 'italic' }}>No notes yet</Typography>
                            ) : (
                                personalNotes.map(note => (
                                    <NoteCard
                                        key={note.id}
                                        note={note}
                                        onEdit={() => editPersonalNote(note)}
                                        onDelete={() => deletePersonalNote(note.id)}
                                        isEditing={editingPersonalId === note.id}
                                        editValue={editingPersonalValue}
                                        setEditValue={setEditingPersonalValue}
                                        onSave={savePersonalNote}
                                        bgColor="#f3e5f5"
                                        borderColor="rgba(156, 39, 176, 0.15)"
                                    />
                                ))
                            )}
                        </Stack>
                    </Paper>

                    {/* Wish List Card */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: 'white', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                            <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #2196f3 0%, #1565c0 100%)', display: 'flex' }}>
                                <WishIcon sx={{ color: 'white', fontSize: 22 }} />
                            </Box>
                            <Typography variant="h6" fontWeight="700">Wish List</Typography>
                        </Stack>

                        <Box sx={{ mb: 2 }}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                placeholder="Songs to learn, skills to develop..."
                                value={newWish}
                                onChange={(e) => setNewWish(e.target.value)}
                                variant="outlined"
                                size="small"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' } }}
                            />
                            <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={addWish} disabled={!newWish.trim()} sx={{ mt: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                                Add Wish
                            </Button>
                        </Box>

                        <Stack spacing={1.5} sx={{ maxHeight: 220, overflowY: 'auto' }}>
                            {wishList.length === 0 ? (
                                <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 3, fontStyle: 'italic' }}>No wishes yet</Typography>
                            ) : (
                                wishList.map(wish => (
                                    <NoteCard
                                        key={wish.id}
                                        note={wish}
                                        onEdit={() => editWish(wish)}
                                        onDelete={() => deleteWish(wish.id)}
                                        isEditing={editingWishId === wish.id}
                                        editValue={editingWishValue}
                                        setEditValue={setEditingWishValue}
                                        onSave={saveWish}
                                        bgColor="#e3f2fd"
                                        borderColor="rgba(33, 150, 243, 0.15)"
                                    />
                                ))
                            )}
                        </Stack>
                    </Paper>
                </Box>

                {/* Personal Bests Section */}
                {personalBests.length > 0 ? (
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                            <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)', display: 'flex' }}>
                                <TrophyIcon sx={{ color: 'white' }} />
                            </Box>
                            <Typography variant="h5" fontWeight="700">Personal Bests</Typography>
                            <Chip label={`${personalBests.length} achievements`} size="small" sx={{ bgcolor: 'rgba(255, 193, 7, 0.15)', color: '#f57c00', fontWeight: 600 }} />
                        </Stack>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 3 }}>
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
                    <Box sx={{ textAlign: 'center', py: 10, px: 4, bgcolor: 'white', borderRadius: 4, border: '1px dashed rgba(0,0,0,0.1)' }}>
                        <AutoGraphIcon sx={{ fontSize: 80, color: 'primary.light', mb: 3 }} />
                        <Typography variant="h5" color="text.secondary" fontWeight="600" gutterBottom>
                            Your journey starts here
                        </Typography>
                        <Typography variant="body1" color="text.disabled" sx={{ maxWidth: 400, mx: 'auto' }}>
                            Score above 85% to earn a spot in your Personal Bests. Keep practicing!
                        </Typography>
                    </Box>
                )}
            </Container>
        </Box>
    );
};

export default Journal;
