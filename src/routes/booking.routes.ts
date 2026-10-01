import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { BookingService } from '../services/booking.service';
import { BookingRepository, CentreTestRepository } from '../repositories/booking.repository';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

const bookingRepo = new BookingRepository();
const centreTestRepo = new CentreTestRepository();
const bookingService = new BookingService(bookingRepo, centreTestRepo);
const bookingController = new BookingController(bookingService);

router.use(authenticate);

router.post('/', asyncHandler(bookingController.createBooking));
router.get('/', asyncHandler(bookingController.getBookings));
router.get('/:id', asyncHandler(bookingController.getBookingById));
router.post('/:id/cancel', asyncHandler(bookingController.cancelBooking));

export const bookingRoutes = router;
