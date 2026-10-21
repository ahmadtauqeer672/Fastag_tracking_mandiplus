import { db } from '../common/db.js';

export function getSearchHistory(userId) {
  return db.prepare(
    `SELECT * FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`
  ).all(userId);
}

export function getUserSummary(userId) {
  const searches = db.prepare(`SELECT COUNT(*) as c FROM search_history WHERE user_id = ?`).get(userId).c;
  const payments = db.prepare(`SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as total FROM payments WHERE user_id = ? AND status = 'success'`).get(userId);
  const notifications = db.prepare(`SELECT COUNT(*) as c FROM notifications WHERE user_id = ?`).get(userId).c;
  const fleetSize = db.prepare(`SELECT COUNT(*) as c FROM vehicles WHERE owner_id = ?`).get(userId).c;
  return {
    total_searches: searches,
    total_payments: payments.c,
    total_spent: payments.total,
    total_notifications: notifications,
    fleet_size: fleetSize,
  };
}
