/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Hardening', () => {
  it('should have x-request-id header', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('should serve /docs', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  describe('Rate Limiting', () => {
    let testApp: any;
    
    beforeEach(async () => {
      vi.resetModules();
      vi.stubEnv('NODE_ENV', 'production');
      const mod = await import('../src/app');
      testApp = mod.app;
    });

    afterAll(() => {
      vi.unstubAllEnvs();
      vi.resetModules();
    });

    it('should return 429 on /auth limit', async () => {
      // 10 requests allowed
      for (let i = 0; i < 10; i++) {
        await request(testApp).post('/auth/signup').send({});
      }
      // 11th request should be 429
      const res = await request(testApp).post('/auth/signup').send({});
      expect(res.status).toBe(429);
    });
  });
});
