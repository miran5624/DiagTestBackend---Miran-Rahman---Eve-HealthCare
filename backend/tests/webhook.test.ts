/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app, prisma } from '../src/app';
import crypto from 'crypto';
import { env } from '../src/config/env';

describe('Webhook routes', () => {
  const payload = {
    eventId: 'evt-123',
    providerReference: 'ref-123',
    status: 'SUCCESS',
    occurredAt: new Date().toISOString()
  };
  const bodyString = JSON.stringify(payload);
  const validSignature = crypto.createHmac('sha256', env.WEBHOOK_SECRET).update(bodyString).digest('hex');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /payments/webhook', () => {
    it('should return 401 for missing signature', async () => {
      const res = await request(app).post('/payments/webhook').send(payload);
      expect(res.status).toBe(401);
    });

    it('should return 401 for invalid signature', async () => {
      const res = await request(app)
        .post('/payments/webhook')
        .set('x-signature', 'invalid')
        .send(payload);
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid body', async () => {
      const invalidPayload = { status: 'SUCCESS' };
      const invalidBodyString = JSON.stringify(invalidPayload);
      const invalidSig = crypto.createHmac('sha256', env.WEBHOOK_SECRET).update(invalidBodyString).digest('hex');

      const res = await request(app)
        .post('/payments/webhook')
        .set('x-signature', invalidSig)
        .set('Content-Type', 'application/json')
        .send(invalidBodyString);
      
      expect(res.status).toBe(400);
    });

    it('should handle duplicate eventId', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        const tx = {
          webhookEvent: {
            findUnique: vi.fn().mockResolvedValue({ id: 'we1' }),
          },
        };
        return cb(tx);
      });

      const res = await request(app)
        .post('/payments/webhook')
        .set('x-signature', validSignature)
        .set('Content-Type', 'application/json')
        .send(bodyString);
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('duplicate');
    });

    it('should process webhook and return 200', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        const tx = {
          webhookEvent: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            update: vi.fn(),
          },
          payment: {
            update: vi.fn(),
          },
          booking: {
            findUnique: vi.fn().mockResolvedValue({ id: 'b1', status: 'PENDING' }),
            update: vi.fn(),
          },
          $queryRaw: vi.fn().mockResolvedValue([{ id: 'p1', status: 'PENDING', bookingId: 'b1' }]),
        };
        return cb(tx);
      });

      const res = await request(app)
        .post('/payments/webhook')
        .set('x-signature', validSignature)
        .set('Content-Type', 'application/json')
        .send(bodyString);
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });
});
