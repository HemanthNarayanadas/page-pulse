export type ErrorCode =
  | 'INVALID_URL'
  | 'PRIVATE_ADDRESS_BLOCKED'
  | 'REQUEST_TIMEOUT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'FETCH_FAILED'
  | 'INTERNAL_ERROR'
  | 'NOT_FOUND';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidUrlError extends AppError {
  constructor(message = 'The provided URL is invalid.') {
    super('INVALID_URL', message, 400);
  }
}

export class PrivateAddressError extends AppError {
  constructor(message = 'Requests to private, internal, or loopback addresses are not permitted.') {
    super('PRIVATE_ADDRESS_BLOCKED', message, 400);
  }
}

export class TimeoutError extends AppError {
  constructor(message = 'The target website did not respond in time.') {
    super('REQUEST_TIMEOUT', message, 408);
  }
}

export class FetchFailedError extends AppError {
  constructor(message = 'Unable to fetch the target URL.') {
    super('FETCH_FAILED', message, 502);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.') {
    super('NOT_FOUND', message, 404);
  }
}
