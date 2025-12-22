import React from 'react';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Recording from "./Pages/Recording/recording.jsx";
import Login from "./Pages/Login/login.jsx";
import Home from "./Pages/Home/home.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import Profile from "./Pages/Profile/profile.jsx";
import ProtectedLayout from "./auth/ProtectedLayout.jsx";
import Register from "./Pages/Register/register.jsx";
import Statistics from "./Pages/Statistics/statistics.jsx";

// Create a custom theme instance to define the application's color scheme.
const theme = createTheme({
  palette: {
    mode: 'light', // Set to light mode for readability
    primary: {
      main: '#1976d2', // A strong, accessible primary blue
    },
    secondary: {
      main: '#42a5f5', // A lighter, vibrant blue for accents
    },
    background: {
      default: '#f0f8ff', // A very light blue (AliceBlue) as a fallback
      // Paper elements will have a semi-transparent "frosted glass" look
      paper: 'rgba(255, 255, 255, 0.7)',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)', // Standard dark text for light themes
      secondary: 'rgba(0, 0, 0, 0.6)',
    }
  },
  components: {
    // Apply the beautiful gradient background to the whole app
    MuiCssBaseline: {
      styleOverrides: `
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        body {
          background: linear-gradient(-45deg, #f0f8ff, #e3f2fd, #bbdefb, #f0f8ff);
          background-size: 400% 400%;
          animation: gradientBG 25s ease infinite;
          min-height: 100vh;
          overflow-x: hidden;
        }
      `,
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.6)', // Semi-transparent AppBar
          backdropFilter: 'blur(10px)',
        }
      }
    }
  },
});

const FloatingNotes = () => {
  const notes = React.useMemo(() => {
    const symbols = ['♪', '♫', '♩', '♬', '♭', '♮', '♯'];
    return Array.from({ length: 20 }).map((_, i) => {
      // Randomly choose left (0-15%) or right (85-100%) margin
      const isLeft = Math.random() < 0.5;
      const left = isLeft 
        ? `${Math.random() * 15}%` 
        : `${85 + Math.random() * 15}%`;

      return {
        id: i,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        left: left,
        top: `${Math.random() * 100}%`, // Spread vertically across the screen
        animationDuration: `${3 + Math.random() * 5}s`, // Gentle bobbing speed
        animationDelay: `${Math.random() * -5}s`,
        fontSize: `${24 + Math.random() * 16}px`,
        opacity: 0.1 + Math.random() * 0.3, // Subtle opacity
      };
    });
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
      {notes.map((note) => (
        <div
          key={note.id}
          style={{
            position: 'absolute',
            left: note.left,
            top: note.top,
            color: '#1976d2',
            fontSize: note.fontSize,
            opacity: note.opacity,
            animation: `float ${note.animationDuration} ease-in-out infinite`,
            animationDelay: note.animationDelay,
          }}
        >
          {note.symbol}
        </div>
      ))}
    </div>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline kickstarts an elegant, consistent, and simple baseline to build upon. */}
      <CssBaseline />
      <FloatingNotes />
      <BrowserRouter>
        <Routes>
          {/* Public routes that anyone can access */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          {/* This route protects its children. If not logged in, it redirects to /login */}
          <Route element={<ProtectedRoute />}>
            {/* This route provides the layout (AppBar) for its children */}
            <Route element={<ProtectedLayout />}>
              <Route path="/home" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/recording" element={<Recording />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/" element={<Navigate to="/home" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;