import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { API_BASE } from '../../config/api';

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
    Paper,
    Avatar
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import defaultProfilePic from '../../assets/profilePic.jpg';

const Register = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [profilePic, setProfilePic] = useState(null);
    const [profilePicPreview, setProfilePicPreview] = useState(null);
    const [error, setError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const validatePassword = (pwd) => {
        if (pwd.length < 8) return 'Password must be at least 8 characters';
        if (!/[a-z]/.test(pwd)) return 'Password must include a lowercase letter';
        if (!/[A-Z]/.test(pwd)) return 'Password must include an uppercase letter';
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) return 'Password must include a special character';
        return '';
    };

    const handlePasswordChange = (e) => {
        const pwd = e.target.value;
        setPassword(pwd);
        setPasswordError(validatePassword(pwd));
    };

    const handleProfilePicChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('Profile picture must be less than 5MB');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePic(reader.result);
                setProfilePicPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

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

        const pwdError = validatePassword(password);
        if (pwdError) {
            setError(pwdError);
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ firstName, lastName, email, password, profilePic }),
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
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
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
                    Create Account
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Join PlayRight to start your musical journey
                </Typography>

                <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
                    {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{success}</Alert>}

                    {/* Profile Picture Upload */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                        <input
                            accept="image/*"
                            style={{ display: 'none' }}
                            id="profile-pic-upload"
                            type="file"
                            onChange={handleProfilePicChange}
                        />
                        <label htmlFor="profile-pic-upload">
                            <IconButton component="span" sx={{ p: 0 }}>
                                <Avatar
                                    src={profilePicPreview || defaultProfilePic}
                                    sx={{
                                        width: 100,
                                        height: 100,
                                        border: '3px solid',
                                        borderColor: 'primary.main',
                                        cursor: 'pointer',
                                        '&:hover': { opacity: 0.8 }
                                    }}
                                />
                            </IconButton>
                        </label>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                            Click to upload profile picture (optional)
                        </Typography>
                    </Box>

                    <TextField
                        margin="normal"
                        autoComplete="given-name"
                        name="firstName"
                        required
                        fullWidth
                        id="firstName"
                        label="First Name"
                        autoFocus
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        InputProps={{
                            startAdornment: (<InputAdornment position="start"><PersonIcon color="action" /></InputAdornment>),
                        }}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="lastName"
                        label="Last Name"
                        name="lastName"
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        InputProps={{
                            startAdornment: (<InputAdornment position="start"><PersonIcon color="action" /></InputAdornment>),
                        }}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        InputProps={{
                            startAdornment: (<InputAdornment position="start"><EmailIcon color="action" /></InputAdornment>),
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
                        autoComplete="new-password"
                        value={password}
                        onChange={handlePasswordChange}
                        error={!!passwordError && password.length > 0}
                        helperText={password.length > 0 ? passwordError || 'Password meets requirements' : 'Min 8 chars, upper & lowercase, special character'}
                        slotProps={{
                            formHelperText: { sx: { color: passwordError ? 'error.main' : 'success.main' } }
                        }}
                        InputProps={{
                            startAdornment: (<InputAdornment position="start"><LockIcon color="action" /></InputAdornment>),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton aria-label="toggle password visibility" onClick={handleClickShowPassword} edge="end">
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
                        disabled={isLoading || !!success}
                    >
                        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign Up'}
                    </Button>
                    <Box sx={{ textAlign: 'center' }}>
                        <Link
                            component={RouterLink}
                            to="/login"
                            variant="body2"
                            sx={{ fontWeight: 600, textDecoration: 'none' }}
                        >
                            Already have an account? Login
                        </Link>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
};

export default Register;