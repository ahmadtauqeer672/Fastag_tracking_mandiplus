import React, { useEffect, useState } from 'react';
import { Api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import { EmptyState, ErrorBanner, Spinner } from '../components/Common.jsx';
import VehicleResultCard from '../components/VehicleResultCard.jsx';
import { timeAgo } from '../utils.js';

export default function Dashboard() {
  const { user, updateCredits } = useAuth();
  const [summary, setSummary] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    Promise.all([Api.historySummary(), Api.notifications()])
      .then(([s, n]) => { setSummary(s); setNotifs(n); })
      .catch((err) => setLoadError(err.message));
  }, []);

  async function doSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError('');
    setResult(null);
    try {
      const r = await Api.searchVehicle(query.trim());
      updateCredits(r.credits_remaining);
      setResult(r);
    } catch (err) {
      setSearchError(err.message);
    }
    setSearching(false);
  }

  if (loadError) return <div className="card"><ErrorBanner message={loadError} /></div>;
  if (!summary) return <EmptyState emoji="" title="" desc="" />;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Welcome, {user.name.split(' ')[0]}</h1>
          <div className="sub">Here's what's happening with your fleet today</div>
        </div>
        <div className="credit-pill">💳 {user.credits} credits</div>
      </div>

      <div className="card">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search vehicle number or E-Way Bill (e.g. KA05AB1234)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          />
          <button className="btn btn-primary" onClick={doSearch} disabled={searching}>
            {searching ? <Spinner /> : 'Search'}
          </button>
        </div>
        <div style={{ marginTop: 14 }}>
          {searchError && <ErrorBanner message={searchError} />}
          {result && <VehicleResultCard result={result} />}
        </div>
      </div>

      <div className="grid-2 grid-even" style={{ marginTop: 16 }}>
        <div className="stat-tile"><div className="stat-value">{summary.total_searches}</div><div className="stat-label">Vehicle searches</div></div>
        <div className="stat-tile"><div className="stat-value">₹{summary.total_spent}</div><div className="stat-label">Total spent on credits</div></div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="page-header" style={{ marginBottom: 10 }}>
          <h1 style={{ fontSize: 16 }}>Recent notifications</h1>
        </div>
        {notifs.length === 0 ? (
          <EmptyState emoji="🔔" title="No notifications yet" desc="Search a vehicle to start receiving live updates." />
        ) : (
          <div className="timeline">
            {notifs.slice(0, 5).map((n) => (
              <div className="timeline-item" key={n.id}>
                <div className="t-icon">{n.channel === 'whatsapp' ? '💬' : '✉️'}</div>
                <div className="t-body">
                  <div className="t-title">{n.message}</div>
                  <div className="t-meta">{n.vehicle_no || ''} · {timeAgo(n.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
