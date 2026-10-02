import { Request, Response } from 'express';
import { BookingService, createBookingSchema } from '../services/booking.service';
import { ValidationError, Unauthorized } from '../errors/AppError';

export class BookingController {
  constructor(private bookingService: BookingService) {}

  createBooking = async (req: Request, res: Response) => {
    if (!req.user) throw new Unauthorized();
    
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid input data', parsed.error.format());
    }

    const booking = await this.bookingService.createBooking(req.user.userId, parsed.data);
    res.status(201).json(booking);
  };

  getBookings = async (req: Request, res: Response) => {
    if (!req.user) throw new Unauthorized();
    
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const bookings = await this.bookingService.getBookings(req.user.userId, status, page, limit);
    res.status(200).json({ bookings });
  };

  getBookingById = async (req: Request, res: Response) => {
    if (!req.user) throw new Unauthorized();
    
    const id = req.params.id as string;
    const booking = await this.bookingService.getBookingById(req.user.userId, id);
    res.status(200).json(booking);
  };

  cancelBooking = async (req: Request, res: Response) => {
    if (!req.user) throw new Unauthorized();
    
    const id = req.params.id as string;
    const booking = await this.bookingService.cancelBooking(req.user.userId, id);
    res.status(200).json(booking);
  };
}
