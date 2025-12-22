import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

// MUI Imports
import {
    Container,
    Box,
    TextField,
    Button,
    Typography,
    Link,
    Alert,
    CircularProgress,
    InputAdornment,
    IconButton,
    Paper
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(''); // Clear previous errors
        setIsLoading(true);

        if (!email || !password) {
            setError('Email and password are required.');
            setIsLoading(false);
            return;
        }

        try {
            // Your node server is running on port 3001
            const response = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                // The API returned an error (e.g., 401, 409, 500)
                throw new Error(data.message || 'Failed to log in.');
            }

            // --- Login successful ---
            // Store the token in localStorage for persistence across browser sessions
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user)); // Store user info

            // Redirect to the main performance analysis page
            navigate('/home');

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClickShowPassword = () => setShowPassword((show) => !show);

    return (
        <Container
            component="main"
            maxWidth="xs"
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    p: 4,
                    borderRadius: 4,
                    width: '100%',
                    bgcolor: 'rgba(255, 255, 255, 0.8)', // Lighter glass effect for better readability
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                }}
            >
                {/* Branding Logo */}
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'white',
                        mb: 2,
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                    }}
                >
                    <MusicNoteIcon fontSize="large" />
                </Box>

                <Typography component="h1" variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
                    Welcome Back
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Sign in to continue to PlayRight
                </Typography>

                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                    {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <EmailIcon color="action" />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <LockIcon color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="toggle password visibility"
                                        onClick={handleClickShowPassword}
                                        edge="end"
                                    >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        sx={{
                            mt: 4,
                            mb: 3,
                            py: 1.5,
                            borderRadius: '50px',
                            fontWeight: 600,
                            textTransform: 'none',
                            fontSize: '1rem',
                            boxShadow: '0 4px 14px 0 rgba(25, 118, 210, 0.39)'
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                    </Button>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                        {"Don't have an account? "}
                        <Link
                            component={RouterLink}
                            to="/register"
                            variant="body2"
                            sx={{ fontWeight: 600, textDecoration: 'none' }}
                        >
                            {"Sign up"}
                        </Link>
                    </Typography>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
};

export default Login;