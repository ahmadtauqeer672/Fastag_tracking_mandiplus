import crypto from 'node:crypto';
import { db, auditLog } from '../common/db.js';
import { fetchLiveLocations, TraqoApiError } from '../common/traqo.js';
import { reverseGeocode } from '../common/geocode.js';
import { HttpError } from '../auth/service.js';

function normalizeVehicleNo(vehicleNo) {
  if (!vehicleNo || typeof vehicleNo !== 'string' || vehicleNo.trim().length < 4) {
    throw new HttpError(400, 'valid vehicle_number is required');
  }
  return vehicleNo.trim().toUpperCase();
}

/**
 * Fetch live FASTag pings for a vehicle from Traqo, reverse-geocode each
 * point's lat/lon into city/state/pincode, persist the enriched pings, and
 * return them (most recent first).
 */
export async function fetchAndEnrichLiveLocations(userId, vehicleNoRaw) {
  const vehicleNo = normalizeVehicleNo(vehicleNoRaw);

  // Record every search (even ones Traqo has no data for) so the user can
  // re-run it from their history.
  if (userId) {
    db.prepare(
      `INSERT INTO search_history (id, user_id, query, query_type) VALUES (?, ?, ?, 'fastag')`
    ).run(crypto.randomUUID(), userId, vehicleNo);
  }

  let rawPings;
  try {
    rawPings = await fetchLiveLocations(vehicleNo);
  } catch (err) {
    if (err instanceof TraqoApiError) {
      throw new HttpError(err.status || 502, `Traqo API error: ${err.message}`);
    }
    throw err;
  }

  // Geocode sequentially (the geocode module internally rate-limits to
  // Nominatim's 1 req/sec policy anyway, so sequential await is correct here).
  const enriched = [];
  for (const ping of rawPings) {
    const lat = ping.lat !== undefined ? Number(ping.lat) : null;
    const lon = ping.lon !== undefined ? Number(ping.lon) : null;
    const geo = await reverseGeocode(lat, lon);

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO fastag_pings
        (id, vehicle_no, latitude, longitude, toll_plaza_address, position_time,
         city, state, pincode, geocode_display_name, geocode_source, fetched_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, vehicleNo, lat, lon, ping.address || null, ping.position_time || null,
      geo.city, geo.state, geo.pincode, geo.display_name, geo.source, userId || null
    );

    enriched.push({
      lat,
      lon,
      toll_plaza: ping.address || null,
      position_time: ping.position_time || null,
      city: geo.city,
      state: geo.state,
      pincode: geo.pincode,
      full_address: geo.display_name,
      geocode_source: geo.source,
      geocode_error: geo.error || null,
    });
  }

  auditLog(userId, 'fastag_live_location_fetch', { vehicleNo, pingCount: enriched.length });

  return { vehicle_no: vehicleNo, count: enriched.length, locations: enriched };
}

export function getStoredPings(vehicleNoRaw, limit = 50) {
  const vehicleNo = normalizeVehicleNo(vehicleNoRaw);
  return db.prepare(
    `SELECT * FROM fastag_pings WHERE vehicle_no = ? ORDER BY created_at DESC LIMIT ?`
  ).all(vehicleNo, limit);
}
