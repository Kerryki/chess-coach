/**
 * Simple loading spinner component
 * Displays a loading indicator with optional message
 */

'use client';

import React from 'react';

/**
 * Props for LoadingSpinner component
 */
interface LoadingSpinnerProps {
  /** Optional loading message to display below spinner */
  message?: string;

  /** Size of the spinner in pixels */
  size?: number;

  /** Optional CSS class name for styling */
  className?: string;

  /** Whether the spinner should be fullscreen */
  fullscreen?: boolean;
}

/**
 * LoadingSpinner component - displays a loading indicator
 * Shows a spinning animation with optional message
 *
 * @param props - Component props
 * @returns React component
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 40,
  className = '',
  fullscreen = false,
}) => {
  return (
    <div
      className={`loading-spinner-container ${fullscreen ? 'fullscreen' : ''} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={message || 'Loading'}
      aria-busy="true"
      data-testid="loading-spinner"
    >
      <div className="loading-spinner-wrapper">
        <div
          className="loading-spinner-ring"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderWidth: `${Math.max(2, size / 10)}px`,
          }}
        />
        {message && <div className="loading-spinner-message">{message}</div>}
      </div>

      <style jsx>{`
        .loading-spinner-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .loading-spinner-container.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 255, 255, 0.9);
          z-index: 9999;
        }

        .loading-spinner-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .loading-spinner-ring {
          border: 3px solid #e0e0e0;
          border-top-color: #1976d2;
          border-right-color: #1976d2;
          border-radius: 50%;
          animation: spinner-spin 1s linear infinite;
        }

        .loading-spinner-message {
          font-size: 14px;
          color: #666;
          text-align: center;
          max-width: 300px;
          line-height: 1.5;
        }

        @keyframes spinner-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (prefers-color-scheme: dark) {
          .loading-spinner-container.fullscreen {
            background-color: rgba(0, 0, 0, 0.9);
          }

          .loading-spinner-ring {
            border-color: #424242;
            border-top-color: #90caf9;
            border-right-color: #90caf9;
          }

          .loading-spinner-message {
            color: #ccc;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
