export const ERROR_CODES = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_UNAVAILABLE: "DATABASE_UNAVAILABLE",
  NETWORK_ERROR: "NETWORK_ERROR",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  USER_EXISTS: "USER_EXISTS",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  TOKEN_INVALID: "TOKEN_INVALID",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  READING_NOT_FOUND: "READING_NOT_FOUND",
  DUPLICATE_SLOT: "DUPLICATE_SLOT",
  MAX_DAILY_READINGS: "MAX_DAILY_READINGS",
  FUTURE_DATE: "FUTURE_DATE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(code: string, message: string, details?: Record<string, unknown>) {
    return new AppError(400, code, message, details);
  }

  static unauthorized(code: string, message: string, details?: Record<string, unknown>) {
    return new AppError(401, code, message, details);
  }

  static forbidden(code: string, message: string, details?: Record<string, unknown>) {
    return new AppError(403, code, message, details);
  }

  static notFound(code: string, message: string, details?: Record<string, unknown>) {
    return new AppError(404, code, message, details);
  }

  static conflict(code: string, message: string, details?: Record<string, unknown>) {
    return new AppError(409, code, message, details);
  }

  static serviceUnavailable(
    code = ERROR_CODES.DATABASE_UNAVAILABLE,
    message = "Database service is temporarily unavailable. Please check your internet connection."
  ) {
    return new AppError(503, code, message);
  }

  static internal(message = "An unexpected server error occurred. Please try again.") {
    return new AppError(500, ERROR_CODES.INTERNAL_ERROR, message);
  }
}
