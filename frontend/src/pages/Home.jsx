import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext.jsx';
import { ErrorBanner, Spinner } from '../components/Common.jsx';
import logo from '../assets/logo.jpg';

const SERVICE_TABS = [
  {
    key: 'fastag',
    label: 'FASTag Tracking',
    icon: '📍',
    heroTitle: 'Track Vehicles via FASTag',
    heroDesc: 'Real-time location tracking using toll plaza data across India.',
    cards: [
      {
        icon: '📍',
        title: 'FASTag Location',
        desc: 'Track vehicle location via FASTag toll plaza data across India',
      },
      // {
      //   icon: '👁',
      //   title: 'Toll Activity History',
      //   desc: 'View complete toll crossing history with timestamps and amounts',
      // },
      // {
      //   icon: '🧭',
      //   title: 'Route Visualization',
      //   desc: 'See the toll plazas a vehicle has crossed, plotted on a map',
      // },
      // {
      //   icon: '📄',
      //   title: 'PDF Reports',
      //   desc: 'Download toll crossing history as a shareable PDF report',
      // },
    ],
  },
  // {
  //   key: 'vehicle',
  //   label: 'Vehicle Verification',
  //   icon: '🚚',
  //   heroTitle: 'Verify Vehicles & Drivers',
  //   heroDesc: 'Pull RC details, challan history and driver records in one search.',
  //   cards: [
  //     {
  //       icon: '🪪',
  //       title: 'RC Details',
  //       desc: 'Owner name, registration date, fitness and insurance validity',
  //     },
  //     {
  //       icon: '⚠️',
  //       title: 'Challan Search',
  //       desc: 'Check pending and paid traffic challans for any vehicle number',
  //     },
  //     {
  //       icon: '🧾',
  //       title: 'Driver Verification',
  //       desc: 'Verify driving licence status before you assign a trip',
  //     },
  //     {
  //       icon: '🛡️',
  //       title: 'Document Alerts',
  //       desc: 'Get notified before insurance, permit or fitness expires',
  //     },
  //   ],
  // },
  // {
  //   key: 'fleet',
  //   label: 'Fleet & Trips',
  //   icon: '🗂️',
  //   heroTitle: 'Manage Your Whole Fleet',
  //   heroDesc: 'One dashboard for every vehicle, trip and driver you run.',
  //   cards: [
  //     {
  //       icon: '🚛',
  //       title: 'Fleet Dashboard',
  //       desc: 'See every vehicle in your fleet and its live status at a glance',
  //     },
  //     {
  //       icon: '🧵',
  //       title: 'Trip History',
  //       desc: 'Review completed trips with route, distance and toll spend',
  //     },
  //     {
  //       icon: '👥',
  //       title: 'Team Access',
  //       desc: 'Add dispatchers and drivers with role-based permissions',
  //     },
  //     {
  //       icon: '🔔',
  //       title: 'Smart Alerts',
  //       desc: 'Get pinged on idle vehicles, route deviation or long halts',
  //     },
  //   ],
  // },
];

const WHY_US = [
  { icon: '📈', title: 'Scale', desc: '1M searches/day capacity' },
  { icon: '🔄', title: 'Uptime', desc: '99.9% platform reliability' },
  { icon: '🎯', title: 'Data Accuracy', desc: '99.99% precision rate' },
  { icon: '📡', title: 'Highest Coverage', desc: '99.09% pan-India reach' },
  { icon: '🛠️', title: 'Tech Support', desc: 'On-demand expert assistance' },
  { icon: '⚡', title: 'Response Time', desc: 'Lightning fast 500ms APIs' },
  { icon: '👨\u200d👩\u200d👧', title: 'Trusted Platform', desc: '10,000+ fleet operators' },
  { icon: '⚙️', title: 'Custom APIs', desc: 'Tailored for your business' },
];

function HomeNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="home-nav">
      <div className="home-nav-inner">
        <Link to="/" className="home-brand">
          <img src={logo} alt="FASTag Tracker" className="home-brand-logo" />
          <span>FASTag Tracking</span>
        </Link>
        <nav className={`home-nav-links ${open ? 'open' : ''}`}>
          <a href="#home" className="active" onClick={() => setOpen(false)}>Home</a>
          <a href="#services" onClick={() => setOpen(false)}>Services</a>
          <a href="#why-us" onClick={() => setOpen(false)}>Why Us</a>
        </nav>
        <div className="home-nav-actions">
          <Link to="/login" className="btn btn-outline-navy">Sign In</Link>
          <Link to="/register" className="btn btn-accent">Sign Up</Link>
        </div>
        <button className="home-nav-burger" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
      </div>
    </header>
  );
}

function HeroLoginCard() {
  const { login } = useAuth();
  const navigate = useNavigate();
  // Mobile number or user ID (email); the backend accepts either.
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="hero-login-card">
      <h2>Welcome Back</h2>
      <p className="hero-login-sub">Sign in to your account</p>
      <ErrorBanner message={error} />
      <form onSubmit={onSubmit}>
        <div className="hero-input">
          <span className="hero-input-icon">👤</span>
          <input
            type="text"
            placeholder="Mobile Number or User ID"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>
        <div className="hero-input">
          <span className="hero-input-icon">🔒</span>
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="hero-input-eye"
            onClick={() => setShowPw((v) => !v)}
            aria-label="Toggle password visibility"
          >
            {showPw ? '🙈' : '👁'}
          </button>
        </div>
        <div className="hero-forgot">
          <Link to="/login">Forgot Password?</Link>
        </div>
        <button type="submit" className="btn btn-hero-signin" disabled={loading}>
          {loading ? <Spinner /> : 'Sign In'}
        </button>
      </form>
      <div className="hero-signup-line">
        Don&apos;t have an account? <Link to="/register">Sign up free</Link>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState(SERVICE_TABS[0].key);
  const tab = SERVICE_TABS.find((t) => t.key === activeTab);

  return (
    <div className="home-page" id="home">
      <HomeNav />

      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <span className="home-pill">
              <span className="home-pill-dot" /> Trusted by 10,000+ fleet operators
            </span>
            {/* <h1>
              Har Toll Par Nazar,<br />Har Gaadi Ki Khabar.
            </h1> */}
            <h1>Har Gaadi Ki Khabar</h1>
            <p className="home-hero-desc">
              RC details, challan search, FASTag tracking, driver verification —
              everything at your fingertips.
            </p>
            <div className="home-stats">
              <div className="home-stat">
                <div className="home-stat-num">100000+</div>
                <div className="home-stat-label">Searches/Day</div>
              </div>
              <div className="home-stat">
                <div className="home-stat-num">99.9%</div>
                <div className="home-stat-label">Uptime</div>
              </div>
              <div className="home-stat">
                <div className="home-stat-num">500ms</div>
                <div className="home-stat-label">Response</div>
              </div>
            </div>
            {/* <div className="home-app-cta">
              <div className="home-app-cta-text">
                <strong>Get the App</strong>
                <span>Scan QR or tap below</span>
              </div>
              <div className="home-app-buttons">
                <button className="home-store-btn" type="button">▶ Play Store</button>
                <button className="home-store-btn" type="button"> App Store</button>
              </div>
            </div> */}
          </div>
          <HeroLoginCard />
        </div>
      </section>

      {/* Services */}
      <section className="home-services" id="services">
        <div className="home-section-inner">
          <div className="home-section-head">
            <h2>Our Services</h2>
            <p>
              FASTag-based vehicle tracking, document verification, and fleet management
              tools built for India&apos;s transport and logistics industry.
            </p>
          </div>

          <div className="home-tabs">
            {SERVICE_TABS.map((t) => (
              <button
                key={t.key}
                className={`home-tab ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
                type="button"
              >
                <span className="home-tab-icon">{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          <div className="home-services-grid">
            <div className="home-services-feature">
              <h3>{tab.heroTitle}</h3>
              <p>{tab.heroDesc}</p>
              <Link to="/register" className="btn btn-accent">Get Started</Link>
            </div>
            <div className="home-services-cards">
              {tab.cards.map((c) => (
                <div className="home-service-card" key={c.title}>
                  <div className="home-service-icon">{c.icon}</div>
                  <h4>{c.title}</h4>
                  <p>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="home-why" id="why-us">
        <div className="home-section-inner home-why-inner">
          <div className="home-why-copy">
            <span className="home-eyebrow-pill">⚡ Why Choose Us</span>
            <h2>Designed to Solve the Challenges You Face Every Day.</h2>
            <p>
              From vehicle tracking to compliance management, we help streamline
              every challenge in your fleet operations.
            </p>
            <a href="#services" className="home-explore-link">Explore Our Platform</a>
          </div>
          <div className="home-why-grid">
            {WHY_US.map((w) => (
              <div className="home-why-card" key={w.title}>
                <div className="home-why-icon">{w.icon}</div>
                <div>
                  <div className="home-why-title">{w.title}</div>
                  <div className="home-why-desc">{w.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="home-footer">
        <div className="home-section-inner home-footer-inner">
          <div className="home-brand home-footer-brand">
            <img src={logo} alt="FASTag Tracker" className="home-brand-logo" />
            <span>FASTag Tracking</span>
          </div>
          <div className="home-footer-links">
            <Link to="/login">Sign In</Link>
            <Link to="/register">Sign Up</Link>
            <a href="#services">Services</a>
          </div>
          <div className="home-footer-copy">© {new Date().getFullYear()} Fastag Tracking. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
