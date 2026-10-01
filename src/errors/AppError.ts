export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, details);
  }
}

export class Unauthorized extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class Forbidden extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFound extends AppError {
  constructor(message: string = 'Not Found') {
    super(message, 404);
  }
}

export class Conflict extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
  }
}

export class DomainError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}
