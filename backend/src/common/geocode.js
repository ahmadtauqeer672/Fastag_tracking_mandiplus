// Reverse geocoding: lat/lon -> { city, state, pincode, display_name }
// Uses OpenStreetMap Nominatim (free, no API key). Their usage policy requires:
//   - max 1 request/second
//   - a descriptive User-Agent (and/or an email contact)
// See: https://operations.osmfoundation.org/policies/nominatim/
//
// We enforce the rate limit with a simple queue, and cache results (rounded
// coordinates) in memory so repeated lookups for the same toll plaza don't
// re-hit the API every time.

// Overridable via env var so this can point at a self-hosted Nominatim
// instance (recommended if you have high query volume — see Nominatim's
// usage policy) or a test double during development.
const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = process.env.GEOCODE_USER_AGENT || 'LorryCare/1.0 (fleet-tracking-integration)';
const CONTACT_EMAIL = process.env.GEOCODE_CONTACT_EMAIL || ''; // optional but recommended by Nominatim's policy

const MIN_INTERVAL_MS = 1100; // stay just under 1 req/sec
let lastRequestAt = 0;
let queue = Promise.resolve();

const cache = new Map(); // key: "lat,lon" rounded -> { city, state, pincode, display_name, cachedAt }
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h — toll plaza coordinates don't move

function cacheKey(lat, lon) {
  // Round to 4 decimal places (~11m precision) so nearby pings for the same
  // toll plaza hit the same cache entry instead of re-geocoding every time.
  return `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
}

function throttle(fn) {
  // Chains every geocode call onto a single queue so calls never fire less
  // than MIN_INTERVAL_MS apart, regardless of how many run concurrently.
  const run = queue.then(async () => {
    const wait = Math.max(0, lastRequestAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return fn();
  });
  // Swallow errors in the queue chain itself so one failed request doesn't
  // permanently wedge the throttle for everything after it.
  queue = run.catch(() => {});
  return run;
}

/**
 * Reverse geocode a lat/lon into { city, state, pincode, display_name }.
 * Returns null fields (not a thrown error) if Nominatim has no data for the
 * point or the request fails — callers should treat a partial/empty result
 * as "address unavailable" rather than crash the tracking flow over it.
 */
export async function reverseGeocode(lat, lon) {
  if (lat === undefined || lon === undefined || lat === null || lon === null) {
    return { city: null, state: null, pincode: null, display_name: null, source: 'invalid_coordinates' };
  }

  const key = cacheKey(lat, lon);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { ...cached, source: 'cache' };
  }

  try {
    const result = await throttle(() => fetchNominatim(lat, lon));
    cache.set(key, { ...result, cachedAt: Date.now() });
    return { ...result, source: 'nominatim' };
  } catch (err) {
    // Logged here (not just returned) so the real failure reason shows up in
    // the backend terminal — without this, every failure just looks like a
    // silent "Address unavailable" with no way to diagnose it.
    console.error(`[geocode] reverseGeocode(${lat}, ${lon}) failed:`, err.message);
    return {
      city: null,
      state: null,
      pincode: null,
      display_name: null,
      source: 'error',
      error: err.message,
    };
  }
}

async function fetchNominatim(lat, lon) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lon),
    addressdetails: '1',
    zoom: '18',
  });
  if (CONTACT_EMAIL) params.set('email', CONTACT_EMAIL);

  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });

  if (!res.ok) {
    let bodyText = '';
    try { bodyText = await res.text(); } catch { /* ignore */ }
    throw new Error(`Nominatim request failed: ${res.status} ${res.statusText}${bodyText ? ` — ${bodyText.slice(0, 200)}` : ''}`);
  }

  const data = await res.json();
  const addr = data.address || {};

  // Nominatim doesn't always populate the same field for a "city" depending
  // on how the area is mapped (city vs town vs village vs municipality).
  const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || null;

  return {
    city,
    state: addr.state || null,
    pincode: addr.postcode || null,
    display_name: data.display_name || null,
  };
}
