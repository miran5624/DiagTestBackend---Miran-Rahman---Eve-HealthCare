import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/errorHandler';
import { NotFound } from './errors/AppError';
import { PrismaClient } from '@prisma/client';
import { authRoutes } from './routes/auth.routes';

export const app = express();
export const prisma = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

app.use('/auth', authRoutes);

app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new NotFound(`Route ${req.method} ${req.url} not found`));
});

app.use(errorHandler);
