import React from 'react';
import { Box, Typography, Paper, Tooltip } from '@mui/material';

const PerformanceTimeline = ({ details }) => {
    if (!details || details.length === 0) return <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>No detailed timeline data available.</Typography>;

    // Normalize data structure to handle potential backend naming variations
    const normalizedDetails = details.map(d => ({
        note: d.note || d.name || '?',
        expectedTime: d.expectedTime ?? d.expected_time ?? 0,
        expectedDuration: d.expectedDuration ?? d.expected_duration ?? 1,
        playedTime: d.playedTime ?? d.played_time,
        playedDuration: d.playedDuration ?? d.played_duration,
        status: d.status, // 'correct', 'incorrect', 'missed', etc.
        playedNote: d.playedNote ?? d.played_note
    }));

    // Calculate total duration to scale the graph
    const maxTime = Math.max(
        ...normalizedDetails.map(d => d.expectedTime + d.expectedDuration),
        ...normalizedDetails.map(d => (d.playedTime || 0) + (d.playedDuration || 0))
    ) || 10;

    const pixelsPerSecond = 50; // Scale factor
    const width = Math.max(600, maxTime * pixelsPerSecond);
    const height = 160;
    const padding = 20;

    return (
        <Paper variant="outlined" sx={{ p: 2, mt: 2, overflowX: 'auto', bgcolor: 'background.paper', borderRadius: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                Timeline Analysis (Sheet Music vs. You)
            </Typography>
            <Box sx={{ width: width, minWidth: '100%', position: 'relative' }}>
                <svg width={width} height={height}>
                    {/* Background lines */}
                    <line x1={0} y1={50} x2={width} y2={50} stroke="#e0e0e0" strokeWidth="1" />
                    <line x1={0} y1={110} x2={width} y2={110} stroke="#e0e0e0" strokeWidth="1" />
                    
                    <text x={10} y={45} fontSize="12" fill="#757575" fontWeight="bold">Expected</text>
                    <text x={10} y={105} fontSize="12" fill="#757575" fontWeight="bold">Played</text>

                    {normalizedDetails.map((item, index) => {
                        const expX = item.expectedTime * pixelsPerSecond + padding;
                        const expW = Math.max(item.expectedDuration * pixelsPerSecond, 4);
                        
                        let playedRect = null;
                        let connector = null;

                        if (item.playedTime !== undefined && item.playedTime !== null) {
                            const playX = item.playedTime * pixelsPerSecond + padding;
                            const playW = Math.max((item.playedDuration || 0.2) * pixelsPerSecond, 4);
                            
                            let color = '#4caf50'; // Green (Correct)
                            if (item.status === 'incorrect' || item.status === 'wrong_note') color = '#f44336'; // Red
                            else if (Math.abs(item.playedTime - item.expectedTime) > 0.2) color = '#ff9800'; // Orange (Timing)

                            playedRect = (
                                <Tooltip title={`Played: ${item.playedNote || item.note} (${item.status})`} key={`p-${index}`}>
                                    <rect 
                                        x={playX} 
                                        y={110} 
                                        width={playW} 
                                        height={24} 
                                        fill={color} 
                                        rx={4}
                                        opacity={0.9}
                                        stroke="#fff"
                                        strokeWidth="1"
                                    />
                                </Tooltip>
                            );

                            // Connector line
                            connector = (
                                <line 
                                    x1={expX + expW/2} 
                                    y1={74} 
                                    x2={playX + playW/2} 
                                    y2={110} 
                                    stroke={color} 
                                    strokeWidth="1" 
                                    strokeDasharray="4" 
                                    opacity={0.6} 
                                />
                            );
                        }

                        return (
                            <g key={index}>
                                <Tooltip title={`Expected: ${item.note}`}>
                                    <rect 
                                        x={expX} 
                                        y={50} 
                                        width={expW} 
                                        height={24} 
                                        fill="#1976d2" 
                                        rx={4} 
                                        opacity={0.6}
                                    />
                                </Tooltip>
                                {connector}
                                {playedRect}
                                <text x={expX + expW/2} y={67} fontSize="10" fill="white" textAnchor="middle" pointerEvents="none">
                                    {item.note}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </Box>
            
            {/* Legend */}
            <Box sx={{ display: 'flex', gap: 3, mt: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: '#1976d2', opacity: 0.6, borderRadius: 1 }} />
                    <Typography variant="caption">Expected Note</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: '#4caf50', borderRadius: 1 }} />
                    <Typography variant="caption">Correct</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: '#ff9800', borderRadius: 1 }} />
                    <Typography variant="caption">Timing Offset</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: '#f44336', borderRadius: 1 }} />
                    <Typography variant="caption">Wrong Note</Typography>
                </Box>
            </Box>
        </Paper>
    );
};

export default PerformanceTimeline;
