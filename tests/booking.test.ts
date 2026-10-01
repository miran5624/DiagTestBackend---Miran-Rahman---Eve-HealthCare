/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app, prisma } from '../src/app';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';

describe('Booking routes', () => {
  const token = jwt.sign({ sub: 'user-123' }, env.JWT_SECRET);
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 10);
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /bookings', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).post('/bookings').send({});
      expect(res.status).toBe(401);
    });

    it('should return 400 for past date', async () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      const res = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({ centreId: validUuid, testId: validUuid, appointmentAt: past.toISOString() });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('future');
    });

    it('should return 404 if centre does not offer test', async () => {
      vi.spyOn(prisma.centreTest, 'findUnique').mockResolvedValue(null);
      const res = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({ centreId: validUuid, testId: validUuid, appointmentAt: futureDate.toISOString() });
      expect(res.status).toBe(404);
    });

    it('should create booking on success', async () => {
      vi.spyOn(prisma.centreTest, 'findUnique').mockResolvedValue({ id: validUuid, pricePaise: 500, isActive: true } as any);
      vi.spyOn(prisma.booking, 'create').mockResolvedValue({ id: 'b1', amountPaise: 500, status: 'PENDING' } as any);

      const res = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({ centreId: validUuid, testId: validUuid, appointmentAt: futureDate.toISOString() });
      
      expect(res.status).toBe(201);
      expect(res.body.id).toBe('b1');
    });
  });

  describe('Booking State Machine', () => {
    it('should allow PENDING to CONFIRMED', async () => {
      const { BookingStateMachine } = await import('../src/services/bookingStateMachine');
      expect(BookingStateMachine.canTransition('PENDING', 'CONFIRMED')).toBe(true);
    });
    it('should not allow CANCELLED to CONFIRMED', async () => {
      const { BookingStateMachine } = await import('../src/services/bookingStateMachine');
      expect(BookingStateMachine.canTransition('CANCELLED', 'CONFIRMED')).toBe(false);
    });
  });

  describe('GET /bookings/:id', () => {
    it('should return 404 for not found', async () => {
      vi.spyOn(prisma.booking, 'findUnique').mockResolvedValue(null);
      const res = await request(app).get(`/bookings/${validUuid}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('should return 404 if booking belongs to other user', async () => {
      vi.spyOn(prisma.booking, 'findUnique').mockResolvedValue({ id: validUuid, userId: 'other-user' } as any);
      const res = await request(app).get(`/bookings/${validUuid}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('should return booking', async () => {
      vi.spyOn(prisma.booking, 'findUnique').mockResolvedValue({ id: validUuid, userId: 'user-123' } as any);
      const res = await request(app).get(`/bookings/${validUuid}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(validUuid);
    });
  });

  describe('POST /bookings/:id/cancel', () => {
    it('should cancel pending booking', async () => {
      vi.spyOn(prisma.booking, 'findUnique').mockResolvedValue({ id: validUuid, userId: 'user-123', status: 'PENDING' } as any);
      vi.spyOn(prisma.booking, 'update').mockResolvedValue({ id: validUuid, status: 'CANCELLED' } as any);
      const res = await request(app).post(`/bookings/${validUuid}/cancel`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');
    });

    it('should return 200 when cancelling already cancelled booking', async () => {
      vi.spyOn(prisma.booking, 'findUnique').mockResolvedValue({ id: validUuid, userId: 'user-123', status: 'CANCELLED' } as any);
      const res = await request(app).post(`/bookings/${validUuid}/cancel`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');
    });
  });
});
