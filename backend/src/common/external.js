// Mocked external integrations, simulating the DFD Level 0 external entities:
// Government Databases (UIDAI/VAHAN/ULIP/E-Way Bill/FASTag/Toll), Payment Gateway, Meta WhatsApp API / Email.
// In production these would be real HTTP calls to government/payment/Meta APIs.

const TOLL_PLAZAS = [
  'Hosur Plaza', 'Krishnagiri Toll', 'Ranipet Toll', 'Walajahpet Plaza',
  'Attibele Plaza', 'Electronic City Toll', 'Bagalur Plaza',
];

const CITIES = [
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Hosur', lat: 12.7409, lng: 77.8253 },
  { name: 'Krishnagiri', lat: 12.5186, lng: 78.2137 },
  { name: 'Vellore', lat: 12.9165, lng: 79.1325 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Simulates a call to VAHAN / ULIP / E-Way Bill government systems.
export async function fetchGovernmentVehicleData(vehicleNo) {
  await simulateLatency();
  const validTill = new Date(Date.now() + 1000 * 60 * 60 * 24 * (5 + Math.floor(Math.random() * 20)));
  const city = rand(CITIES);
  return {
    vehicle_no: vehicleNo,
    registered: true,
    vehicle_class: rand(['Heavy Goods Vehicle', 'Medium Goods Vehicle', 'Light Goods Vehicle']),
    owner_verified: true,
    eway_bill_no: `EWB${Math.floor(100000000000 + Math.random() * 899999999999)}`,
    eway_valid_till: validTill.toISOString().slice(0, 10),
    current_location: { name: city.name, lat: city.lat + (Math.random() - 0.5) * 0.05, lng: city.lng + (Math.random() - 0.5) * 0.05 },
    last_toll_plaza: rand(TOLL_PLAZAS),
    status: rand(['In Transit', 'Halted', 'Reached Destination']),
    fastag_balance: Math.floor(200 + Math.random() * 2000),
  };
}

// Simulates the Payment Gateway (UPI / Cards / Net Banking).
export async function processPayment({ amount, method }) {
  await simulateLatency();
  // Simulate near-always success, small chance of failure to reflect realistic flow.
  const success = Math.random() > 0.03;
  return {
    success,
    reference_id: `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`,
    amount,
    method,
    status: success ? 'success' : 'failed',
  };
}

// Simulates the Meta WhatsApp Cloud API.
export async function sendWhatsAppMessage({ to, message }) {
  await simulateLatency();
  const delivered = Math.random() > 0.05;
  return {
    delivered,
    status: delivered ? 'sent' : 'failed',
    message_id: `wamid.${Date.now()}${Math.floor(Math.random() * 1000)}`,
  };
}

// Simulates an SMTP/SES email send (fallback channel).
export async function sendEmail({ to, subject, message }) {
  await simulateLatency();
  return { delivered: true, status: 'sent', message_id: `email-${Date.now()}` };
}

function simulateLatency() {
  return new Promise((resolve) => setTimeout(resolve, 80 + Math.random() * 120));
}
