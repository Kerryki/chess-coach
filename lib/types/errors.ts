/**
 * Application error type with context for debugging and user-friendly messages
 */
export interface AppError {
  /** Error code for categorization (e.g., INVALID_INPUT, NETWORK_ERROR) */
  readonly code: string;

  /** Developer-facing error message with technical details */
  readonly message: string;

  /** User-friendly error message for UI display */
  readonly userMessage: string;

  /** Detailed context for logging and debugging */
  readonly context?: Record<string, unknown>;

  /** Original error if this wraps another error */
  readonly cause?: unknown;

  /** Stack trace for production logging */
  readonly stack?: string;

  /** Timestamp when error occurred */
  readonly timestamp: number;
}
