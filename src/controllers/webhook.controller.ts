import { Request, Response } from 'express';
import { WebhookService } from '../services/webhook.service';

export class WebhookController {
  constructor(private webhookService: WebhookService) {}

  handleWebhook = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawBody = (req as any).rawBody;
    const signature = req.headers['x-signature'] as string;
    
    const result = await this.webhookService.handleWebhook(rawBody, signature);
    res.status(200).json(result);
  };
}
