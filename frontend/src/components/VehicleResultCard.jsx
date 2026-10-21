import React from 'react';
import { StatusBadge } from './Common.jsx';
import { statusClass } from '../utils.js';

export default function VehicleResultCard({ result }) {
  return (
    <div className="grid-2">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span className="mono" style={{ fontWeight: 700, fontSize: 15 }}>{result.vehicle_no}</span>
          <StatusBadge status={result.status} statusClass={statusClass} />
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.9 }}>
          <div>📍 Near <strong style={{ color: 'var(--ink)' }}>{result.location.name}</strong></div>
          <div>🛣️ Last toll: <strong style={{ color: 'var(--ink)' }}>{result.last_toll_plaza}</strong></div>
          <div>📄 E-Way Bill <span className="mono">{result.eway_bill_no}</span> valid till {result.eway_valid_till}</div>
          <div>🚛 {result.vehicle_class} · FASTag balance ₹{result.fastag_balance}</div>
        </div>
      </div>
      <div className="map-frame">
        <svg viewBox="0 0 300 200" preserveAspectRatio="none">
          <path d="M0,140 Q80,100 150,120 T300,90" stroke="#c3d9ef" strokeWidth="10" fill="none" strokeLinecap="round" />
        </svg>
        <div className="truck-pin" style={{ left: '52%', top: '55%' }}>🚚</div>
        <div className="pin-label" style={{ left: '52%', top: '55%' }}>{result.location.name}</div>
      </div>
    </div>
  );
}
