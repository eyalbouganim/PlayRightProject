import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Recording from "./Pages/Recording/recording.jsx";
import Login from "./Pages/Login/login.jsx";
import Register from "./Pages/Register/register.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/recording" element={<Recording />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;