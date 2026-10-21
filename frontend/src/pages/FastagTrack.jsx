import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Api } from '../api/client.js';
import { EmptyState, ErrorBanner, Spinner } from '../components/Common.jsx';
import { downloadFastagReport } from '../fastagReport.js';

// Splits "2026-09-17 05:57:02" -> { date: "17 Sep", time: "5:57 AM" }
function splitPingTime(positionTime) {
  if (!positionTime) return null;
  const d = new Date(positionTime.replace(' ', 'T'));
  if (isNaN(d.getTime())) return { date: positionTime, time: '' }; // fall back to raw string if unparseable
  return {
    date: `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })}`,
    time: d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  };
}

const META_ICONS = {
  pin: <><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
};

function MetaIcon({ name }) {
  return (
    <svg className="fastag-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {META_ICONS[name]}
    </svg>
  );
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
                const pingTime = splitPingTime(loc.position_time);
                const address = `${loc.city || ''}${loc.state ? `, ${loc.state}` : ''}${loc.pincode ? ` – ${loc.pincode}` : ''}`;
                return (
                  <div className={`fastag-ping ${isLatest ? 'fastag-ping-latest' : ''}`} key={i}>
                    <div className="fastag-ping-rail">
                      <div className="fastag-ping-dot">{isLatest ? '📍' : ''}</div>
                      {i !== result.locations.length - 1 && <div className="fastag-ping-line" />}
                    </div>
                    <div className="fastag-ping-body">
                      <div className="fastag-ping-header">
                        <span className="fastag-ping-title" title={loc.toll_plaza || ''}>{loc.toll_plaza || 'Unknown toll plaza'}</span>
                        {isLatest && <span className="fastag-latest-badge">Latest</span>}
                        {pingTime && (
                          <div className="fastag-ping-chips">
                            {pingTime.time && <span className="fastag-chip"><MetaIcon name="clock" />{pingTime.time}</span>}
                            <span className="fastag-chip"><MetaIcon name="calendar" />{pingTime.date}</span>
                          </div>
                        )}
                      </div>
                      <div className="fastag-ping-meta">
                        {hasAddress ? (
                          <span className="fastag-ping-address" title={address}>
                            <MetaIcon name="pin" />
                            <span className="fastag-ellipsis">{address}</span>
                          </span>
                        ) : (
                          <span className="fastag-ping-address fastag-ping-address-missing" title={loc.geocode_error || ''}>
                            <MetaIcon name="pin" />
                            Address unavailable
                          </span>
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
