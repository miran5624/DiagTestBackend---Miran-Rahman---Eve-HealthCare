/* eslint-disable no-console */
import crypto from 'crypto';
import { env } from '../src/config/env';

async function main() {
  const payload = {
    eventId: `evt-${Date.now()}`,
    providerReference: 'ref-12345',
    status: 'SUCCESS',
    occurredAt: new Date().toISOString()
  };

  const bodyString = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', env.WEBHOOK_SECRET || 'secret').update(bodyString).digest('hex');

  const res = await fetch(`http://localhost:${env.PORT || 3000}/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature': signature
    },
    body: bodyString
  });

  const data = await res.json();
  console.log(`Status: ${res.status}`, data);
}

main().catch(console.error);
