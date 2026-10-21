import crypto from 'node:crypto';
import { db, auditLog } from '../common/db.js';
import { HttpError } from '../auth/service.js';

export function addVehicle(ownerId, { vehicle_no, vehicle_type, driver_name, driver_phone }) {
  if (!vehicle_no) throw new HttpError(400, 'vehicle_no is required');
  const vNo = vehicle_no.trim().toUpperCase();
  const existing = db.prepare(`SELECT id FROM vehicles WHERE vehicle_no = ?`).get(vNo);
  if (existing) throw new HttpError(409, 'vehicle already added to a fleet');

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO vehicles (id, vehicle_no, owner_id, vehicle_type, driver_name, driver_phone, status)
    VALUES (?, ?, ?, ?, ?, ?, 'idle')
  `).run(id, vNo, ownerId, vehicle_type || null, driver_name || null, driver_phone || null);

  auditLog(ownerId, 'vehicle_added_to_fleet', { vehicle_no: vNo });
  return getVehicle(id);
}

export function listFleet(ownerId) {
  return db.prepare(`SELECT * FROM vehicles WHERE owner_id = ? ORDER BY created_at DESC`).all(ownerId);
}

export function getVehicle(id) {
  return db.prepare(`SELECT * FROM vehicles WHERE id = ?`).get(id);
}

export function updateVehicleStatus(ownerId, vehicleId, status) {
  if (!['idle', 'in_transit', 'active'].includes(status)) {
    throw new HttpError(400, 'invalid status');
  }
  const vehicle = db.prepare(`SELECT * FROM vehicles WHERE id = ? AND owner_id = ?`).get(vehicleId, ownerId);
  if (!vehicle) throw new HttpError(404, 'vehicle not found in your fleet');
  db.prepare(`UPDATE vehicles SET status = ? WHERE id = ?`).run(status, vehicleId);
  return getVehicle(vehicleId);
}

export function removeVehicle(ownerId, vehicleId) {
  const vehicle = db.prepare(`SELECT * FROM vehicles WHERE id = ? AND owner_id = ?`).get(vehicleId, ownerId);
  if (!vehicle) throw new HttpError(404, 'vehicle not found in your fleet');
  db.prepare(`DELETE FROM vehicles WHERE id = ?`).run(vehicleId);
  auditLog(ownerId, 'vehicle_removed_from_fleet', { vehicle_no: vehicle.vehicle_no });
  return { removed: true };
}
