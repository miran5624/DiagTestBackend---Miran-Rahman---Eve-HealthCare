import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

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

  res.status(500).json({
    error: {
      code: 'InternalServerError',
      message: 'An unexpected error occurred',
    },
  });
};
