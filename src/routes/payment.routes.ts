import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { WebhookService } from '../services/webhook.service';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const webhookService = new WebhookService();
const webhookController = new WebhookController(webhookService);

router.post('/webhook', asyncHandler(webhookController.handleWebhook));

export const paymentRoutes = router;
