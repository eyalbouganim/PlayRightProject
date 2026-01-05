// src/Pages/Recording/components/LiveRecorder.jsx

import React from 'react';
import {
    Box,
    Paper,
    Alert
} from '@mui/material';
import NoteDisplay from './NoteDisplay.jsx';

// This is now a "presentational" component.
// It receives all its logic as props from the parent.
const LiveRecorder = ({
    notes,
    error,
}) => {

    return (
        <Paper elevation={0} sx={{ p: 0, bgcolor: 'transparent', width: '100%', maxWidth: '600px' }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* This will now correctly display the notes from the parent */}
            <NoteDisplay notes={notes} />
        </Paper>
    );
};

export default LiveRecorder;