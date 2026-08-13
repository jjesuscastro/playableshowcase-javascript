import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { isAuthenticated } from './api';
import Login from './pages/Login';
import Apps from './pages/Apps';
import Catalog from './pages/Catalog';
import Settings from './pages/Settings';
import Upload from './pages/Upload';
import Viewer from './pages/Viewer';

function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/apps" element={<ProtectedRoute><Apps /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/viewer/:id" element={<ProtectedRoute><Viewer /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
