/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app, prisma } from '../src/app';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env';



describe('Auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/signup', () => {
    it('should create a user and return 201 with token', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.user, 'create').mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: 'hash',
        createdAt: new Date(),
      } as any);

      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'Test@example.com', password: 'Password1', name: 'Test' });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('should return 409 for duplicate email', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'u1' } as any);

      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'test@example.com', password: 'Password1' });

      expect(res.status).toBe(409);
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'test@example.com', password: 'weak' });
      expect(res.status).toBe(400);
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'invalid', password: 'Password1' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should return token on success', async () => {
      const hash = await bcrypt.hash('Password1', 10);
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        passwordHash: hash
      } as any);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('should return 401 for wrong password', async () => {
      const hash = await bcrypt.hash('Password1', 10);
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        passwordHash: hash
      } as any);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid credentials');
    });

    it('should return 401 for unknown email', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'unknown@example.com', password: 'Password1' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid credentials');
    });
  });

  describe('GET /auth/me', () => {
    it('should return user with valid token', async () => {
      const token = jwt.sign({ sub: 'u1' }, env.JWT_SECRET);
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        createdAt: new Date()
      } as any);

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe('u1');
    });

    it('should return 401 for missing token', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return 401 for malformed token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });
  });
});
