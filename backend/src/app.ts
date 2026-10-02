import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/errorHandler';
import { NotFound } from './errors/AppError';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { authRoutes } from './routes/auth.routes';
import { bookingRoutes } from './routes/booking.routes';
import { paymentRoutes } from './routes/payment.routes';
import { centreRoutes } from './routes/centre.routes';
import { testRoutes } from './routes/test.routes';
import { docsRouter } from './config/swagger';
import { env } from './config/env';

export const app = express();
export const prisma = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(express.json({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.headers['x-request-id']);
  next();
});

app.use(pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] as string,
  redact: ['req.headers.authorization', 'req.body.password']
}));

if (env.NODE_ENV !== 'test') {
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  }));
  app.use('/auth', rateLimit({
    windowMs: 60 * 1000,
    max: 10,
  }));
}

app.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

app.use('/auth', authRoutes);
app.use('/bookings', bookingRoutes);
app.use('/centres', centreRoutes);
app.use('/tests', testRoutes);
app.use('/payments', paymentRoutes);
app.use('/docs', docsRouter);

app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new NotFound(`Route ${req.method} ${req.url} not found`));
});

app.use(errorHandler);
