import { Router } from 'express';
import { prisma } from '../app';

export const centreRoutes = Router();

centreRoutes.get('/', async (req, res, next) => {
  try {
    const centreTests = await prisma.centreTest.findMany({
      where: { isActive: true },
      include: {
        centre: true,
        test: true
      }
    });
    res.json(centreTests);
  } catch (err) {
    next(err);
  }
});
