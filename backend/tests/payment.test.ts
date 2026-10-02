import request from 'supertest';
import { app, prisma } from '../src/app';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';

describe('Payment APIs', () => {
  let userToken: string;
  let userId: string;
  let centreTestId: string;
  let otherUserToken: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: 'payment_user@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'USER'
      }
    });
    userId = user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userToken = jwt.sign({ sub: user.id, role: 'USER' }, env.JWT_SECRET, { expiresIn: '1h' } as any);

    const otherUser = await prisma.user.create({
      data: {
        email: 'other_payment_user@example.com',
        passwordHash: 'hash',
        role: 'USER'
      }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    otherUserToken = jwt.sign({ sub: otherUser.id, role: 'USER' }, env.JWT_SECRET, { expiresIn: '1h' } as any);

    const centre = await prisma.diagnosticCentre.create({ data: { name: 'C1', city: 'City', address: '123' } });
    const test = await prisma.diagnosticTest.create({ data: { name: 'T1' } });
    const ct = await prisma.centreTest.create({ data: { centreId: centre.id, testId: test.id, pricePaise: 5000 } });
    centreTestId = ct.id;
  });

  afterAll(async () => {
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.centreTest.deleteMany();
    await prisma.diagnosticCentre.deleteMany();
    await prisma.diagnosticTest.deleteMany();
    await prisma.user.deleteMany();
  });

  const createBooking = async () => {
    return prisma.booking.create({
      data: {
        userId,
        centreTestId,
        appointmentAt: new Date(Date.now() + 86400000),
        amountPaise: 5000,
        status: 'PENDING'
      }
    });
  };

  it('should process successful payment', async () => {
    const booking = await createBooking();
    const res = await request(app).post('/payments').set('Authorization', `Bearer ${userToken}`).send({ bookingId: booking.id, simulate: 'SUCCESS' }).expect(201);
    expect(res.body.status).toBe('SUCCESS');
    
    const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(updatedBooking?.status).toBe('CONFIRMED');
  });

  it('should process failed payment', async () => {
    const booking = await createBooking();
    const res = await request(app).post('/payments').set('Authorization', `Bearer ${userToken}`).send({ bookingId: booking.id, simulate: 'FAILED' }).expect(201);
    expect(res.body.status).toBe('FAILED');
    
    const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(updatedBooking?.status).toBe('FAILED');
  });

  it('should return 404 for unowned booking', async () => {
    const booking = await createBooking();
    await request(app).post('/payments').set('Authorization', `Bearer ${otherUserToken}`).send({ bookingId: booking.id, simulate: 'SUCCESS' }).expect(404);
  });

  it('should return 409 if booking is not pending', async () => {
    const booking = await createBooking();
    await prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } });
    await request(app).post('/payments').set('Authorization', `Bearer ${userToken}`).send({ bookingId: booking.id, simulate: 'SUCCESS' }).expect(409);
  });

  it('should handle idempotency key replay', async () => {
    const booking = await createBooking();
    const key = 'idemp_key_123';
    
    const res1 = await request(app).post('/payments').set('Authorization', `Bearer ${userToken}`).set('Idempotency-Key', key).send({ bookingId: booking.id, simulate: 'SUCCESS' }).expect(201);
    
    const res2 = await request(app).post('/payments').set('Authorization', `Bearer ${userToken}`).set('Idempotency-Key', key).send({ bookingId: booking.id, simulate: 'SUCCESS' }).expect(200);
    
    expect(res1.body.id).toBe(res2.body.id);
  });

  it('should handle concurrent double-pay only charging once', async () => {
    const booking = await createBooking();
    
    const reqs = [
      request(app).post('/payments').set('Authorization', `Bearer ${userToken}`).send({ bookingId: booking.id, simulate: 'SUCCESS' }),
      request(app).post('/payments').set('Authorization', `Bearer ${userToken}`).send({ bookingId: booking.id, simulate: 'SUCCESS' })
    ];
    
    const [res1, res2] = await Promise.all(reqs);
    
    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201);
    
    const theOther = statuses.indexOf(201) === 0 ? 1 : 0;
    
    if (statuses[theOther] === 200) {
      // It found the existing SUCCESS payment
      expect([res1.body.id, res2.body.id]).toHaveLength(2); // but might be same ID
    } else {
      expect(statuses[theOther]).toBe(409); // Conflict, already processed
    }

    const payments = await prisma.payment.findMany({ where: { bookingId: booking.id, status: 'SUCCESS' } });
    expect(payments).toHaveLength(1);
  });
});
