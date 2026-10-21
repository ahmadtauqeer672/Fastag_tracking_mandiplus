import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Api } from '../api/client.js';
import { EmptyState, ErrorBanner } from '../components/Common.jsx';
import { timeAgo } from '../utils.js';

const QUERY_TYPE_LABELS = { fastag: 'FASTag', vehicle_no: 'Vehicle', eway_bill: 'E-way bill' };

const TABS = [
  { key: 'searches', label: 'Searches' },
  { key: 'notifications', label: 'Notifications' },
  // Payments tab hidden while credits are switched off.
];

export default function History() {
  const [tab, setTab] = useState('searches');
  const [searches, setSearches] = useState(null);
  const [notifs, setNotifs] = useState(null);
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([Api.searchHistory(), Api.notifications(), Api.paymentHistory()])
      .then(([s, n, p]) => { setSearches(s); setNotifs(n); setPayments(p); })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <div className="page-header">
        <div><h1>History</h1><div className="sub">Your past searches and alerts</div></div>
      </div>
      <div className="tab-strip">
        {TABS.map((t) => (
          <div key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </div>
        ))}
      </div>
      <div className="card">
        {error && <ErrorBanner message={error} />}

        {tab === 'searches' && searches && (
          searches.length === 0 ? <EmptyState emoji="🔍" title="No searches yet" desc="" /> : (
            <table className="data-table">
              <thead><tr><th>Query</th><th>Type</th><th>When</th><th /></tr></thead>
              <tbody>
                {searches.map((s) => (
                  <tr key={s.id}>
                    <td className="mono">{s.query}</td>
                    <td>{QUERY_TYPE_LABELS[s.query_type] || s.query_type}</td>
                    <td>{timeAgo(s.created_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {s.query_type === 'fastag' && (
                        <Link to={`/app/fastag?vehicle=${encodeURIComponent(s.query)}`} className="btn btn-secondary btn-sm">
                          Search again
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'notifications' && notifs && (
          notifs.length === 0 ? <EmptyState emoji="🔔" title="No notifications yet" desc="" /> : (
            <div className="timeline">
              {notifs.map((n) => (
                <div className="timeline-item" key={n.id}>
                  <div className="t-icon">{n.channel === 'whatsapp' ? '💬' : '✉️'}</div>
                  <div className="t-body">
                    <div className="t-title">{n.message}</div>
                    <div className="t-meta">
                      {n.vehicle_no || ''} ·{' '}
                      <span className={`status-badge ${n.status === 'failed' ? 'failed' : 'active'}`} style={{ padding: '1px 7px' }}>
                        {n.status}
                      </span>{' '}
                      · {timeAgo(n.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'payments' && payments && (
          payments.length === 0 ? <EmptyState emoji="💳" title="No payments yet" desc="" /> : (
            <table className="data-table">
              <thead><tr><th>Amount</th><th>Credits</th><th>Method</th><th>Status</th><th>When</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>₹{p.amount}</td>
                    <td>+{p.credits_purchased}</td>
                    <td>{p.method}</td>
                    <td><span className={`status-badge ${p.status === 'success' ? 'active' : 'failed'}`}>{p.status}</span></td>
                    <td>{timeAgo(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </>
  );
}
