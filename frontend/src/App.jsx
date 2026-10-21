import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './api/AuthContext.jsx';
import AppLayout from './components/AppLayout.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Track from './pages/Track.jsx';
import FastagTrack from './pages/FastagTrack.jsx';
// import Fleet from './pages/Fleet.jsx';
import History from './pages/History.jsx';
import Profile from './pages/Profile.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-shell"><div className="spinner" style={{ width: 28, height: 28 }} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

function HomeOrApp() {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-shell"><div className="spinner" style={{ width: 28, height: 28 }} /></div>;
  if (user) return <Navigate to="/app" replace />;
  return <Home />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeOrApp />} />
          <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
          <Route path="/register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />
          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="track" element={<Track />} />
            <Route path="fastag" element={<FastagTrack />} />
            {/* Fleet hidden for now: <Route path="fleet" element={<Fleet />} /> */}
            <Route path="history" element={<History />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
