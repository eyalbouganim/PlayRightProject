import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, IconButton } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';

const TopAppBar = () => {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');

    useEffect(() => {
        // Retrieve user info from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setUserName(`${user.firstName}`);
        }
    }, []);

    const handleLogout = () => {
        // Clear user session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to login page
        navigate('/login');
    };

    const handleProfile = () => {
        // Placeholder for profile page navigation
        navigate('/profile'); 
    };

    const handleHome = () => {
        navigate('/home');
    };

    return (
        <AppBar position="static" color="default" elevation={1}>
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Hello {userName}
                </Typography>
                <IconButton color="inherit" aria-label="home" onClick={handleHome}>
                    <HomeIcon />
                </IconButton>
                <Button color="inherit" onClick={handleProfile}>
                    Profile
                </Button>
                <Button color="inherit" onClick={handleLogout}>
                    Log Out
                </Button>
            </Toolbar>
        </AppBar>
    );
};

export default TopAppBar;
