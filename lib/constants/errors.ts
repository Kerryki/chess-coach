/**
 * Error message constants used throughout the application
 * Centralized for consistency and easy maintenance
 */

export const ERROR_MESSAGES = {
  // Validation errors
  INVALID_PGN: {
    dev: 'PGN parsing failed: invalid notation',
    user: 'The chess game format is invalid. Please check and try again.',
  },
  INVALID_FEN: {
    dev: 'FEN position validation failed',
    user: 'The chess position format is invalid.',
  },
  INVALID_MOVE: {
    dev: 'Illegal move attempted',
    user: 'This move is not allowed in the current position.',
  },
  INVALID_INPUT: {
    dev: 'Input validation failed',
    user: 'The information you provided is not valid. Please check and try again.',
  },

  // Network errors
  NETWORK_ERROR: {
    dev: 'Network request failed',
    user: 'Unable to connect. Please check your internet connection and try again.',
  },
  REQUEST_TIMEOUT: {
    dev: 'Network request timed out',
    user: 'The request took too long. Please try again.',
  },
  API_ERROR: {
    dev: 'API returned an error',
    user: 'The service is temporarily unavailable. Please try again later.',
  },

  // Authentication and authorization
  INVALID_API_KEY: {
    dev: 'Claude API key is invalid or missing',
    user: 'Your API key is invalid. Please check your settings.',
  },
  API_KEY_REQUIRED: {
    dev: 'Claude API key is required but not configured',
    user: 'Please configure your API key in settings.',
  },
  UNAUTHORIZED: {
    dev: 'Authentication required',
    user: 'You are not authenticated. Please log in.',
  },
  FORBIDDEN: {
    dev: 'Access denied',
    user: 'You do not have permission to perform this action.',
  },

  // Storage errors
  STORAGE_UNAVAILABLE: {
    dev: 'Browser storage not available',
    user: 'Unable to save your settings. Please check browser permissions.',
  },
  STORAGE_QUOTA_EXCEEDED: {
    dev: 'Storage quota exceeded',
    user: 'Browser storage is full. Please clear some data.',
  },

  // Chess engine errors
  ENGINE_ERROR: {
    dev: 'Chess engine failed',
    user: 'The analysis engine encountered an error. Please try again.',
  },
  ENGINE_TIMEOUT: {
    dev: 'Chess engine analysis timed out',
    user: 'The analysis is taking too long. Please try again.',
  },
  INVALID_POSITION: {
    dev: 'Position is invalid for analysis',
    user: 'This position cannot be analyzed.',
  },

  // AI coaching errors
  COACHING_ERROR: {
    dev: 'AI coaching request failed',
    user: 'Unable to generate coaching insights. Please try again.',
  },
  COACHING_TIMEOUT: {
    dev: 'Coaching response timed out',
    user: 'The coaching response took too long. Please try again.',
  },

  // General errors
  INTERNAL_ERROR: {
    dev: 'Internal server error',
    user: 'Something went wrong. Please try again.',
  },
  NOT_FOUND: {
    dev: 'Resource not found',
    user: 'The requested item could not be found.',
  },
  UNKNOWN_ERROR: {
    dev: 'Unknown error occurred',
    user: 'An unexpected error occurred. Please try again.',
  },
} as const;

/**
 * Type-safe error code enumeration
 */
export type ErrorCode = keyof typeof ERROR_MESSAGES;

/**
 * Gets error messages by code
 *
 * @param code - Error code
 * @returns Error messages or undefined
 */
export function getErrorByCode(
  code: ErrorCode,
): { dev: string; user: string } | undefined {
  return ERROR_MESSAGES[code];
}
