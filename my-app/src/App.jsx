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

// Create a custom theme instance to define the application's color scheme.
const theme = createTheme({
  palette: {
    mode: 'dark', // A dark mode background makes the glass effect more prominent.
    primary: {
      main: '#03a9f4', // A vibrant light blue
    },
    secondary: {
      main: 'rgba(255, 255, 255, 0.7)', // This is the "glass" color - semi-transparent white
    },
    background: {
      default: '#212121',
      paper: '#333333',
    },
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
              <Route path="/" element={<Navigate to="/home" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;