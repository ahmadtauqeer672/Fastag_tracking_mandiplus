import React, { useState } from 'react';
import { Api } from '../api/client.js';
import { ErrorBanner, Spinner } from './Common.jsx';

export default function AddVehicleModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ vehicle_no: '', vehicle_type: '', driver_name: '', driver_phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await Api.addFleetVehicle({
        vehicle_no: form.vehicle_no,
        vehicle_type: form.vehicle_type || undefined,
        driver_name: form.driver_name || undefined,
        driver_phone: form.driver_phone || undefined,
      });
      onAdded();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Add vehicle</h2>
        <p className="sub">Add a vehicle to start tracking it under your fleet</p>
        <ErrorBanner message={error} />
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Vehicle number</label>
            <input type="text" placeholder="KA05AB1234" value={form.vehicle_no} onChange={(e) => update('vehicle_no', e.target.value)} required />
          </div>
          <div className="field">
            <label>Vehicle type</label>
            <input type="text" placeholder="Heavy Goods Vehicle" value={form.vehicle_type} onChange={(e) => update('vehicle_type', e.target.value)} />
          </div>
          <div className="field">
            <label>Driver name</label>
            <input type="text" placeholder="Suresh Babu" value={form.driver_name} onChange={(e) => update('driver_name', e.target.value)} />
          </div>
          <div className="field">
            <label>Driver phone</label>
            <input type="text" placeholder="9876500000" value={form.driver_phone} onChange={(e) => update('driver_phone', e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Spinner /> : 'Add vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
