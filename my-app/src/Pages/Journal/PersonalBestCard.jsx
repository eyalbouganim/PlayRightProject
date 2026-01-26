import React from 'react';
import {
    Card,
    CardContent,
    Stack,
    Box,
    Typography,
    IconButton,
    TextField
} from '@mui/material';
import {
    Star as StarIcon,
    Save as SaveIcon,
    Edit as EditIcon
} from '@mui/icons-material';
import AudioPlayer from './AudioPlayer';

const PersonalBestCard = React.memo(({ perf, notes, editingNoteId, tempNote, setTempNote, handleEditNote, handleSaveNote }) => (
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
                <Box sx={{ textAlign: 'center', bgcolor: 'success.main', color: 'white', borderRadius: 2, px: 2, py: 1, minWidth: 70 }}>
                    <Typography variant="h5" fontWeight="800" lineHeight={1}>{Math.round(perf.overallScore)}</Typography>
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
));

export default PersonalBestCard;