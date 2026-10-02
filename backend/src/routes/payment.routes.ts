import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { WebhookService } from '../services/webhook.service';
import { asyncHandler } from '../utils/asyncHandler';

import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const webhookService = new WebhookService();
const webhookController = new WebhookController(webhookService);
const paymentController = new PaymentController();

router.post('/webhook', asyncHandler(webhookController.handleWebhook));
router.post('/simulate', authenticate, asyncHandler(paymentController.simulate));

export const paymentRoutes = router;
