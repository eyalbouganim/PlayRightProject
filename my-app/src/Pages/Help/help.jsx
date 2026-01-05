import React from 'react';
import { Box, Container, Typography, Paper, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MicIcon from '@mui/icons-material/Mic';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import BarChartIcon from '@mui/icons-material/BarChart';
import BugReportIcon from '@mui/icons-material/BugReport';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const Help = () => {
    return (
        <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
            <Container maxWidth="md">
                <Box sx={{ textAlign: 'center', mb: 6 }}>
                    <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
                        Help & Tutorials
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                        Everything you need to know to master PlayRight.
                    </Typography>
                </Box>

                <Paper elevation={0} sx={{ bgcolor: 'transparent' }}>
                    {/* Section 1: Microphone Setup */}
                    <Accordion defaultExpanded sx={{ mb: 2, borderRadius: '16px !important', bgcolor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <MicIcon color="primary" />
                                <Typography variant="h6">Setting Up Your Microphone</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography paragraph>
                                To get the best feedback, ensure your microphone is set up correctly:
                            </Typography>
                            <List>
                                <ListItem>
                                    <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                                    <ListItemText primary="Browser Permissions" secondary="When prompted, click 'Allow' to grant PlayRight access to your microphone." />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                                    <ListItemText primary="Environment" secondary="Practice in a quiet room to avoid background noise interfering with pitch detection." />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                                    <ListItemText primary="Distance" secondary="Place your device 1-2 feet away from your instrument for optimal clarity." />
                                </ListItem>
                            </List>
                        </AccordionDetails>
                    </Accordion>

                    {/* Section 2: Understanding Feedback */}
                    <Accordion sx={{ mb: 2, borderRadius: '16px !important', bgcolor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <ColorLensIcon color="secondary" />
                                <Typography variant="h6">Understanding Feedback Colors</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography paragraph>
                                PlayRight uses a simple color-coded system to give you real-time feedback:
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                                <Paper sx={{ p: 2, borderLeft: '6px solid #4caf50', bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Green (Perfect)</Typography>
                                    <Typography variant="body2">You are playing the correct note and are in time.</Typography>
                                </Paper>
                                <Paper sx={{ p: 2, borderLeft: '6px solid #ff9800', bgcolor: 'rgba(255, 152, 0, 0.1)' }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Orange/Yellow (Close)</Typography>
                                    <Typography variant="body2">You are slightly sharp/flat or slightly off-tempo. Try to adjust your intonation.</Typography>
                                </Paper>
                                <Paper sx={{ p: 2, borderLeft: '6px solid #f44336', bgcolor: 'rgba(244, 67, 54, 0.1)' }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Red (Missed)</Typography>
                                    <Typography variant="body2">The note was incorrect or missed entirely. Check your fingering or sheet music.</Typography>
                                </Paper>
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    {/* Section 3: Reading Statistics */}
                    <Accordion sx={{ mb: 2, borderRadius: '16px !important', bgcolor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <BarChartIcon color="primary" />
                                <Typography variant="h6">Reading Your Statistics</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography paragraph>
                                After each session, visit the Statistics page to track your progress.
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                <strong>Accuracy Score:</strong> An overall percentage of how many notes you hit correctly.
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                <strong>Pitch Consistency:</strong> A graph showing if you tend to play sharp or flat over time.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                     {/* Section 4: Troubleshooting */}
                     <Accordion sx={{ mb: 2, borderRadius: '16px !important', bgcolor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <BugReportIcon color="error" />
                                <Typography variant="h6">Troubleshooting</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <List>
                                <ListItem>
                                    <ListItemText 
                                        primary="App isn't hearing me" 
                                        secondary="Check if your browser tab is muted or if another application is using the microphone." 
                                    />
                                </ListItem>
                                <Divider component="li" />
                                <ListItem>
                                    <ListItemText 
                                        primary="Laggy feedback" 
                                        secondary="Close other browser tabs to free up system resources. Ensure you have a stable internet connection." 
                                    />
                                </ListItem>
                            </List>
                        </AccordionDetails>
                    </Accordion>
                </Paper>
            </Container>
        </Box>
    );
};

export default Help;