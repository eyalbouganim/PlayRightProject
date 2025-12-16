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
        body {
          background: linear-gradient(to bottom, #e3f2fd, #f0f8ff);
          background-attachment: fixed;
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

function App() {
  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline kickstarts an elegant, consistent, and simple baseline to build upon. */}
      <CssBaseline />
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