import React, { useState } from 'react';
import { Box, Typography, Divider, Grid, Paper, Stack, Button, Collapse } from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import PerformanceTimeline from './PerformanceTimeline';

const RecordingScore = ({ performanceResults }) => {
    const [showTimeline, setShowTimeline] = useState(false);

    if (!performanceResults) return null;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                <Typography variant="h2" color="primary" sx={{ fontWeight: 800 }}>
                    {performanceResults.overall_score}%
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Overall Score
                </Typography>
            </Box>
            
            <Divider />
            
            <Grid container spacing={2} sx={{ textAlign: 'center' }}>
                <Grid item xs={6}>
                    <Typography variant="h5" color="text.primary" fontWeight="bold">{performanceResults.pitch_accuracy}%</Typography>
                    <Typography variant="body2" color="text.secondary">Pitch Accuracy</Typography>
                </Grid>
                <Grid item xs={6}>
                    <Typography variant="h5" color="text.primary" fontWeight="bold">{performanceResults.timing_accuracy}%</Typography>
                    <Typography variant="body2" color="text.secondary">Timing Accuracy</Typography>
                </Grid>
            </Grid>

            <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2 }}>
                <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Total Notes:</Typography>
                        <Typography variant="body2" fontWeight="bold">{performanceResults.total_expected}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Correct Notes:</Typography>
                        <Typography variant="body2" fontWeight="bold" color="success.main">{performanceResults.correct_notes}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">On-Time Notes:</Typography>
                        <Typography variant="body2" fontWeight="bold" color="info.main">{performanceResults.on_time_notes}</Typography>
                    </Box>
                </Stack>
            </Paper>

            {/* Timeline Toggle */}
            {performanceResults.details && performanceResults.details.length > 0 && (
                <Box sx={{ width: '100%' }}>
                    <Button 
                        fullWidth 
                        variant="outlined" 
                        onClick={() => setShowTimeline(!showTimeline)}
                        startIcon={<TimelineIcon />}
                        sx={{ borderRadius: 2, py: 1 }}
                    >
                        {showTimeline ? 'Hide Performance Timeline' : 'View Performance Timeline'}
                    </Button>
                    <Collapse in={showTimeline}>
                        <PerformanceTimeline details={performanceResults.details} />
                    </Collapse>
                </Box>
            )}
        </Box>
    );
};

export default RecordingScore;
