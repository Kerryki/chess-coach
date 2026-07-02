/**
 * Application logger for consistent, categorized logging
 * No console.log - all output goes through typed logger methods
 */

import { AppError } from '@/lib/types/errors';

/**
 * Log level enumeration
 */
export enum LogLevel {
  Debug = 'DEBUG',
  Info = 'INFO',
  Warn = 'WARN',
  Error = 'ERROR',
}

/**
 * Log entry structure
 */
interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}

/**
 * Formats a log entry for console output
 *
 * @param entry - Log entry to format
 * @returns Formatted log string
 */
function formatLogEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level}]`,
    entry.message,
  ];

  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context, null, 2));
  }

  return parts.join(' ');
}

/**
 * Gets current ISO timestamp
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Application logger object with typed methods
 * Use instead of console.log for all logging
 */
export const logger = {
  /**
   * Log debug information (development only)
   *
   * @param message - Debug message
   * @param context - Optional debugging context
   */
  debug(message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: getCurrentTimestamp(),
      level: LogLevel.Debug,
      message,
      context,
    };

    // Only log debug in development
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'development') {
      console.debug(formatLogEntry(entry));
    }
  },

  /**
   * Log informational message
   *
   * @param message - Info message
   * @param context - Optional context data
   */
  info(message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: getCurrentTimestamp(),
      level: LogLevel.Info,
      message,
      context,
    };

    console.info(formatLogEntry(entry));
  },

  /**
   * Log warning message
   *
   * @param message - Warning message
   * @param context - Optional context data
   */
  warn(message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: getCurrentTimestamp(),
      level: LogLevel.Warn,
      message,
      context,
    };

    console.warn(formatLogEntry(entry));
  },

  /**
   * Log error with full context
   *
   * @param message - Error message
   * @param error - Error object or string
   * @param context - Optional additional context
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const errorContext: Record<string, unknown> = { ...context };

    if (error) {
      if (error instanceof Error) {
        errorContext.errorType = error.constructor.name;
        errorContext.errorMessage = error.message;
        errorContext.stack = error.stack;
      } else if (typeof error === 'object' && 'code' in error && 'message' in error) {
        const appError = error as AppError;
        errorContext.errorCode = appError.code;
        errorContext.errorMessage = appError.message;
        // DO NOT include userMessage in logs - it's for user-facing display only
        if (appError.context) {
          errorContext.appContext = appError.context;
        }
        if (appError.stack) {
          errorContext.stack = appError.stack;
        }
      } else if (typeof error === 'string') {
        errorContext.error = error;
      } else {
        errorContext.error = String(error);
      }
    }

    const entry: LogEntry = {
      timestamp: getCurrentTimestamp(),
      level: LogLevel.Error,
      message,
      context: Object.keys(errorContext).length > 0 ? errorContext : undefined,
    };

    console.error(formatLogEntry(entry));
  },
};
