import { Request, Response } from 'express';
import { prisma } from '../app';
import { Unauthorized, NotFound } from '../errors/AppError';
import crypto from 'crypto';
import { env } from '../config/env';

export class PaymentController {
  simulate = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new Unauthorized();
    
    const { bookingId } = req.body;
    
    // Find the booking
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.userId !== req.user.userId) {
      throw new NotFound('Booking not found');
    }
    
    // Create a payment
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        userId: req.user.userId,
        amountPaise: booking.amountPaise,
        status: 'PENDING',
        providerReference: `prov-${bookingId}-${Date.now()}`
      }
    });
    
    // Send webhook payload (simulate external provider calling our webhook)
    const payload = { 
      eventId: `evt-${Date.now()}`, 
      providerReference: payment.providerReference, 
      status: 'SUCCESS', 
      occurredAt: new Date().toISOString() 
    };
    
    const bodyString = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', env.WEBHOOK_SECRET || 'secret').update(bodyString).digest('hex');
    
    // Call our own webhook API
    const API_URL = `http://localhost:${env.PORT || 3000}`;
    const whRes = await fetch(`${API_URL}/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-signature': signature },
      body: bodyString
    });
    
    if (!whRes.ok) {
      const err = await whRes.text();
      res.status(500).json({ error: { message: `Webhook simulation failed: ${err}` } });
      return;
    }
    
    res.status(200).json({ success: true, message: 'Payment simulated and webhook delivered successfully.' });
  };
}
