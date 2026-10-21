import crypto from 'node:crypto';
import { db, auditLog } from '../common/db.js';
import { sendWhatsAppMessage, sendEmail } from '../common/external.js';

const TEMPLATES = {
  trip_started: (v) => `🚚 Trip Started for vehicle ${v}. We'll keep you posted on the journey.`,
  toll_crossing: (v, d) => `🛣️ Vehicle ${v} crossed ${d.last_toll_plaza || 'a toll plaza'}.`,
  location_update: (v, d) => `📍 Vehicle ${v} is now near ${d.current_location?.name || 'unknown location'}. Status: ${d.status}.`,
  delay: (v) => `⚠️ Vehicle ${v} is delayed. We'll notify you once it's moving again.`,
  reached_destination: (v) => `✅ Vehicle ${v} has reached its destination.`,
  eway_status: (v, d) => `📄 E-Way Bill for ${v} is valid till ${d.eway_valid_till}.`,
  custom: (v, d) => d.customMessage || `Update for vehicle ${v}.`,
};

// 5.1 Prepare Message (Template + Dynamic Data)
function prepareMessage(eventType, vehicleNo, data) {
  const templateFn = TEMPLATES[eventType] || TEMPLATES.custom;
  return templateFn(vehicleNo, data);
}

// 5.0 full flow: prepare -> send via WhatsApp -> log -> retry/fallback to email on failure
export async function createNotificationForEvent(userId, vehicleNo, eventType, data) {
  const message = prepareMessage(eventType, vehicleNo, data);
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  if (!user) return null;

  // 5.2 Send via Meta WhatsApp API
  const waResult = await sendWhatsAppMessage({ to: user.phone || user.email, message });
  let status = waResult.status;
  let channel = 'whatsapp';

  const notifId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO notifications (id, user_id, vehicle_no, channel, message, event_type, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(notifId, userId, vehicleNo, channel, message, eventType, status);

  // 5.4 Handle Response & Retry -> fallback to Email if WhatsApp failed
  if (!waResult.delivered) {
    const emailResult = await sendEmail({ to: user.email, subject: `LorryCare Alert: ${vehicleNo}`, message });
    const fallbackId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, user_id, vehicle_no, channel, message, event_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(fallbackId, userId, vehicleNo, 'email', message, eventType, emailResult.status === 'sent' ? 'retried' : 'failed');

    auditLog(userId, 'notification_fallback', { vehicleNo, eventType, primaryChannel: 'whatsapp', fallback: 'email' });
  }

  return { notifId, message, status, channel };
}

export function getNotificationsForUser(userId) {
  return db.prepare(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`
  ).all(userId);
}

export async function sendManualNotification(userId, { vehicle_no, event_type, custom_message }) {
  const data = custom_message ? { customMessage: custom_message } : {};
  return createNotificationForEvent(userId, vehicle_no, event_type || 'custom', data);
}
