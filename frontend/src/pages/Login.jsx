import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext.jsx';
import { ErrorBanner, Spinner } from '../components/Common.jsx';
import logo from '../assets/logo.jpg';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      navigate('/app');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Link to="/" className="home-brand auth-brand">
          <img src={logo} alt="FASTag Tracker" className="home-brand-logo" />
          <span>FASTag Tracking</span>
        </Link>
        <h1>Welcome back</h1>
        <p className="subtitle">Log in to track your fleet</p>
        <ErrorBanner message={error} />
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Mobile Number or User ID</label>
            <input
              type="text"
              placeholder="9876543210 or you@company.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <Spinner /> : 'Login'}
          </button>
        </form>
        <div className="auth-switch">
          New user? <Link to="/register" className="btn-ghost">Register</Link>
        </div>
      </div>
    </div>
  );
}
