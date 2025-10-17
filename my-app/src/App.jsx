import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Recording from "./Pages/Recording/recording.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/recording" replace />} />
        <Route path="/recording" element={<Recording />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;