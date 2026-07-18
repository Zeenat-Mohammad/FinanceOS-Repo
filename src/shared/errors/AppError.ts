export type AppErrorCode =
  | 'APP_ERROR'
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'NETWORK_ERROR'
  | 'DATABASE_ERROR'
  | 'PROFILE_MISSING'
  | 'HOUSEHOLD_MISSING'
  | 'PERMISSION_ERROR'
  | 'SESSION_EXPIRED'
  | 'UNKNOWN_ERROR';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly userMessage: string;
  readonly cause?: unknown;

  constructor(message: string, options?: { code?: AppErrorCode; userMessage?: string; cause?: unknown }) {
    super(message);
    this.name = 'AppError';
    this.code = options?.code ?? 'APP_ERROR';
    this.userMessage = options?.userMessage ?? 'Something went wrong. Please try again.';
    this.cause = options?.cause;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', cause?: unknown) {
    super(message, {
      code: 'VALIDATION_ERROR',
      userMessage: 'Please check the highlighted information and try again.',
      cause
    });
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message = 'Authentication failed', cause?: unknown, userMessage?: string) {
    super(message, {
      code: 'AUTH_ERROR',
      userMessage: userMessage ?? 'Authentication failed. Please check your credentials and try again.',
      cause
    });
    this.name = 'AuthError';
  }
}

export class SessionExpiredError extends AppError {
  constructor(message = 'Session expired', cause?: unknown) {
    super(message, {
      code: 'SESSION_EXPIRED',
      userMessage: 'Your session expired. Please sign in again.',
      cause
    });
    this.name = 'SessionExpiredError';
  }
}

export class ProfileMissingError extends AppError {
  constructor(message = 'Profile is missing', cause?: unknown) {
    super(message, {
      code: 'PROFILE_MISSING',
      userMessage: 'Your profile was not initialized. We tried to repair it, but it still could not be loaded.',
      cause
    });
    this.name = 'ProfileMissingError';
  }
}

export class HouseholdMissingError extends AppError {
  constructor(message = 'Household is missing', cause?: unknown) {
    super(message, {
      code: 'HOUSEHOLD_MISSING',
      userMessage: 'Your household workspace was not initialized. Please sign out and try again, or contact support if this persists.',
      cause
    });
    this.name = 'HouseholdMissingError';
  }
}

export class PermissionError extends AppError {
  constructor(message = 'Permission denied', cause?: unknown) {
    super(message, {
      code: 'PERMISSION_ERROR',
      userMessage: 'Your account does not have permission to access this household data.',
      cause
    });
    this.name = 'PermissionError';
  }
}

export class NetworkError extends AppError {
  constructor(message = 'Network request failed', cause?: unknown) {
    super(message, {
      code: 'NETWORK_ERROR',
      userMessage: 'Network connection failed. Please check your connection and try again.',
      cause
    });
    this.name = 'NetworkError';
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database request failed', cause?: unknown, userMessage?: string) {
    super(message, {
      code: 'DATABASE_ERROR',
      userMessage: userMessage ?? 'A database request failed. Please try again.',
      cause
    });
    this.name = 'DatabaseError';
  }
}

export class UnknownError extends AppError {
  constructor(cause?: unknown) {
    super('Unknown application error', {
      code: 'UNKNOWN_ERROR',
      userMessage: 'An unexpected error occurred. Please try again.',
      cause
    });
    this.name = 'UnknownError';
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new UnknownError(error);
  }

  return new UnknownError(error);
}
