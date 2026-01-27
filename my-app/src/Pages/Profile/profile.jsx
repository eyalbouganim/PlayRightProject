import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api';
import {
    Container,
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    Grid,
    CircularProgress,
    Alert,
    InputAdornment,
    Avatar,
    Divider,
    Fade,
    Slide
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import SecurityIcon from '@mui/icons-material/Security';
import BadgeIcon from '@mui/icons-material/Badge';
import defaultProfilePic from '../../assets/profilePic.jpg';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // State for password change
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Authentication token not found.');
                }

                const response = await fetch(`${API_BASE}/api/users/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || 'Failed to fetch user profile.');
                }

                const userData = await response.json();
                setUser(userData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match.');
            return;
        }

        setPasswordLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/users/me/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to update password.');
            }

            setPasswordSuccess(data.message);
            // Clear fields on success
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPasswordError(err.message);
        } finally {
            setPasswordLoading(false);
        }
    };

    const getInitials = () => {
        if (!user) return '??';
        return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
    };

    if (loading) {
        return (
            <Box 
                sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    minHeight: '100vh'
                }}
            >
                <CircularProgress size={60} />
            </Box>
        );
    }

    if (error) {
        return (
            <Box 
                sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    minHeight: '100vh',
                    p: 2
                }}
            >
                <Alert 
                    severity="error" 
                    sx={{ 
                        maxWidth: 500,
                        borderRadius: 3,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                    }}
                >
                    {error}
                </Alert>
            </Box>
        );
    }

    return (
        <Box 
            sx={{ 
                py: { xs: 4, md: 8 },
                px: 2
            }}
        >
            <Container maxWidth="md">
                <Fade in={true} timeout={800}>
                    <Box>
                        {/* Header Section with Avatar */}
                        <Box 
                            sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center',
                                mb: 6
                            }}
                        >
                            <Avatar
                                src={user?.profile_pic || defaultProfilePic}
                                alt={`${user?.first_name} ${user?.last_name}`}
                                sx={{
                                    width: 120,
                                    height: 120,
                                    bgcolor: 'white',
                                    color: 'primary.main',
                                    fontSize: '3rem',
                                    fontWeight: 700,
                                    mb: 3,
                                    boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                                    border: '4px solid rgba(255,255,255,0.3)'
                                }}
                            >
                                {getInitials()}
                            </Avatar>
                            <Typography
                                variant="h3"
                                component="h1"
                                sx={{
                                    fontWeight: 800,
                                    color: 'white',
                                    mb: 1,
                                    textAlign: 'center',
                                    textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                                }}
                            >
                                {user?.first_name} {user?.last_name}
                            </Typography>
                            <Typography 
                                variant="h6" 
                                sx={{ 
                                    color: 'rgba(255,255,255,0.95)',
                                    textAlign: 'center',
                                    fontWeight: 400
                                }}
                            >
                                Manage your profile & security settings
                            </Typography>
                        </Box>

                        {/* Profile Information Card */}
                        <Slide direction="up" in={true} timeout={600}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: { xs: 3, md: 5 },
                                    mb: 4,
                                    borderRadius: 4,
                                    bgcolor: 'rgba(255, 255, 255, 0.98)',
                                    backdropFilter: 'blur(20px)',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.5)',
                                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 24px 70px rgba(0,0,0,0.35)'
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                                    <Box 
                                        sx={{ 
                                            p: 1.5, 
                                            borderRadius: 2, 
                                            bgcolor: 'primary.main', 
                                            color: 'white', 
                                            mr: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)'
                                        }}
                                    >
                                        <BadgeIcon sx={{ fontSize: 28 }} />
                                    </Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                        Personal Information
                                    </Typography>
                                </Box>
                                
                                <Divider sx={{ mb: 4, opacity: 0.6 }} />
                                
                                <Grid container spacing={3}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            label="First Name"
                                            value={user?.first_name || ''}
                                            fullWidth
                                            variant="outlined"
                                            InputProps={{
                                                readOnly: true,
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <PersonIcon sx={{ color: 'primary.main' }} />
                                                    </InputAdornment>
                                                )
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    bgcolor: 'rgba(102, 126, 234, 0.05)',
                                                    borderRadius: 2,
                                                    '& fieldset': {
                                                        borderColor: 'rgba(102, 126, 234, 0.2)',
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: 'rgba(102, 126, 234, 0.4)',
                                                    }
                                                }
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            label="Last Name"
                                            value={user?.last_name || ''}
                                            fullWidth
                                            variant="outlined"
                                            InputProps={{
                                                readOnly: true,
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <PersonIcon sx={{ color: 'primary.main' }} />
                                                    </InputAdornment>
                                                )
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    bgcolor: 'rgba(102, 126, 234, 0.05)',
                                                    borderRadius: 2,
                                                    '& fieldset': {
                                                        borderColor: 'rgba(102, 126, 234, 0.2)',
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: 'rgba(102, 126, 234, 0.4)',
                                                    }
                                                }
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            label="Email Address"
                                            value={user?.email || ''}
                                            fullWidth
                                            variant="outlined"
                                            InputProps={{
                                                readOnly: true,
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <EmailIcon sx={{ color: 'primary.main' }} />
                                                    </InputAdornment>
                                                )
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    bgcolor: 'rgba(102, 126, 234, 0.05)',
                                                    borderRadius: 2,
                                                    '& fieldset': {
                                                        borderColor: 'rgba(102, 126, 234, 0.2)',
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: 'rgba(102, 126, 234, 0.4)',
                                                    }
                                                }
                                            }}
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Slide>

                        {/* Change Password Card */}
                        <Slide direction="up" in={true} timeout={800}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: { xs: 3, md: 5 },
                                    borderRadius: 4,
                                    bgcolor: 'rgba(255, 255, 255, 0.98)',
                                    backdropFilter: 'blur(20px)',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.5)',
                                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 24px 70px rgba(0,0,0,0.35)'
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                                    <Box 
                                        sx={{ 
                                            p: 1.5, 
                                            borderRadius: 2, 
                                            bgcolor: 'secondary.main', 
                                            color: 'white', 
                                            mr: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 4px 14px rgba(156, 39, 176, 0.4)'
                                        }}
                                    >
                                        <SecurityIcon sx={{ fontSize: 28 }} />
                                    </Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                        Change Password
                                    </Typography>
                                </Box>

                                <Divider sx={{ mb: 4, opacity: 0.6 }} />

                                <Box component="form" onSubmit={handlePasswordChange}>
                                    {passwordError && (
                                        <Alert 
                                            severity="error" 
                                            sx={{ 
                                                mb: 3, 
                                                borderRadius: 2,
                                                boxShadow: '0 2px 8px rgba(211, 47, 47, 0.2)'
                                            }}
                                        >
                                            {passwordError}
                                        </Alert>
                                    )}
                                    {passwordSuccess && (
                                        <Alert 
                                            severity="success" 
                                            sx={{ 
                                                mb: 3, 
                                                borderRadius: 2,
                                                boxShadow: '0 2px 8px rgba(46, 125, 50, 0.2)'
                                            }}
                                        >
                                            {passwordSuccess}
                                        </Alert>
                                    )}
                                    
                                    <TextField
                                        label="Current Password"
                                        type="password"
                                        fullWidth
                                        required
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <LockIcon color="action" />
                                                </InputAdornment>
                                            )
                                        }}
                                        sx={{ 
                                            mb: 3,
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2
                                            }
                                        }}
                                    />
                                    <TextField
                                        label="New Password"
                                        type="password"
                                        fullWidth
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <LockIcon color="action" />
                                                </InputAdornment>
                                            )
                                        }}
                                        sx={{ 
                                            mb: 3,
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2
                                            }
                                        }}
                                    />
                                    <TextField
                                        label="Confirm New Password"
                                        type="password"
                                        fullWidth
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <LockIcon color="action" />
                                                </InputAdornment>
                                            )
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2
                                            }
                                        }}
                                    />
                                    
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            size="large"
                                            disabled={passwordLoading}
                                            sx={{
                                                py: 1.5,
                                                px: 6,
                                                borderRadius: '50px',
                                                fontWeight: 600,
                                                textTransform: 'none',
                                                fontSize: '1.1rem',
                                                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                '&:hover': {
                                                    boxShadow: '0 12px 32px rgba(102, 126, 234, 0.5)',
                                                    transform: 'translateY(-2px)',
                                                    transition: 'all 0.3s ease'
                                                },
                                                '&:disabled': {
                                                    background: 'rgba(0,0,0,0.12)'
                                                }
                                            }}
                                        >
                                            {passwordLoading ? (
                                                <CircularProgress size={24} sx={{ color: 'white' }} />
                                            ) : (
                                                'Update Password'
                                            )}
                                        </Button>
                                    </Box>
                                </Box>
                            </Paper>
                        </Slide>
                    </Box>
                </Fade>
            </Container>
        </Box>
    );
};

export default Profile;