import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';
import HelpIcon from '@mui/icons-material/Help';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import SchoolIcon from '@mui/icons-material/School';

const Home = () => {
    const navigate = useNavigate();

    const handlePracticeClick = () => {
        navigate('/recording');
    };

    const handleStatisticsClick = () => {
        navigate('/statistics');
    };

    const handleSettingsClick = () => {
        navigate('/settings');
    };

    const handleAboutClick = () => {
        navigate('/about');
    };

    const handleHelpClick = () => {
        navigate('/help');
    };

    const handleLibraryClick = () => {
        navigate('/library');
    };

    const handleLearnClick = () => {
        navigate('/learn');
    };

    return (
        <Box
            component="main"
            sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '100vh',
                py: 6,
                bgcolor: 'background.default'
            }}
        >
            <Container maxWidth="lg">
                {/* Hero Section */}
                <Box sx={{ textAlign: 'center', mb: 8 }}>
                    <Typography
                        variant="h2"
                        component="h1"
                        sx={{
                            fontWeight: 700,
                            color: 'text.primary',
                            letterSpacing: '-0.01em',
                            mb: 2,
                        }}
                    >
                        PlayRight
                    </Typography>
                    <Typography
                        variant="h6"
                        color="text.secondary"
                        sx={{ fontWeight: 400, maxWidth: '600px', mx: 'auto', lineHeight: 1.6 }}
                    >
                        Master your instrument with intelligent feedback and progress tracking
                    </Typography>
                </Box>

                {/* Featured Cards - Rock a Performance & Learn the Basics */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        gap: 4,
                        width: '100%',
                        mb: 6,
                    }}
                >
                    {/* Rock a Performance Card */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 5,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            textAlign: 'left',
                            bgcolor: 'white',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 3,
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            position: 'relative',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 12px 24px rgba(0, 0, 0, 0.08)',
                                borderColor: 'primary.main',
                            },
                        }}
                        onClick={handlePracticeClick}
                    >
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: 2,
                                bgcolor: 'primary.main',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 3,
                            }}
                        >
                            <MusicNoteIcon sx={{ fontSize: 32 }} />
                        </Box>
                        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                            Performance Mode
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
                            Record your performance and receive comprehensive AI-powered analysis on pitch accuracy, rhythm precision, and tempo consistency.
                        </Typography>
                        <Box sx={{
                            mt: 'auto',
                            pt: 3,
                            display: 'flex',
                            alignItems: 'center',
                            color: 'primary.main',
                            fontWeight: 600,
                        }}>
                            Start Session
                            <Box component="span" sx={{ ml: 1, transition: 'transform 0.2s', display: 'inline-block' }}>
                                →
                            </Box>
                        </Box>
                    </Paper>

                    {/* Learn the Basics Card */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 5,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            textAlign: 'left',
                            bgcolor: 'white',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 3,
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            position: 'relative',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 12px 24px rgba(0, 0, 0, 0.08)',
                                borderColor: 'secondary.main',
                            },
                        }}
                        onClick={handleLearnClick}
                    >
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: 2,
                                bgcolor: 'secondary.main',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 3,
                            }}
                        >
                            <SchoolIcon sx={{ fontSize: 32 }} />
                        </Box>
                        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                            Learning Mode
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
                            Practice melodies at your own pace with real-time note detection. Focus on learning without the pressure of grading or evaluation.
                        </Typography>
                        <Box sx={{
                            mt: 'auto',
                            pt: 3,
                            display: 'flex',
                            alignItems: 'center',
                            color: 'secondary.main',
                            fontWeight: 600,
                        }}>
                            Start Learning
                            <Box component="span" sx={{ ml: 1, transition: 'transform 0.2s', display: 'inline-block' }}>
                                →
                            </Box>
                        </Box>
                    </Paper>
                </Box>

                {/* Secondary Navigation Grid */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
                        gap: 2,
                        width: '100%',
                    }}
                >
                    {/* Music Library Card */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            bgcolor: 'white',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            '&:hover': {
                                borderColor: 'text.secondary',
                                bgcolor: 'grey.50',
                            },
                        }}
                        onClick={handleLibraryClick}
                    >
                        <LibraryMusicIcon sx={{ fontSize: 28, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                            Library
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                            Browse sheet music
                        </Typography>
                    </Paper>

                    {/* Statistics Card */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            bgcolor: 'white',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            '&:hover': {
                                borderColor: 'text.secondary',
                                bgcolor: 'grey.50',
                            },
                        }}
                        onClick={handleStatisticsClick}
                    >
                        <BarChartIcon sx={{ fontSize: 28, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                            Statistics
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                            Track progress
                        </Typography>
                    </Paper>

                    {/* Settings Card */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            bgcolor: 'white',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            '&:hover': {
                                borderColor: 'text.secondary',
                                bgcolor: 'grey.50',
                            },
                        }}
                        onClick={handleSettingsClick}
                    >
                        <SettingsIcon sx={{ fontSize: 28, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                            Settings
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                            Customize app
                        </Typography>
                    </Paper>

                    {/* About Card */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            bgcolor: 'white',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            '&:hover': {
                                borderColor: 'text.secondary',
                                bgcolor: 'grey.50',
                            },
                        }}
                        onClick={handleAboutClick}
                    >
                        <InfoIcon sx={{ fontSize: 28, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                            About
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                            Our mission
                        </Typography>
                    </Paper>
                </Box>

                {/* Help Section */}
                <Box sx={{ mt: 4 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 4,
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: 'center',
                            gap: 3,
                            bgcolor: 'white',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            '&:hover': {
                                borderColor: 'text.secondary',
                                bgcolor: 'grey.50',
                            },
                        }}
                        onClick={handleHelpClick}
                    >
                        <HelpIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                        <Box sx={{ flexGrow: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                Help & Tutorials
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Learn how to get the most out of PlayRight with our comprehensive guides
                            </Typography>
                        </Box>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            color: 'text.secondary',
                            fontWeight: 500,
                            fontSize: '0.875rem',
                        }}>
                            View Guides
                            <Box component="span" sx={{ ml: 1 }}>→</Box>
                        </Box>
                    </Paper>
                </Box>
            </Container>
        </Box>
    );
};

export default Home;
