// Client for the Traqo FASTag "fetch live locations" API.
// Docs (from provided screenshot): POST https://dashboard.traqo.in/api/v1/fastag/fetch_live_locations/
//   body: { "vehicle_number": "UK06CXXX" }
//   auth: HTTP Basic (username/password)
//
// Credentials are read from environment variables ONLY — never hardcode them
// here. Set them in backend/.env (see .env.example) or your process manager.

const TRACK_API_URL = process.env.TRACK_API_URL || 'https://dashboard.traqo.in/api/v1/fastag/fetch_live_locations/';
const TRACK_API_USERNAME = process.env.TRACK_API_USERNAME;
const TRACK_API_PASSWORD = process.env.TRACK_API_PASSWORD;

export class TraqoApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'TraqoApiError';
    this.status = status;
  }
}

function basicAuthHeader() {
  if (!TRACK_API_USERNAME || !TRACK_API_PASSWORD) {
    throw new TraqoApiError(
      'TRACK_API_USERNAME / TRACK_API_PASSWORD are not configured on the server (check backend/.env)',
      500
    );
  }
  const token = Buffer.from(`${TRACK_API_USERNAME}:${TRACK_API_PASSWORD}`).toString('base64');
  return `Basic ${token}`;
}

/**
 * Fetch live FASTag location pings for a vehicle number from Traqo.
 * Returns the raw `data` array from Traqo's response:
 *   [{ lat, lon, address, position_time }, ...]
 */
export async function fetchLiveLocations(vehicleNumber) {
  if (!vehicleNumber || typeof vehicleNumber !== 'string') {
    throw new TraqoApiError('vehicle_number is required', 400);
  }

  // Built outside the network try/catch below: a missing-credentials error
  // is a server misconfiguration, not a network failure, and must not be
  // relabeled as "could not reach Traqo API".
  const authHeader = basicAuthHeader();

  let res;
  try {
    res = await fetch(TRACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({ vehicle_number: vehicleNumber }),
    });
  } catch (err) {
    throw new TraqoApiError(`Could not reach Traqo API: ${err.message}`, 502);
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON response body — fall through, handled below via res.ok check.
  }

  if (!res.ok) {
    const msg = (body && (body.message || body.error)) || `Traqo API returned ${res.status}`;
    throw new TraqoApiError(msg, res.status);
  }

  if (!body || body.success !== true || !Array.isArray(body.data)) {
    // Traqo signals business errors (unknown vehicle, no pings, account issues)
    // with HTTP 200 + success:false, so surface its own message when present.
    console.warn(`[traqo] unexpected response for ${vehicleNumber}:`, JSON.stringify(body)?.slice(0, 1000));
    const reason = body && (body.message || body.error || body.detail || body.msg);
    // "Data Not Available!" just means no recent toll pings for this vehicle.
    if (reason && /data not available/i.test(String(reason))) return [];
    if (reason) throw new TraqoApiError(String(reason), 502);
    throw new TraqoApiError('Unexpected response shape from Traqo API', 502);
  }

  return body.data;
}
