/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import { BookingRepository, CentreTestRepository } from '../repositories/booking.repository';
import { NotFound, Conflict, ValidationError } from '../errors/AppError';
import { BookingStateMachine, BookingStatus } from './bookingStateMachine';

export const createBookingSchema = z.object({
  centreId: z.string().uuid(),
  testId: z.string().uuid(),
  appointmentAt: z.string().datetime(),
});

export class BookingService {
  constructor(
    private bookingRepo: BookingRepository,
    private centreTestRepo: CentreTestRepository
  ) {}

  async createBooking(userId: string, data: z.infer<typeof createBookingSchema>) {
    const appointmentAt = new Date(data.appointmentAt);
    if (appointmentAt <= new Date()) {
      throw new ValidationError('Appointment must be in the future');
    }
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    if (appointmentAt > maxDate) {
      throw new ValidationError('Appointment must be within 90 days');
    }

    const ct = await this.centreTestRepo.findByCentreAndTest(data.centreId, data.testId);
    if (!ct || !ct.isActive) {
      throw new NotFound('Centre does not offer this active test');
    }

    try {
      const booking = await this.bookingRepo.create({
        user: { connect: { id: userId } },
        centreTest: { connect: { id: ct.id } },
        appointmentAt,
        amountPaise: ct.pricePaise,
        status: BookingStatus.PENDING,
      });
      return booking;
    } catch (error: any) {
      // Prisma unique constraint violation code for raw index is P2002
      if (error?.code === 'P2002') {
        throw new Conflict('Duplicate active booking for same user/centre/test/time');
      }
      throw error;
    }
  }

  async getBookings(userId: string, status?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return this.bookingRepo.findByUserId(userId, status, skip, limit);
  }

  async getBookingById(userId: string, bookingId: string) {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking || booking.userId !== userId) {
      throw new NotFound('Booking not found');
    }
    return booking;
  }

  async cancelBooking(userId: string, bookingId: string) {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking || booking.userId !== userId) {
      throw new NotFound('Booking not found');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return booking;
    }

    if (!BookingStateMachine.canTransition(booking.status, BookingStatus.CANCELLED)) {
      throw new Conflict(`Cannot transition from ${booking.status} to CANCELLED`);
    }

    // refund is out of scope
    return this.bookingRepo.updateStatus(bookingId, BookingStatus.CANCELLED);
  }
}
