/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '../app';
import crypto from 'crypto';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { BookingStatus, BookingStateMachine } from './bookingStateMachine';

export class WebhookService {
  async handleWebhook(rawBody: Buffer, signature: string) {
    if (!signature) {
      throw new AppError('Missing signature', 401);
    }
    const expected = crypto.createHmac('sha256', env.WEBHOOK_SECRET).update(rawBody).digest('hex');
    try {
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        throw new AppError('Invalid signature', 401);
      }
    } catch {
      throw new AppError('Invalid signature length', 401);
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new AppError('Invalid JSON', 400);
    }

    const { eventId, providerReference, status, occurredAt } = payload;
    if (!eventId || !providerReference || !status || !occurredAt) {
      throw new AppError('Invalid payload', 400);
    }

    // Process inside a transaction
    return await prisma.$transaction(async (tx) => {
      // Idempotency: WebhookEvent unique eventId
      const existingEvent = await tx.webhookEvent.findUnique({ where: { eventId } });
      if (existingEvent) {
        return { status: 'duplicate' };
      }

      await tx.webhookEvent.create({
        data: {
          eventId,
          providerReference,
          type: 'payment.update',
          status,
          payload,
          processedAt: new Date(),
        }
      });

      // Find payment with row lock if possible in postgres, but in prisma we can't lock easily without raw query.
      // So we use standard findUnique, wait, we can lock using Prisma's raw query or just rely on the transaction isolation level.
      // For now, let's just do findFirst.
      const payments = await tx.$queryRaw<any[]>`SELECT * FROM "Payment" WHERE "providerReference" = ${providerReference} FOR UPDATE`;
      if (payments.length === 0) {
        await tx.webhookEvent.update({
          where: { eventId },
          data: { outcome: 'not_found' }
        });
        return { status: 'ignored' };
      }
      
      const payment = payments[0];
      
      if (payment.status === status) {
        await tx.webhookEvent.update({ where: { eventId }, data: { outcome: 'no-op' } });
        return { status: 'ignored' };
      }

      if (payment.status === 'FAILED' || payment.status === 'SUCCESS') {
        await tx.webhookEvent.update({ where: { eventId }, data: { outcome: 'ignored_conflict' } });
        return { status: 'ignored' };
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: { status }
      });

      // Update booking
      const booking = await tx.booking.findUnique({ where: { id: payment.bookingId } });
      if (booking) {
        const targetStatus = status === 'SUCCESS' ? BookingStatus.CONFIRMED : BookingStatus.FAILED;
        if (BookingStateMachine.canTransition(booking.status, targetStatus)) {
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: targetStatus }
          });
        } else {
          await tx.webhookEvent.update({ where: { eventId }, data: { outcome: 'booking_state_conflict' } });
        }
      }
      
      return { status: 'success' };
    });
  }
}
