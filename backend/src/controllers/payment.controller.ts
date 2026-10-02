import { Request, Response } from 'express';
import { prisma } from '../app';
import { Unauthorized, NotFound, Conflict } from '../errors/AppError';
import { z } from 'zod';
import { env } from '../config/env';
import { BookingStateMachine } from '../services/bookingStateMachine';

export class PaymentController {
  createPayment = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new Unauthorized();
    
    const schema = z.object({
      bookingId: z.string().uuid(),
      simulate: z.enum(['SUCCESS', 'FAILED']).optional()
    });

    const { bookingId, simulate } = schema.parse(req.body);
    const headerKey = req.headers['idempotency-key'];
    const idempotencyKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;

    // Check idempotency first without lock
    if (idempotencyKey) {
      const existing = await prisma.payment.findUnique({
        where: { userId_idempotencyKey: { userId: req.user.userId, idempotencyKey } }
      });
      if (existing) {
        res.json(existing);
        return;
      }
    }

    // Check if SUCCESS payment already exists for booking
    const existingSuccess = await prisma.payment.findFirst({
      where: { bookingId, status: 'SUCCESS' }
    });
    if (existingSuccess) {
      res.json(existingSuccess);
      return;
    }

    const payment = await prisma.$transaction(async (tx) => {
      const bookings = await tx.$queryRaw<{ id: string; userId: string; status: string; amountPaise: number }[]>`SELECT * FROM "Booking" WHERE id = ${bookingId}::uuid FOR UPDATE`;
      if (!bookings.length) {
        throw new NotFound('Booking not found');
      }
      
      const booking = bookings[0];
      if (booking.userId !== req.user!.userId) {
        throw new NotFound('Booking not found'); // pretend not found for others
      }

      if (booking.status !== 'PENDING') {
        throw new Conflict('Booking is not in PENDING state');
      }

      // Check again if success payment exists after lock
      const doubleCheck = await tx.payment.findFirst({
        where: { bookingId, status: 'SUCCESS' }
      });
      if (doubleCheck) {
        return doubleCheck; // return existing successfully
      }

      let isSuccess = Math.random() < 0.8;
      if (env.NODE_ENV !== 'production' && simulate) {
        isSuccess = simulate === 'SUCCESS';
      }

      const status = isSuccess ? 'SUCCESS' : 'FAILED';
      const providerReference = `pay_${Math.random().toString(36).substr(2, 9)}`;

      const newPayment = await tx.payment.create({
        data: {
          bookingId,
          userId: req.user!.userId,
          amountPaise: booking.amountPaise,
          status,
          providerReference,
          idempotencyKey,
          failureReason: isSuccess ? null : 'Payment declined by provider'
        }
      });

      const targetStatus = isSuccess ? 'CONFIRMED' : 'FAILED';
      if (!BookingStateMachine.canTransition(booking.status, targetStatus)) {
        throw new Conflict(`Cannot transition booking from ${booking.status} to ${targetStatus}`);
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: targetStatus }
      });

      return newPayment;
    });

    res.status(201).json(payment);
  };

  getPaymentById = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new Unauthorized();

    const id = req.params.id as string;
    const payment = await prisma.payment.findUnique({ where: { id } });

    if (!payment || payment.userId !== req.user.userId) {
      throw new NotFound('Payment not found');
    }

    res.json(payment);
  };

  // Keep simulate for legacy UI compatibility if they still call it
  simulate = async (req: Request, res: Response): Promise<void> => {
    // legacy method, we can just point to createPayment with simulate = SUCCESS
    req.body.simulate = 'SUCCESS';
    await this.createPayment(req, res);
  };
}
