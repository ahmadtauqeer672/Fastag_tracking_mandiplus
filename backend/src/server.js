import http from 'node:http';
import { sendJson, readBody, getAuthUser } from './common/utils.js';
import { registerUser, loginUser, publicUser, HttpError } from './auth/service.js';
import { searchVehicle, getTrackingHistory, getLatestTracking } from './tracking/service.js';
import { buyCredits, getPaymentHistory, getCreditBalance } from './payments/service.js';
import { getNotificationsForUser, sendManualNotification } from './notifications/service.js';
import { addVehicle, listFleet, updateVehicleStatus, removeVehicle } from './fleet/service.js';
import { getSearchHistory, getUserSummary } from './history/service.js';
import { fetchAndEnrichLiveLocations, getStoredPings } from './fastag/service.js';

const PORT = process.env.PORT || 4000;

function requireAuth(req) {
  const authUser = getAuthUser(req);
  if (!authUser) throw new HttpError(401, 'unauthorized: missing or invalid token');
  return authUser;
}

async function router(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const { pathname } = url;
  const method = req.method;

  if (method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  try {
    // ---- Health ----
    if (pathname === '/api/health' && method === 'GET') {
      return sendJson(res, 200, { status: 'ok', service: 'LorryCare API' });
    }

    // ---- Auth (1.0 User Management) ----
    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await readBody(req);
      const result = await registerUser(body);
      return sendJson(res, 201, result);
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await readBody(req);
      const result = await loginUser(body);
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const authUser = requireAuth(req);
      return sendJson(res, 200, { user: await publicUser(authUser.sub) });
    }

    // ---- Tracking (2.0 Vehicle / E-Way Bill Search & Tracking) ----
    if (pathname === '/api/vehicles/search' && method === 'GET') {
      const authUser = requireAuth(req);
      const vehicleNo = url.searchParams.get('vehicle_no');
      const result = await searchVehicle(authUser.sub, vehicleNo);
      return sendJson(res, 200, result);
    }

    const trackMatch = pathname.match(/^\/api\/track\/([^/]+)$/);
    if (trackMatch && method === 'GET') {
      requireAuth(req);
      const result = await getLatestTracking(decodeURIComponent(trackMatch[1]));
      return sendJson(res, 200, result);
    }

    const trackHistoryMatch = pathname.match(/^\/api\/track\/([^/]+)\/history$/);
    if (trackHistoryMatch && method === 'GET') {
      requireAuth(req);
      const result = await getTrackingHistory(decodeURIComponent(trackHistoryMatch[1]));
      return sendJson(res, 200, result);
    }

    // ---- Payments (4.0 Payment & Credit Management) ----
    if (pathname === '/api/payments/create' && method === 'POST') {
      const authUser = requireAuth(req);
      const body = await readBody(req);
      const result = await buyCredits(authUser.sub, body);
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/payments/history' && method === 'GET') {
      const authUser = requireAuth(req);
      return sendJson(res, 200, await getPaymentHistory(authUser.sub));
    }

    if (pathname === '/api/credits/balance' && method === 'GET') {
      const authUser = requireAuth(req);
      return sendJson(res, 200, { balance: await getCreditBalance(authUser.sub) });
    }

    // ---- Notifications (5.0 Notification & Communication) ----
    if (pathname === '/api/notifications' && method === 'GET') {
      const authUser = requireAuth(req);
      return sendJson(res, 200, await getNotificationsForUser(authUser.sub));
    }

    if (pathname === '/api/notifications/send' && method === 'POST') {
      const authUser = requireAuth(req);
      const body = await readBody(req);
      const result = await sendManualNotification(authUser.sub, body);
      return sendJson(res, 200, result);
    }

    // ---- Fleet (6.0 Fleet Management) ----
    if (pathname === '/api/fleet/add' && method === 'POST') {
      const authUser = requireAuth(req);
      const body = await readBody(req);
      const result = await addVehicle(authUser.sub, body);
      return sendJson(res, 201, result);
    }

    if (pathname === '/api/fleet/list' && method === 'GET') {
      const authUser = requireAuth(req);
      return sendJson(res, 200, await listFleet(authUser.sub));
    }

    const fleetStatusMatch = pathname.match(/^\/api\/fleet\/([^/]+)\/status$/);
    if (fleetStatusMatch && method === 'PUT') {
      const authUser = requireAuth(req);
      const body = await readBody(req);
      const result = await updateVehicleStatus(authUser.sub, fleetStatusMatch[1], body.status);
      return sendJson(res, 200, result);
    }

    const fleetDeleteMatch = pathname.match(/^\/api\/fleet\/([^/]+)$/);
    if (fleetDeleteMatch && method === 'DELETE') {
      const authUser = requireAuth(req);
      const result = await removeVehicle(authUser.sub, fleetDeleteMatch[1]);
      return sendJson(res, 200, result);
    }

    // ---- History (6.0 History & Fleet Management) ----
    if (pathname === '/api/history/search' && method === 'GET') {
      const authUser = requireAuth(req);
      return sendJson(res, 200, await getSearchHistory(authUser.sub));
    }

    if (pathname === '/api/history/summary' && method === 'GET') {
      const authUser = requireAuth(req);
      return sendJson(res, 200, await getUserSummary(authUser.sub));
    }

    // ---- FASTag live tracking (Traqo integration) ----
    if (pathname === '/api/fastag/live-location' && method === 'POST') {
      const authUser = requireAuth(req);
      const body = await readBody(req);
      const result = await fetchAndEnrichLiveLocations(authUser.sub, body.vehicle_number);
      return sendJson(res, 200, result);
    }

    const fastagHistoryMatch = pathname.match(/^\/api\/fastag\/history\/([^/]+)$/);
    if (fastagHistoryMatch && method === 'GET') {
      requireAuth(req);
      const limit = Number(url.searchParams.get('limit')) || 50;
      const result = await getStoredPings(decodeURIComponent(fastagHistoryMatch[1]), limit);
      return sendJson(res, 200, result);
    }

    // ---- Not found ----
    return sendJson(res, 404, { error: 'not found' });
  } catch (err) {
    if (err instanceof HttpError) {
      return sendJson(res, err.status, { error: err.message });
    }
    console.error(err);
    return sendJson(res, 500, { error: 'internal server error' });
  }
}

const server = http.createServer(router);
server.listen(PORT, () => {
  console.log(`LorryCare backend running at http://localhost:${PORT}`);
});
