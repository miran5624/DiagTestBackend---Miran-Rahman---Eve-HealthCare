import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

const userRepo = new UserRepository();
const authService = new AuthService(userRepo);
const authController = new AuthController(authService);

router.post('/signup', asyncHandler(authController.signup));
router.post('/login', asyncHandler(authController.login));
router.get('/me', authenticate, asyncHandler(authController.me));

export const authRoutes = router;
