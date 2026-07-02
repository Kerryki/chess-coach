/**
 * Error handling utilities for consistent error management
 */
import { AppError } from '@/lib/types/errors';

/**
 * Error message constants for standard error scenarios
 */
const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: {
    dev: 'An internal server error occurred',
    user: 'Something went wrong. Please try again.',
  },
  INVALID_INPUT: {
    dev: 'Input validation failed',
    user: 'The information you provided is not valid. Please check and try again.',
  },
  NETWORK_ERROR: {
    dev: 'Network request failed',
    user: 'Unable to connect. Please check your internet connection and try again.',
  },
  UNAUTHORIZED: {
    dev: 'Authentication required',
    user: 'You are not authenticated. Please log in.',
  },
  FORBIDDEN: {
    dev: 'Access denied',
    user: 'You do not have permission to perform this action.',
  },
  NOT_FOUND: {
    dev: 'Resource not found',
    user: 'The requested item could not be found.',
  },
};

/**
 * Creates a new AppError with developer and user messages
 *
 * @param code - Error code for categorization
 * @param message - Developer-facing message with technical details
 * @param userMessage - User-friendly message for UI display
 * @param context - Optional debugging context
 * @param cause - Optional original error
 * @returns Immutable AppError object
 */
export function createAppError(
  code: string,
  message: string,
  userMessage: string,
  context?: Record<string, unknown>,
  cause?: unknown,
): AppError {
  return Object.freeze({
    code,
    message,
    userMessage,
    context,
    cause,
    stack: cause instanceof Error ? cause.stack : undefined,
    timestamp: Date.now(),
  });
}

/**
 * Gets standard error messages for common error codes
 *
 * @param code - Error code to look up
 * @returns Object with dev and user messages
 */
function getStandardMessages(code: string): { dev: string; user: string } | undefined {
  return ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES];
}

/**
 * Creates an AppError from a standard error code
 * Useful for common error scenarios
 *
 * @param code - Standard error code
 * @param context - Optional debugging context
 * @param cause - Optional original error
 * @returns AppError with standard messages
 */
export function createStandardError(
  code: keyof typeof ERROR_MESSAGES,
  context?: Record<string, unknown>,
  cause?: unknown,
): AppError {
  const messages = getStandardMessages(code);
  if (!messages) {
    return createAppError(
      'UNKNOWN_ERROR',
      'Unknown error occurred',
      'An unexpected error occurred. Please try again.',
      context,
      cause,
    );
  }

  return createAppError(code, messages.dev, messages.user, context, cause);
}

/**
 * Wraps an unknown error in an AppError
 * Handles various error types (Error, string, object, etc.)
 *
 * @param error - Unknown error value
 * @param context - Optional debugging context
 * @returns AppError with safe error information
 */
export function wrapError(error: unknown, context?: Record<string, unknown>): AppError {
  // Already an AppError
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    'userMessage' in error &&
    'timestamp' in error
  ) {
    return error as AppError;
  }

  // Error instance
  if (error instanceof Error) {
    return createAppError(
      'INTERNAL_SERVER_ERROR',
      error.message,
      'An unexpected error occurred. Please try again.',
      context,
      error,
    );
  }

  // String error
  if (typeof error === 'string') {
    return createAppError(
      'INTERNAL_SERVER_ERROR',
      error,
      'An unexpected error occurred. Please try again.',
      context,
    );
  }

  // Unknown object
  return createAppError(
    'INTERNAL_SERVER_ERROR',
    'Unknown error occurred',
    'An unexpected error occurred. Please try again.',
    { ...context, error },
  );
}

/**
 * Gets the user-friendly message from an error
 * Safely extracts the userMessage or falls back to a generic message
 *
 * @param error - Error to extract message from
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'userMessage' in error) {
    const appError = error as AppError;
    return appError.userMessage || 'An unexpected error occurred. Please try again.';
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Gets the developer-facing message from an error
 * Useful for logging and debugging
 *
 * @param error - Error to extract message from
 * @returns Developer-friendly error message
 */
export function getDevMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const appError = error as AppError;
    return appError.message || 'Unknown error';
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
}

/**
 * Checks if an error has a specific error code
 *
 * @param error - Error to check
 * @param code - Error code to match
 * @returns True if error has the specified code
 */
export function isErrorCode(error: unknown, code: string): error is AppError {
  return !!(error && typeof error === 'object' && 'code' in error && (error as AppError).code === code);
}
