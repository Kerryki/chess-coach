/**
 * Settings button component
 * Icon button to open the settings modal
 */

'use client';

import React, { useCallback } from 'react';

/**
 * Props for SettingsButton component
 */
interface SettingsButtonProps {
  /** Callback when button is clicked */
  onClick: () => void;

  /** Whether button is disabled */
  disabled?: boolean;

  /** Optional CSS class */
  className?: string;

  /** Optional aria-label override */
  ariaLabel?: string;
}

/**
 * SettingsButton component - icon button with gear icon
 * Triggers opening of settings modal
 */
export const SettingsButton: React.FC<SettingsButtonProps> = ({
  onClick,
  disabled = false,
  className = '',
  ariaLabel = 'Open settings',
}) => {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onClick();
    }
  }, [onClick, disabled]);

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`settings-button ${className}`}
        aria-label={ariaLabel}
        type="button"
        title="Open settings"
      >
        <svg
          className="settings-button-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Gear icon */}
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6" />
          <path d="M12 17v6" />
          <path d="M4.22 4.22l4.24 4.24" />
          <path d="M15.54 15.54l4.24 4.24" />
          <path d="M1 12h6" />
          <path d="M17 12h6" />
          <path d="M4.22 19.78l4.24-4.24" />
          <path d="M15.54 8.46l4.24-4.24" />
        </svg>
      </button>

      <style jsx>{`
        .settings-button {
          width: 40px;
          height: 40px;
          padding: 8px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #667eea;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 200ms ease;
        }

        .settings-button:hover:not(:disabled) {
          background: #f3f4f6;
          border-color: #667eea;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
        }

        .settings-button:active:not(:disabled) {
          transform: scale(0.95);
        }

        .settings-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .settings-button-icon {
          width: 20px;
          height: 20px;
          stroke-width: 2.5;
        }

        /* Dark mode */
        @media (prefers-color-scheme: dark) {
          .settings-button {
            background: #374151;
            border-color: #4b5563;
            color: #81d4fa;
          }

          .settings-button:hover:not(:disabled) {
            background: #4b5563;
            border-color: #81d4fa;
            box-shadow: 0 2px 8px rgba(129, 212, 250, 0.15);
          }
        }
      `}</style>
    </>
  );
};

export default SettingsButton;
