import React from 'react';
import { Container, Typography, Paper, Switch, List, ListItem, ListItemText, ListItemSecondaryAction, Divider } from '@mui/material';

const Settings = () => {
    return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
            <Paper sx={{ 
                p: 4, 
                bgcolor: 'rgba(255, 255, 255, 0.7)', 
                backdropFilter: 'blur(20px)',
                borderRadius: 4 
            }}>
                <Typography variant="h4" gutterBottom sx={{ color: '#1976d2', fontWeight: 600 }}>
                    Settings
                </Typography>
                
                <List>
                    <ListItem>
                        <ListItemText 
                            primary="High Sensitivity Mode" 
                            secondary="Enhance microphone pickup for quiet instruments" 
                        />
                        <ListItemSecondaryAction>
                            <Switch color="primary" />
                        </ListItemSecondaryAction>
                    </ListItem>
                    <Divider variant="inset" component="li" />
                    <ListItem>
                        <ListItemText 
                            primary="Show Detailed Analytics" 
                            secondary="Display advanced graphs in post-session review" 
                        />
                        <ListItemSecondaryAction>
                            <Switch defaultChecked color="primary" />
                        </ListItemSecondaryAction>
                    </ListItem>
                    <Divider variant="inset" component="li" />
                    <ListItem>
                        <ListItemText 
                            primary="Email Notifications" 
                            secondary="Receive weekly progress reports" 
                        />
                        <ListItemSecondaryAction>
                            <Switch color="primary" />
                        </ListItemSecondaryAction>
                    </ListItem>
                </List>
            </Paper>
        </Container>
    );
};

export default Settings;