import crypto from 'node:crypto';
import { db, auditLog } from '../common/db.js';
import { processPayment } from '../common/external.js';
import { HttpError } from '../auth/service.js';

const CREDIT_PACKAGES = {
  100: 100,
  500: 550, // bonus credits for bigger packages
  1000: 1200,
};

// 4.1 Create Payment Request -> 4.2 Process Payment -> 4.3 Update Credits -> 4.4 Generate Transaction Record
export async function buyCredits(userId, { amount, method }) {
  if (!CREDIT_PACKAGES[amount]) {
    throw new HttpError(400, `invalid package amount; choose from ${Object.keys(CREDIT_PACKAGES).join(', ')}`);
  }
  if (!method) throw new HttpError(400, 'payment method is required');

  const paymentId = crypto.randomUUID();
  const creditsToAdd = CREDIT_PACKAGES[amount];

  // 4.1 Create Payment Request
  await db.prepare(`
    INSERT INTO payments (id, user_id, amount, credits_purchased, method, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(paymentId, userId, amount, creditsToAdd, method);

  // 4.2 Process Payment (mocked gateway call)
  const result = await processPayment({ amount, method });

  if (result.success) {
    await db.prepare(`UPDATE payments SET status = 'success' WHERE id = ?`).run(paymentId);
    // 4.3 Update Credits
    const existing = await db.prepare(`SELECT user_id FROM credits WHERE user_id = ?`).get(userId);
    if (existing) {
      await db.prepare(`UPDATE credits SET balance = balance + ? WHERE user_id = ?`).run(creditsToAdd, userId);
    } else {
      await db.prepare(`INSERT INTO credits (user_id, balance) VALUES (?, ?)`).run(userId, creditsToAdd);
    }
  } else {
    await db.prepare(`UPDATE payments SET status = 'failed' WHERE id = ?`).run(paymentId);
  }

  await auditLog(userId, 'payment_attempt', { paymentId, amount, method, success: result.success });

  const balance = await db.prepare(`SELECT balance FROM credits WHERE user_id = ?`).get(userId);

  // 4.4 Generate Transaction Record (returned to client / receipt)
  return {
    payment_id: paymentId,
    reference_id: result.reference_id,
    status: result.status,
    amount,
    credits_purchased: result.success ? creditsToAdd : 0,
    credits_balance: balance ? balance.balance : 0,
  };
}

export async function getPaymentHistory(userId) {
  return await db.prepare(`SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`).all(userId);
}

export async function getCreditBalance(userId) {
  const row = await db.prepare(`SELECT balance FROM credits WHERE user_id = ?`).get(userId);
  return row ? row.balance : 0;
}
