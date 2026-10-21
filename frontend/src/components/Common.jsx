import React from 'react';

export function Spinner({ dark = false }) {
  return <span className="spinner" style={dark ? { borderTopColor: 'var(--navy)', borderColor: 'rgba(11,61,110,0.2)' } : undefined} />;
}

export function EmptyState({ emoji, title, desc }) {
  return (
    <div className="empty-state">
      <div className="emoji">{emoji}</div>
      <div className="title">{title}</div>
      {desc ? <div className="desc">{desc}</div> : null}
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return <div className="error-banner">{message}</div>;
}

export function SuccessBanner({ message }) {
  if (!message) return null;
  return <div className="success-banner">{message}</div>;
}

export function StatusBadge({ status, statusClass }) {
  return (
    <span className={`status-badge ${statusClass(status)}`}>
      <span className="dot" />
      {status}
    </span>
  );
}
