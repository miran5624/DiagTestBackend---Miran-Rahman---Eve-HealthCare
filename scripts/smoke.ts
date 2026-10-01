/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-require-imports */
import { env } from '../src/config/env';
import crypto from 'crypto';

const API_URL = `http://localhost:${env.PORT || 3000}`;
const USER_EMAIL = `smoke-${Date.now()}@example.com`;
const PASSWORD = 'Password1';

async function main() {
  console.log('--- Starting Smoke Test ---');

  // 1. Signup
  const signupRes = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: USER_EMAIL, password: PASSWORD, name: 'Smoke User' })
  });
  if (!signupRes.ok) throw new Error(`Signup failed: ${signupRes.status}`);
  const signupData = await signupRes.json();
  const token = signupData.token;
  console.log('1. Signup successful');

  // 2. Login
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: USER_EMAIL, password: PASSWORD })
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
  console.log('2. Login successful');

  // We skipped Centers & Tests API, so we'll fetch them directly from DB for test purposes
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const ct = await prisma.centreTest.findFirst();
  if (!ct) throw new Error('No CentreTest found in DB');

  // 3. Create booking
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5);
  const bookingRes = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ centreId: ct.centreId, testId: ct.testId, appointmentAt: futureDate.toISOString() })
  });
  if (!bookingRes.ok) throw new Error(`Booking failed: ${bookingRes.status}`);
  const bookingData = await bookingRes.json();
  const bookingId = bookingData.id;
  console.log('3. Booking created, ID:', bookingId);

  // We skipped Payments API, but the Webhook updates payment and booking
  // We need to create a payment manually to test webhook
  const payment = await prisma.payment.create({
    data: {
      bookingId,
      userId: signupData.user.id,
      amountPaise: 5000,
      status: 'PENDING',
      providerReference: `prov-${bookingId}`
    }
  });

  // 4. Pay (SUCCESS) webhook
  const sendWebhook = async (status: string, eventId: string, providerReference: string) => {
    const payload = { eventId, providerReference, status, occurredAt: new Date().toISOString() };
    const bodyString = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', env.WEBHOOK_SECRET || 'secret').update(bodyString).digest('hex');

    return fetch(`${API_URL}/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-signature': signature },
      body: bodyString
    });
  };

  const whRes = await sendWebhook('SUCCESS', `evt-${Date.now()}`, payment.providerReference!);
  if (!whRes.ok) throw new Error(`Webhook failed: ${whRes.status}`);
  console.log('4. Webhook SUCCESS sent');

  // 5. Verify CONFIRMED
  const b1 = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (b1?.status !== 'CONFIRMED') throw new Error(`Booking not CONFIRMED, got ${b1?.status}`);
  console.log('5. Booking is CONFIRMED');

  // 6. Send the same webhook 3 times
  const eventId2 = `evt-${Date.now()}`;
  await Promise.all([
    sendWebhook('FAILED', eventId2, payment.providerReference!),
    sendWebhook('FAILED', eventId2, payment.providerReference!),
    sendWebhook('FAILED', eventId2, payment.providerReference!),
  ]);
  
  // 7. Verify nothing changed
  const b2 = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (b2?.status !== 'CONFIRMED') throw new Error(`Booking state changed improperly! Got ${b2?.status}`);
  const weCounts = await prisma.webhookEvent.count({ where: { eventId: eventId2 } });
  if (weCounts !== 1) throw new Error(`Expected exactly 1 webhook event, got ${weCounts}`);
  console.log('6 & 7. Idempotency verified');

  console.log('--- Smoke Test Passed ---');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
