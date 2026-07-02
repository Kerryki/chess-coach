/**
 * Dismissible error alert component
 * Displays user-friendly error messages to users
 */

'use client';

import React, { useState, useCallback } from 'react';
import { AppError } from '@/lib/types/errors';

/**
 * Props for ErrorAlert component
 */
interface ErrorAlertProps {
  /** Error to display */
  error: AppError | null;

  /** Callback when error is dismissed */
  onDismiss?: () => void;

  /** Optional custom message to override error.userMessage */
  message?: string;

  /** Optional CSS class name for styling */
  className?: string;

  /** Whether to auto-dismiss after timeout (ms) */
  autoDismissMs?: number;
}

/**
 * ErrorAlert component - displays dismissible error notifications
 * Shows user-friendly message from AppError.userMessage
 * Automatically dismisses after optional timeout
 *
 * @param props - Component props
 * @returns React component
 */
export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  onDismiss,
  message,
  className = '',
  autoDismissMs,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(!!error);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  // Handle auto-dismiss
  React.useEffect(() => {
    if (!isVisible || !autoDismissMs) return;

    const timer = window.setTimeout(() => {
      handleDismiss();
    }, autoDismissMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isVisible, autoDismissMs, handleDismiss]);

  // Update visibility when error changes
  React.useEffect(() => {
    setIsVisible(!!error);
  }, [error]);

  if (!isVisible || !error) {
    return null;
  }

  const displayMessage = message || error.userMessage;

  return (
    <div
      id="game-input-error"
      className={`error-alert ${className}`}
      role="alert"
      aria-live="assertive"
      data-testid="error-alert"
    >
      <div className="error-alert-content">
        <div className="error-alert-message">{displayMessage}</div>

        <button
          className="error-alert-close"
          onClick={handleDismiss}
          aria-label="Dismiss error"
          type="button"
        >
          ×
        </button>
      </div>

      <style jsx>{`
        .error-alert {
          padding: 12px 16px;
          margin-bottom: 16px;
          background-color: #fee;
          border: 1px solid #fcc;
          border-radius: 4px;
          font-size: 14px;
          color: #c00;
        }

        .error-alert-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .error-alert-message {
          flex: 1;
          line-height: 1.5;
        }

        .error-alert-close {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          padding: 0;
          border: none;
          background: none;
          color: #c00;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 200ms ease-in-out;
        }

        .error-alert-close:hover {
          opacity: 0.7;
        }

        .error-alert-close:active {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
};

export default ErrorAlert;
