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
    Grid
} from '@mui/material';

const Register = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        if (!firstName || !lastName || !email || !password) {
            setError('All fields are required.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ firstName, lastName, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                // The API returned an error (e.g., 409 for existing user)
                throw new Error(data.message || 'Failed to register.');
            }

            // --- Registration successful ---
            setSuccess('Registration successful! Redirecting to login...');
            
            // Redirect to the login page after a short delay to show the message
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            setError(err.message);
            setIsLoading(false); // Stop loading on error
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
                    bgcolor: 'secondary.main',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                }}
            >
                <Typography component="h1" variant="h4" sx={{ color: 'white', mb: 2 }}>
                    Sign Up
                </Typography>
                <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
                    {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{success}</Alert>}
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField autoComplete="given-name" name="firstName" required fullWidth id="firstName" label="First Name" autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField required fullWidth id="lastName" label="Last Name" name="lastName" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField required fullWidth id="email" label="Email Address" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField required fullWidth name="password" label="Password" type="password" id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </Grid>
                    </Grid>
                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={isLoading || !!success}>
                        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign Up'}
                    </Button>
                    <Grid container justifyContent="flex-end">
                        <Grid item>
                            <Link component={RouterLink} to="/login" variant="body2">
                                Already have an account? Login
                            </Link>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </Container>
    );
};

export default Register;