import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';
import { z } from 'zod';
import { signupSchema, loginSchema } from '../services/auth.service';
import { createBookingSchema } from '../services/booking.service';

const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

registry.registerPath({
  method: 'post',
  path: '/auth/signup',
  description: 'Register a new user',
  request: {
    body: {
      content: {
        'application/json': { schema: signupSchema }
      }
    }
  },
  responses: {
    201: { description: 'User created' }
  }
});

registry.registerPath({
  method: 'post',
  path: '/auth/login',
  description: 'Login',
  request: {
    body: {
      content: {
        'application/json': { schema: loginSchema }
      }
    }
  },
  responses: {
    200: { description: 'Logged in successfully' }
  }
});

registry.registerPath({
  method: 'get',
  path: '/auth/me',
  description: 'Get current user',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'User info' },
    401: { description: 'Unauthorized' }
  }
});

registry.registerPath({
  method: 'post',
  path: '/bookings',
  description: 'Create a new booking',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': { schema: createBookingSchema }
      }
    }
  },
  responses: {
    201: { description: 'Booking created' }
  }
});

registry.registerPath({
  method: 'post',
  path: '/payments/webhook',
  description: 'Payment Webhook',
  request: {
    body: {
      content: {
        'application/json': { schema: z.object({}).passthrough() }
      }
    }
  },
  responses: {
    200: { description: 'Webhook processed' }
  }
});

const generator = new OpenApiGeneratorV3(registry.definitions);
export const openApiDocument = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'EVE Healthcare Diagnostic API',
    version: '1.0.0',
  },
});

export const docsRouter = Router();
docsRouter.use('/', swaggerUi.serve, swaggerUi.setup(openApiDocument));
