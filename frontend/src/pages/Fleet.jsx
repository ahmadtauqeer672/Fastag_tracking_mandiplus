import React, { useCallback, useEffect, useState } from 'react';
import { Api } from '../api/client.js';
import { EmptyState, ErrorBanner, StatusBadge } from '../components/Common.jsx';
import AddVehicleModal from '../components/AddVehicleModal.jsx';
import { statusClass } from '../utils.js';

export default function Fleet() {
  const [fleet, setFleet] = useState(null);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(() => {
    Api.listFleet().then(setFleet).catch((err) => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onStatusChange(id, status) {
    try {
      await Api.updateFleetStatus(id, status);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function onRemove(id) {
    if (!confirm('Remove this vehicle from your fleet?')) return;
    try {
      await Api.removeFleetVehicle(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Fleet management</h1>
          <div className="sub">Add and manage your vehicles</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add vehicle</button>
      </div>

      <div className="card">
        {error && <ErrorBanner message={error} />}
        {fleet && fleet.length === 0 && (
          <EmptyState emoji="🚛" title="No vehicles yet" desc="Add your first vehicle to start tracking your fleet." />
        )}
        {fleet && fleet.map((v) => (
          <div className="fleet-row" key={v.id}>
            <div className="v-info">
              <div className="v-no">{v.vehicle_no}</div>
              <div className="v-meta">{v.vehicle_type || 'Vehicle'} {v.driver_name ? `· Driver: ${v.driver_name}` : ''}</div>
            </div>
            <div className="v-actions">
              <StatusBadge status={v.status.replace('_', ' ')} statusClass={statusClass} />
              <select
                value={v.status}
                onChange={(e) => onStatusChange(v.id, e.target.value)}
                style={{ border: '1.5px solid var(--line)', borderRadius: 6, padding: '6px 8px', fontSize: 12.5 }}
              >
                <option value="idle">Idle</option>
                <option value="in_transit">In transit</option>
                <option value="active">Active</option>
              </select>
              <button className="btn btn-danger btn-sm" onClick={() => onRemove(v.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <AddVehicleModal
          onClose={() => setShowModal(false)}
          onAdded={() => { setShowModal(false); load(); }}
        />
      )}
    </>
  );
}
