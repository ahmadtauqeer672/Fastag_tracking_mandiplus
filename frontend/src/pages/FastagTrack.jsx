import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Api } from '../api/client.js';
import { EmptyState, ErrorBanner, Spinner } from '../components/Common.jsx';
import { downloadFastagReport } from '../fastagReport.js';

// Formats "2026-09-17 05:57:02" -> "17 Sep, 5:57 AM"
function formatPingTime(positionTime) {
  if (!positionTime) return '';
  const iso = positionTime.replace(' ', 'T');
  const d = new Date(iso);
  if (isNaN(d.getTime())) return positionTime; // fall back to raw string if unparseable
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day} ${month}, ${time}`;
}

// Unique FASTag vehicle numbers from search history, most recent first.
function recentVehicles(history, max = 8) {
  const seen = [];
  history.forEach((h) => {
    if (h.query_type === 'fastag' && !seen.includes(h.query)) seen.push(h.query);
  });
  return seen.slice(0, max);
}

function sortNewestFirst(locations) {
  return [...locations].sort((a, b) => {
    const ta = a.position_time ? new Date(a.position_time.replace(' ', 'T')).getTime() : 0;
    const tb = b.position_time ? new Date(b.position_time.replace(' ', 'T')).getTime() : 0;
    return tb - ta;
  });
}

export default function FastagTrack() {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [recent, setRecent] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoSearched = useRef(false);

  function loadRecent() {
    Api.searchHistory().then((h) => setRecent(recentVehicles(h))).catch(() => {});
  }

  useEffect(() => {
    loadRecent();
    // Arriving from History's "Search again" link: run that search once.
    const fromHistory = searchParams.get('vehicle');
    if (fromHistory && !autoSearched.current) {
      autoSearched.current = true;
      setSearchParams({}, { replace: true });
      doFetch(fromHistory);
    }
  }, []);

  async function doDownload() {
    setDownloading(true);
    try {
      await downloadFastagReport(result);
    } catch (err) {
      setError(`Could not generate report: ${err.message}`);
    }
    setDownloading(false);
  }

  async function doFetch(number = vehicleNumber) {
    const query = number.trim();
    if (!query) return;
    setVehicleNumber(query);
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await Api.fastagLiveLocation(query);
      setResult({ ...r, locations: sortNewestFirst(r.locations) });
    } catch (err) {
      setError(err.message);
    }
    loadRecent();
    setLoading(false);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>FASTag live location </h1>
          <div className="sub">Live toll-plaza pings for a vehicle, resolved to city / state / pincode</div>
        </div>
      </div>

      <div className="card">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Enter vehicle number, e.g. UK06CXXX"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doFetch()}
          />
          <button className="btn btn-primary" onClick={() => doFetch()} disabled={loading}>
            {loading ? <Spinner /> : 'Fetch location'}
          </button>
        </div>
        {recent.length > 0 && (
          <div className="recent-searches">
            <span className="recent-label">Recent:</span>
            {recent.map((v) => (
              <button key={v} type="button" className="recent-chip" onClick={() => doFetch(v)} disabled={loading}>
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="card" style={{ marginTop: 16 }}>
          <ErrorBanner message={error} />
        </div>
      )}

      {result && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="page-header" style={{ marginBottom: 14 }}>
            <h1 style={{ fontSize: 16 }}>
              {result.vehicle_no} <span style={{ color: 'var(--ink-soft)', fontWeight: 500 }}>· {result.count} ping{result.count === 1 ? '' : 's'}</span>
            </h1>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={doDownload}
              disabled={downloading || result.locations.length === 0}
            >
              {downloading ? <Spinner /> : 'Download'}
            </button>
          </div>
          {result.locations.length === 0 ? (
            <EmptyState emoji="📡" title="No live pings found" desc="This vehicle has no recent FASTag toll crossings. Check the vehicle number or try again later." />
          ) : (
            <div className="fastag-route">
              {result.locations.map((loc, i) => {
                const isLatest = i === 0;
                const hasAddress = loc.geocode_source !== 'error' && loc.city;
                return (
                  <div className={`fastag-ping ${isLatest ? 'fastag-ping-latest' : ''}`} key={i}>
                    <div className="fastag-ping-rail">
                      <div className="fastag-ping-dot">{isLatest ? '📍' : ''}</div>
                      {i !== result.locations.length - 1 && <div className="fastag-ping-line" />}
                    </div>
                    <div className="fastag-ping-body">
                      <div className="fastag-ping-header">
                        <span className="fastag-ping-title">{loc.toll_plaza || 'Unknown toll plaza'}</span>
                        {isLatest && <span className="fastag-latest-badge">Latest</span>}
                      </div>
                      <div className="fastag-ping-meta">
                        {hasAddress ? (
                          <span className="fastag-ping-address">
                            {loc.city}{loc.state ? `, ${loc.state}` : ''}{loc.pincode ? ` – ${loc.pincode}` : ''}
                          </span>
                        ) : (
                          <span className="fastag-ping-address fastag-ping-address-missing" title={loc.geocode_error || ''}>
                            Address unavailable
                          </span>
                        )}
                        {loc.position_time && (
                          <span className="fastag-ping-time">{formatPingTime(loc.position_time)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
