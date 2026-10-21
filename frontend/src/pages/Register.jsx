import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext.jsx';
import { ErrorBanner, Spinner } from '../components/Common.jsx';
import logo from '../assets/logo.jpg';

const ROLES = ['transporter', 'driver', 'business', 'customer'];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', role: 'transporter' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        password: form.password,
        role: form.role,
      });
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
        <h1>Create your account</h1>
        <p className="subtitle">Track vehicles, manage your fleet, get instant alerts</p>
        <ErrorBanner message={error} />
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Full name</label>
            <input type="text" placeholder="Ravi Kumar" value={form.name} onChange={(e) => update('name', e.target.value)} required />
          </div>
          <div className="field">
            <label>Phone number</label>
            <input type="text" placeholder="9876543210" value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
          </div>
          <div className="field">
            <label>Email (optional, used for alert fallback)</label>
            <input type="email" placeholder="you@company.com" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="At least 6 characters" minLength={6} value={form.password} onChange={(e) => update('password', e.target.value)} required />
          </div>
          <div className="field">
            <label>I am a...</label>
            <div className="role-grid">
              {ROLES.map((r) => (
                <div
                  key={r}
                  className={`role-chip ${form.role === r ? 'active' : ''}`}
                  onClick={() => update('role', r)}
                >
                  {r[0].toUpperCase() + r.slice(1)}
                </div>
              ))}
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <Spinner /> : 'Create account'}
          </button>
        </form>
        <div className="auth-switch">
          Already have an account? <Link to="/login" className="btn-ghost">Login</Link>
        </div>
      </div>
    </div>
  );
}
