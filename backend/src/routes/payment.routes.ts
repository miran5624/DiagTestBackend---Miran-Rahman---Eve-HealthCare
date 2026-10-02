import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

import { WebhookController } from '../controllers/webhook.controller';
import { WebhookService } from '../services/webhook.service';

export const paymentRoutes = Router();
const paymentController = new PaymentController();
const webhookController = new WebhookController(new WebhookService());

paymentRoutes.post('/', authenticate, asyncHandler(paymentController.createPayment.bind(paymentController)));
paymentRoutes.get('/:id', authenticate, asyncHandler(paymentController.getPaymentById.bind(paymentController)));
paymentRoutes.post('/simulate', authenticate, asyncHandler(paymentController.simulate.bind(paymentController)));
paymentRoutes.post('/webhook', asyncHandler(webhookController.handleWebhook.bind(webhookController)));
