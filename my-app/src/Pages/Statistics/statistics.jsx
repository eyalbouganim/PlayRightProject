import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Grid,
    Paper,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    Chip
} from '@mui/material';
import { Timeline, Speed, EmojiEvents, MusicNote } from '@mui/icons-material';

const Statistics = () => {
    const [performances, setPerformances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Retrieve auth token from storage (adjust key if needed, e.g., 'token' or 'jwt')
                const token = localStorage.getItem('token');
                
                if (!token) {
                    setError('User not authenticated');
                    setLoading(false);
                    return;
                }

                // Fetching the last 5 performances as per current backend implementation
                // Adjust the URL if your API is hosted elsewhere or proxied
                const response = await fetch('http://localhost:3001/api/performances/stats/user', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch statistics');
                }
                const data = await response.json();
                setPerformances(data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching performance stats:', err);
                setError('Failed to load statistics. Please try again later.');
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }
    if (error) {
        return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
    }

    // Calculate aggregate statistics from the available data
    const totalSessions = performances.length;
    const averageScore = totalSessions > 0
        ? Math.round(performances.reduce((acc, curr) => acc + (curr.overallScore || 0), 0) / totalSessions)
        : 0;
    
    // Find the best performance based on overallScore
    const bestPerformance = totalSessions > 0
        ? performances.reduce((prev, current) => ((prev.overallScore || 0) > (current.overallScore || 0)) ? prev : current)
        : null;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
                <Typography
                    variant="h3"
                    component="h1"
                    sx={{
                        fontWeight: 800,
                        color: 'primary.main',
                        mb: 2,
                        textShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    }}
                >
                    Performance Statistics
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
                    Track your progress and analyze your musical journey.
                </Typography>
            </Box>
            
            {/* Stats Overview Cards */}
            <Grid container spacing={4} sx={{ mb: 6 }}>
                <Grid item xs={12} md={4}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            borderRadius: 4,
                            bgcolor: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                            transition: 'transform 0.3s ease-in-out',
                            '&:hover': { transform: 'translateY(-5px)' }
                        }}
                    >
                        <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'primary.light', color: 'white', mb: 2, boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)' }}>
                            <Timeline fontSize="large" />
                        </Box>
                        <Typography variant="h3" component="div" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {totalSessions}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Total Sessions
                        </Typography>
                    </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            borderRadius: 4,
                            bgcolor: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                            transition: 'transform 0.3s ease-in-out',
                            '&:hover': { transform: 'translateY(-5px)' }
                        }}
                    >
                        <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'success.light', color: 'white', mb: 2, boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)' }}>
                            <Speed fontSize="large" />
                        </Box>
                        <Typography variant="h3" component="div" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {averageScore}%
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Average Score
                        </Typography>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            borderRadius: 4,
                            bgcolor: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                            transition: 'transform 0.3s ease-in-out',
                            '&:hover': { transform: 'translateY(-5px)' }
                        }}
                    >
                        <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'secondary.main', color: 'white', mb: 2, boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)' }}>
                            <EmojiEvents fontSize="large" />
                        </Box>
                        <Typography variant="h3" component="div" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {bestPerformance ? `${bestPerformance.overallScore || 0}%` : '-'}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 600 }} noWrap>
                            {bestPerformance ? (bestPerformance.songTitle || (bestPerformance.song && bestPerformance.song.title) || 'Unknown Song') : 'No Data'}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Recent Performances Table */}
            <Paper
                elevation={0}
                sx={{
                    width: '100%',
                    overflow: 'hidden',
                    borderRadius: 4,
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                }}
            >
                <Box sx={{ px: 4, py: 3, borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                    <Typography variant="h5" component="div" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        Recent History
                    </Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 500 }}>
                    <Table stickyHeader aria-label="performances table">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(255,255,255,0.9)' }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(255,255,255,0.9)' }}>Song</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(255,255,255,0.9)' }}>Score</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(255,255,255,0.9)' }}>Pitch</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(255,255,255,0.9)' }}>Timing</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(255,255,255,0.9)' }}>Feedback</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {performances.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body1" color="textSecondary">
                                            No performance history found. Start playing to see your stats!
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                performances.map((perf, index) => (
                                    <TableRow hover role="checkbox" tabIndex={-1} key={perf.id || index}>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {new Date(perf.date || perf.createdAt).toLocaleDateString()}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {new Date(perf.date || perf.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <MusicNote fontSize="small" color="action" />
                                                <Typography variant="body2">
                                                    {perf.songTitle || (perf.song && perf.song.title) || 'Unknown Song'}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={`${perf.overallScore || 0}%`} 
                                                color={(perf.overallScore || 0) >= 80 ? 'success' : (perf.overallScore || 0) >= 60 ? 'warning' : 'error'}
                                                size="small"
                                                variant="filled"
                                                sx={{ fontWeight: 'bold', minWidth: '60px' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {perf.pitchAccuracy !== undefined && perf.pitchAccuracy !== null ? `${Math.round(perf.pitchAccuracy)}%` : '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {perf.timingAccuracy !== undefined && perf.timingAccuracy !== null ? `${Math.round(perf.timingAccuracy)}%` : '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 300 }}>
                                            <Typography variant="body2" noWrap title={perf.feedback}>
                                                {perf.feedback || 'No feedback available'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Container>
    );
};

export default Statistics;