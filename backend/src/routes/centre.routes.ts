import { Router } from 'express';
import { CentreController } from '../controllers/centre.controller';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const centreRoutes = Router();
const centreController = new CentreController();

centreRoutes.get('/', asyncHandler(centreController.getCentres.bind(centreController)));
centreRoutes.get('/:id', asyncHandler(centreController.getCentreById.bind(centreController)));
centreRoutes.post('/', authenticate, requireAdmin, asyncHandler(centreController.createCentre.bind(centreController)));
centreRoutes.post('/:id/tests', authenticate, requireAdmin, asyncHandler(centreController.addTestToCentre.bind(centreController)));
