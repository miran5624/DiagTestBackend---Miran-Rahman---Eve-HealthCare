import request from 'supertest';
import { app, prisma } from '../src/app';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';

describe('Centre and Test APIs', () => {
  let adminToken: string;
  let userToken: string;
  let adminId: string;
  let userId: string;

  beforeAll(async () => {
    // create admin
    const admin = await prisma.user.create({
      data: {
        email: 'test_admin@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'ADMIN'
      }
    });
    adminId = admin.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adminToken = jwt.sign({ sub: admin.id, role: 'ADMIN' }, env.JWT_SECRET, { expiresIn: '1h' } as any);

    // create user
    const user = await prisma.user.create({
      data: {
        email: 'test_user@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'USER'
      }
    });
    userId = user.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userToken = jwt.sign({ sub: user.id, role: 'USER' }, env.JWT_SECRET, { expiresIn: '1h' } as any);

    // cleanup
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.centreTest.deleteMany();
    await prisma.diagnosticCentre.deleteMany();
    await prisma.diagnosticTest.deleteMany();

    // seed some tests
    await prisma.diagnosticTest.create({ data: { name: 'Test A' } });
    await prisma.diagnosticTest.create({ data: { name: 'Test B' } });
  });

  afterAll(async () => {
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.centreTest.deleteMany();
    await prisma.diagnosticCentre.deleteMany();
    await prisma.diagnosticTest.deleteMany();
    await prisma.user.deleteMany({ where: { id: { in: [adminId, userId] } } });
  });

  describe('POST /centres', () => {
    it('should deny unauthenticated', async () => {
      await request(app).post('/centres').send({ name: 'Centre 1', city: 'City A', address: '123' }).expect(401);
    });

    it('should deny normal user', async () => {
      await request(app).post('/centres').set('Authorization', `Bearer ${userToken}`).send({ name: 'Centre 1', city: 'City A', address: '123' }).expect(401); // 401 from requireAdmin
    });

    it('should allow admin', async () => {
      const res = await request(app).post('/centres').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Centre 1', city: 'City A', address: '123' }).expect(201);
      expect(res.body.name).toBe('Centre 1');
    });
  });

  describe('GET /tests', () => {
    it('should return tests paginated', async () => {
      const res = await request(app).get('/tests?limit=1').expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(2);
    });

    it('should filter by query', async () => {
      const res = await request(app).get('/tests?q=Test%20A').expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Test A');
    });
  });
  
  describe('GET /centres/:id', () => {
    it('should return 400 for malformed uuid', async () => {
      await request(app).get('/centres/12345').expect(400);
    });
  });

  describe('POST /centres/:id/tests', () => {
    let centreId: string;
    let testId: string;
    
    beforeAll(async () => {
      const res = await request(app).post('/centres').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Centre 2', city: 'City B', address: '456' });
      centreId = res.body.id;
      const test = await prisma.diagnosticTest.findFirst({ where: { name: 'Test B' } });
      testId = test!.id;
    });

    it('should add test to centre', async () => {
      const res = await request(app).post(`/centres/${centreId}/tests`).set('Authorization', `Bearer ${adminToken}`).send({ testId, pricePaise: 5000 }).expect(201);
      expect(res.body.pricePaise).toBe(5000);
    });

    it('should return 409 for duplicate', async () => {
      await request(app).post(`/centres/${centreId}/tests`).set('Authorization', `Bearer ${adminToken}`).send({ testId, pricePaise: 5000 }).expect(409);
    });

    it('should return 400 for invalid price', async () => {
      await request(app).post(`/centres/${centreId}/tests`).set('Authorization', `Bearer ${adminToken}`).send({ testId, pricePaise: -100 }).expect(400);
    });
  });

  describe('GET /centres', () => {
    it('should return paginated centres', async () => {
      const res = await request(app).get('/centres?limit=10').expect(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta.limit).toBe(10);
    });

    it('should filter by city', async () => {
      const res = await request(app).get('/centres?city=City%20B').expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].city).toBe('City B');
    });
  });
});
