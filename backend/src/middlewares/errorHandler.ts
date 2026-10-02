import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.constructor.name,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'ValidationError',
        message: 'Invalid input data',
        details: err.issues,
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: 'InternalServerError',
      message: 'An unexpected error occurred',
    },
  });
};
