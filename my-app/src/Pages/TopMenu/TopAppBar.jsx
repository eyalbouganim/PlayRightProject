import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    IconButton,
    Menu,
    MenuItem,
    Avatar,
    Tooltip,
    ListItemIcon,
    Divider
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import Logout from '@mui/icons-material/Logout';
import Person from '@mui/icons-material/Person';

const TopAppBar = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    useEffect(() => {
        // Retrieve user info from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        handleMenuClose();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleProfile = () => {
        handleMenuClose();
        navigate('/profile');
    };

    const handleHome = () => {
        navigate('/home');
    };

    // Helper to get initials
    const getInitials = (name) => {
        return name ? name.charAt(0).toUpperCase() : 'U';
    };

    return (
        <AppBar
            position="sticky"
            color="transparent"
            elevation={0}
            sx={{
                top: 0,
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.3)'
            }}
        >
            <Toolbar>
                {/* Brand / Logo Area */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        flexGrow: 1
                    }}
                    onClick={handleHome}
                >
                    <Box
                        sx={{
                            backgroundColor: 'primary.main',
                            color: 'white',
                            borderRadius: '50%',
                            p: 0.8,
                            mr: 1.5,
                            display: 'flex',
                            boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)'
                        }}
                    >
                        <MusicNoteIcon fontSize="small" />
                    </Box>
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{
                            fontWeight: 700,
                            color: 'text.primary',
                            letterSpacing: '-0.02em',
                            background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        PlayRight
                    </Typography>
                </Box>

                {/* User Actions Area */}
                {user && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography
                            variant="body1"
                            sx={{
                                mr: 2,
                                display: { xs: 'none', sm: 'block' },
                                color: 'text.secondary',
                                fontWeight: 500
                            }}
                        >
                            Hello, {user.firstName}
                        </Typography>

                        <Tooltip title="Account settings">
                            <IconButton
                                onClick={handleMenuClick}
                                size="small"
                                sx={{ ml: 0.5 }}
                                aria-controls={open ? 'account-menu' : undefined}
                                aria-haspopup="true"
                                aria-expanded={open ? 'true' : undefined}
                            >
                                <Avatar
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        bgcolor: 'secondary.main',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                    }}
                                >
                                    {getInitials(user.firstName)}
                                </Avatar>
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}

                {/* User Dropdown Menu */}
                <Menu
                    anchorEl={anchorEl}
                    id="account-menu"
                    open={open}
                    onClose={handleMenuClose}
                    onClick={handleMenuClose}
                    PaperProps={{
                        elevation: 0,
                        sx: {
                            overflow: 'visible',
                            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
                            mt: 1.5,
                            borderRadius: 2,
                            minWidth: 180,
                            '&:before': {
                                content: '""',
                                display: 'block',
                                position: 'absolute',
                                top: 0,
                                right: 14,
                                width: 10,
                                height: 10,
                                bgcolor: 'background.paper',
                                transform: 'translateY(-50%) rotate(45deg)',
                                zIndex: 0,
                            },
                        },
                    }}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                    <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
                        <ListItemIcon>
                            <Person fontSize="small" />
                        </ListItemIcon>
                        Profile
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
                        <ListItemIcon>
                            <Logout fontSize="small" color="error" />
                        </ListItemIcon>
                        Logout
                    </MenuItem>
                </Menu>
            </Toolbar>
        </AppBar>
    );
};

export default TopAppBar;
