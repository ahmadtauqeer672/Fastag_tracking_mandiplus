import crypto from 'node:crypto';
import { db, auditLog } from '../common/db.js';
import { fetchGovernmentVehicleData } from '../common/external.js';
import { HttpError } from '../auth/service.js';
import { createNotificationForEvent } from '../notifications/service.js';

const CREDIT_COST_PER_SEARCH = 5;

// 2.1 Input Validation
function validateVehicleNo(vehicleNo) {
  if (!vehicleNo || typeof vehicleNo !== 'string' || vehicleNo.trim().length < 4) {
    throw new HttpError(400, 'valid vehicle_no is required');
  }
  return vehicleNo.trim().toUpperCase();
}

// 2.0 Vehicle / E-Way Bill Search & Tracking (2.1 -> 2.2 -> 2.3 -> 2.4)
export async function searchVehicle(userId, vehicleNoRaw) {
  const vehicleNo = validateVehicleNo(vehicleNoRaw);

  // Check & deduct credits (ties into 4.0 Payment & Credit Management)
  const credit = db.prepare(`SELECT balance FROM credits WHERE user_id = ?`).get(userId);
  if (!credit || credit.balance < CREDIT_COST_PER_SEARCH) {
    throw new HttpError(402, `insufficient credits: need ${CREDIT_COST_PER_SEARCH}, have ${credit ? credit.balance : 0}`);
  }

  // 2.2 Fetch Data from Govt. APIs (mocked)
  const govData = await fetchGovernmentVehicleData(vehicleNo);

  // Deduct credits only on successful fetch
  db.prepare(`UPDATE credits SET balance = balance - ? WHERE user_id = ?`).run(CREDIT_COST_PER_SEARCH, userId);

  // Persist raw government_data
  db.prepare(
    `INSERT INTO government_data (id, vehicle_no, source, payload) VALUES (?, ?, ?, ?)`
  ).run(crypto.randomUUID(), vehicleNo, 'VAHAN/ULIP/EWAYBILL', JSON.stringify(govData));

  // 2.3 Process & Format Data -> tracking_logs entry
  const trackingId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO tracking_logs
      (id, vehicle_no, latitude, longitude, location_name, status, eway_bill_no, eway_valid_till, toll_plaza, event_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trackingId, vehicleNo,
    govData.current_location.lat, govData.current_location.lng, govData.current_location.name,
    govData.status, govData.eway_bill_no, govData.eway_valid_till, govData.last_toll_plaza,
    'location_update'
  );

  // Record in search history (6.0)
  db.prepare(
    `INSERT INTO search_history (id, user_id, query, query_type) VALUES (?, ?, ?, ?)`
  ).run(crypto.randomUUID(), userId, vehicleNo, 'vehicle_no');

  auditLog(userId, 'vehicle_search', { vehicleNo });

  // Fire an async notification (5.0), non-blocking-ish but awaited for demo simplicity
  await createNotificationForEvent(userId, vehicleNo, 'location_update', govData);

  const remainingCredits = db.prepare(`SELECT balance FROM credits WHERE user_id = ?`).get(userId).balance;

  // 2.4 Display Tracking Details
  return {
    vehicle_no: vehicleNo,
    status: govData.status,
    location: govData.current_location,
    last_toll_plaza: govData.last_toll_plaza,
    eway_bill_no: govData.eway_bill_no,
    eway_valid_till: govData.eway_valid_till,
    fastag_balance: govData.fastag_balance,
    vehicle_class: govData.vehicle_class,
    credits_remaining: remainingCredits,
    tracking_id: trackingId,
  };
}

export function getTrackingHistory(vehicleNo) {
  const vNo = validateVehicleNo(vehicleNo);
  return db.prepare(
    `SELECT * FROM tracking_logs WHERE vehicle_no = ? ORDER BY created_at DESC LIMIT 50`
  ).all(vNo);
}

export function getLatestTracking(vehicleNo) {
  const vNo = validateVehicleNo(vehicleNo);
  const row = db.prepare(
    `SELECT * FROM tracking_logs WHERE vehicle_no = ? ORDER BY created_at DESC LIMIT 1`
  ).get(vNo);
  if (!row) throw new HttpError(404, 'no tracking data found for this vehicle; try searching it first');
  return row;
}
