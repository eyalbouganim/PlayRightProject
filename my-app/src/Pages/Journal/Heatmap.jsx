import React from 'react';
import { Box, Tooltip, Stack, Typography } from '@mui/material';

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
                    '&:hover': { transform: 'scale(1.3)', boxShadow: '0 0 6px rgba(57, 211, 83, 0.5)' }
                }}
            />
        </Tooltip>
    );
};

const ContributionHeatmap = ({ heatmapData }) => (
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

export default ContributionHeatmap;