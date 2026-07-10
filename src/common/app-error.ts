import { HttpException } from '@nestjs/common';

// Port of utils/AppError.js. Operational error carrying an HTTP status.
// Extends HttpException so Nest routes it through the exception filter with the
// right status, while `isOperational` mirrors the original semantics.
export class AppError extends HttpException {
  public readonly isOperational = true;
  public readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message, statusCode);
    this.statusCode = statusCode;
  }
}
