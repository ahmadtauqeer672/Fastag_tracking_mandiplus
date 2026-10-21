import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext.jsx';
import logo from '../assets/logo.jpg';
import { roleLabel } from '../utils.js';

// Stroke icons (24x24, Lucide-style) so every nav item shares one visual weight.
const ICON_PATHS = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></>,
  track: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" /></>,
  fastag: <><path d="M4 20h16" /><path d="M6 20V9M18 20V9" /><path d="M3 9h18l-2-4H5z" /><path d="M10 14a3 3 0 0 1 4 0" /><path d="M8.5 12a5 5 0 0 1 7 0" /></>,
  fleet: <><path d="M2 6h11v10H2z" /><path d="M13 9h4l3 3.5V16h-7z" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
};

function NavIcon({ name }) {
  return (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}

const NAV_ITEMS = [
  { to: '/app', label: 'Home', icon: 'home', end: true },
  { to: '/app/track', label: 'Track', icon: 'track' },
  { to: '/app/fastag', label: 'FASTag', icon: 'fastag' },
  // Fleet is hidden for now; restore this entry (and the route in App.jsx) to bring it back.
  // { to: '/app/fleet', label: 'Fleet', icon: 'fleet' },
  { to: '/app/history', label: 'History', icon: 'history' },
  { to: '/app/profile', label: 'Profile', icon: 'profile' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="app-shell">
      <div className="sidebar">
        <div className="brand-mark">
          <img src={logo} alt="FASTag Tracker" className="sidebar-logo" />
          <div className="brand-name">FASTag Tracking</div>
        </div>
        <div className="nav-section-label">Menu</div>
        <nav className="nav-list">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="icon"><NavIcon name={item.icon} /></span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">{(user?.name || 'U')[0].toUpperCase()}</div>
            <div className="meta">
              <div className="name">{user?.name}</div>
              <div className="role">{roleLabel(user?.role)}</div>
            </div>
          </div>
          <button type="button" className="nav-item nav-logout" onClick={onLogout}>
            <span className="icon"><NavIcon name="logout" /></span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="main">
        <Outlet />
      </div>

      <div className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `bn-item ${isActive ? 'active' : ''}`}
          >
            <span className="icon"><NavIcon name={item.icon} /></span>
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
