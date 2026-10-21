const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('lc_token');
}
function setToken(token) {
  if (token) localStorage.setItem('lc_token', token);
  else localStorage.removeItem('lc_token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const Api = {
  getToken,
  setToken,
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),
  searchVehicle: (vehicleNo) => request(`/vehicles/search?vehicle_no=${encodeURIComponent(vehicleNo)}`),
  track: (vehicleNo) => request(`/track/${encodeURIComponent(vehicleNo)}`),
  trackHistory: (vehicleNo) => request(`/track/${encodeURIComponent(vehicleNo)}/history`),
  buyCredits: (payload) => request('/payments/create', { method: 'POST', body: payload }),
  paymentHistory: () => request('/payments/history'),
  creditBalance: () => request('/credits/balance'),
  notifications: () => request('/notifications'),
  sendNotification: (payload) => request('/notifications/send', { method: 'POST', body: payload }),
  addFleetVehicle: (payload) => request('/fleet/add', { method: 'POST', body: payload }),
  listFleet: () => request('/fleet/list'),
  updateFleetStatus: (id, status) => request(`/fleet/${id}/status`, { method: 'PUT', body: { status } }),
  removeFleetVehicle: (id) => request(`/fleet/${id}`, { method: 'DELETE' }),
  searchHistory: () => request('/history/search'),
  historySummary: () => request('/history/summary'),
  fastagLiveLocation: (vehicleNumber) => request('/fastag/live-location', { method: 'POST', body: { vehicle_number: vehicleNumber } }),
  fastagHistory: (vehicleNumber, limit = 50) => request(`/fastag/history/${encodeURIComponent(vehicleNumber)}?limit=${limit}`),
};
