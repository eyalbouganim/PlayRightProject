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
    CircularProgress
} from '@mui/material';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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

            // Redirect to the main performance analysis page
            navigate('/recording');

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

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
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    p: 4,
                    borderRadius: 2,
                    bgcolor: 'secondary.main', // Using the semi-transparent "glass" color from your theme
                    backdropFilter: 'blur(10px)', // This creates the blur effect for glassmorphism
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                }}
            >
                <Typography component="h1" variant="h4" sx={{ color: 'white', mb: 2 }}>
                    Login
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
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={isLoading}>
                        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                    </Button>
                    <Typography variant="body2" align="center">
                        {"Don't have an account? "}
                        <Link component={RouterLink} to="/register" variant="body2">
                            {"Register here"}
                        </Link>
                    </Typography>
                </Box>
            </Box>
        </Container>
    );
};

export default Login;