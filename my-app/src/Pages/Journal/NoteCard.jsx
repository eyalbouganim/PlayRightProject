import React from 'react';
import {
    Paper,
    Stack,
    Typography,
    IconButton,
    TextField
} from '@mui/material';
import {
    Save as SaveIcon,
    Edit as EditIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';

const NoteCard = ({ note, onEdit, onDelete, isEditing, editValue, setEditValue, onSave, bgColor = '#fffef5', borderColor = 'rgba(255, 193, 7, 0.15)' }) => (
    <Paper
        elevation={0}
        sx={{ p: 2, borderRadius: 2, bgcolor: bgColor, border: `1px solid ${borderColor}` }}
    >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="caption" color="text.secondary">
                {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Typography>
            <Stack direction="row" spacing={0.5}>
                {isEditing ? (
                    <IconButton size="small" onClick={onSave} sx={{ bgcolor: 'primary.main', color: 'white', width: 24, height: 24, '&:hover': { bgcolor: 'primary.dark' } }}>
                        <SaveIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                ) : (
                    <>
                        <IconButton size="small" onClick={onEdit}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
                        <IconButton size="small" onClick={onDelete} sx={{ color: 'error.main' }}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
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
                slotProps={{ input: { disableUnderline: true, sx: { fontSize: '0.875rem' } } }}
            />
        ) : (
            <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                {note.content}
            </Typography>
        )}
    </Paper>
);

export default NoteCard;