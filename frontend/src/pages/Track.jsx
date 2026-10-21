import React, { useState } from 'react';
import { Api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import { EmptyState, ErrorBanner, Spinner } from '../components/Common.jsx';
import VehicleResultCard from '../components/VehicleResultCard.jsx';
import { timeAgo } from '../utils.js';

export default function Track() {
  const { updateCredits } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  async function doSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await Api.searchVehicle(query.trim());
      updateCredits(r.credits_remaining);
      setResult(r);
      const h = await Api.trackHistory(query.trim());
      setHistory(h);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Track a vehicle</h1>
          <div className="sub">Live location, toll history and E-Way Bill status</div>
        </div>
      </div>

      <div className="card">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Enter vehicle number, e.g. KA05AB1234"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          />
          <button className="btn btn-primary" onClick={doSearch} disabled={loading}>
            {loading ? <Spinner /> : 'Track'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginTop: 16 }}>
          <ErrorBanner message={error} />
        </div>
      )}

      {result && (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <VehicleResultCard result={result} />
          </div>
          <div className="card">
            <div className="page-header" style={{ marginBottom: 10 }}>
              <h1 style={{ fontSize: 16 }}>Movement history</h1>
            </div>
            {history.length === 0 ? (
              <EmptyState emoji="🕓" title="No history yet" desc="" />
            ) : (
              <div className="timeline">
                {history.map((h) => (
                  <div className="timeline-item" key={h.id}>
                    <div className="t-icon">📍</div>
                    <div className="t-body">
                      <div className="t-title">{h.location_name} — {h.status}</div>
                      <div className="t-meta">Toll: {h.toll_plaza || '—'} · {timeAgo(h.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
