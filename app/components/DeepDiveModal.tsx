/**
 * Deep Dive Modal component
 * Displays streaming move explanations with real-time text updates
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useDeepDive } from '@/lib/hooks/useDeepDive';
import { DeepDiveContext } from '@/lib/coaching/deep-dive';
import { AIProvider } from '@/lib/types/storage';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { logger } from '@/lib/utils/logger';

/**
 * Props for DeepDiveModal component
 */
interface DeepDiveModalProps {
  /** Whether modal is open */
  readonly isOpen: boolean;

  /** Deep dive context (move, position, analysis) */
  readonly context: DeepDiveContext | null;

  /** API key for the selected provider, used for streaming */
  readonly apiKey: string;

  /** Which AI provider to use (default: 'claude') */
  readonly provider?: AIProvider;

  /** Callback when modal closes */
  readonly onClose: () => void;
}

/**
 * Modal component for deep-dive move analysis
 * Shows streaming explanation with cancel and copy buttons
 */
export const DeepDiveModal: React.FC<DeepDiveModalProps> = ({
  isOpen,
  context,
  apiKey,
  provider = 'claude',
  onClose,
}) => {
  const { explanation, isLoading, error, errorMessage, analyzeMove, cancel, reset } =
    useDeepDive();

  const explanationEndRef = useRef<HTMLDivElement>(null);

  // Format move for display
  const getFormattedMove = (move: string): string => {
    if (!move || move.length < 4) return move;
    const from = move.substring(0, 2);
    const to = move.substring(2, 4);
    const promotion = move.length > 4 ? move.substring(4) : '';
    return `${from}${to}${promotion ? `=${promotion.toUpperCase()}` : ''}`;
  };

  // Format evaluation for display
  const getFormattedEvaluation = (evaluation: number): string => {
    const pawns = (evaluation / 100).toFixed(1);
    return `${evaluation >= 0 ? '+' : ''}${pawns}`;
  };

  // Trigger analysis when modal opens
  useEffect(() => {
    if (isOpen && context && apiKey) {
      analyzeMove(context, apiKey, provider).catch((err) => {
        // Error already handled in hook state
        logger.error('Deep-dive analysis error:', err);
      });
    }
  }, [isOpen, context, apiKey, provider, analyzeMove]);

  // Auto-scroll to bottom as text streams in
  useEffect(() => {
    if (explanationEndRef.current) {
      explanationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [explanation]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(explanation);
    } catch (err) {
      logger.error('Failed to copy:', err);
    }
  };

  const handleRetry = () => {
    if (context && apiKey) {
      reset();
      analyzeMove(context, apiKey, provider).catch((err) => {
        logger.error('Deep-dive analysis error:', err);
      });
    }
  };

  if (!isOpen) return null;

  const moveNum = Math.ceil((context?.moveIndex ?? 0) / 2);
  const isWhiteMove = (context?.moveIndex ?? 0) % 2 === 0;
  const moveColor = isWhiteMove ? '' : '...';

  return (
    <div className="deep-dive-modal-overlay">
      <div className="deep-dive-modal-content">
        {/* Header */}
        <div className="deep-dive-modal-header">
          <div className="deep-dive-modal-title-section">
            <h2 className="deep-dive-modal-title">
              Move {moveNum}{moveColor}
            </h2>
            {context && (
              <>
                <div className="deep-dive-modal-move">
                  {getFormattedMove(context.move)}
                </div>
                <div className="deep-dive-modal-evaluation">
                  {getFormattedEvaluation(context.analysis.after)}
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleClose}
            className="deep-dive-modal-close"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Body - Streaming explanation */}
        <div className="deep-dive-modal-body">
          {isLoading && !explanation && (
            <div className="deep-dive-modal-loading">
              <LoadingSpinner />
              <p>Analyzing position...</p>
            </div>
          )}

          {explanation && (
            <div className="deep-dive-modal-explanation">
              <div className="deep-dive-modal-text">
                {explanation.split('\n').map((line, idx) => (
                  <React.Fragment key={idx}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
                <div ref={explanationEndRef} />
              </div>
            </div>
          )}

          {error && (
            <div className="deep-dive-modal-error">
              <div className="deep-dive-modal-error-title">Error</div>
              <div className="deep-dive-modal-error-message">{errorMessage}</div>
              <button onClick={handleRetry} className="deep-dive-modal-retry-btn">
                Retry
              </button>
            </div>
          )}

          {!isLoading && !explanation && !error && (
            <div className="deep-dive-modal-empty">
              <p>Enter an API key to start analysis</p>
            </div>
          )}
        </div>

        {/* Footer - Actions */}
        <div className="deep-dive-modal-footer">
          {explanation && (
            <button onClick={handleCopy} className="deep-dive-modal-action-btn copy-btn">
              📋 Copy
            </button>
          )}

          {isLoading && (
            <button onClick={cancel} className="deep-dive-modal-action-btn cancel-btn">
              Cancel
            </button>
          )}

          <button onClick={handleClose} className="deep-dive-modal-action-btn close-btn">
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        .deep-dive-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
          animation: fadeIn 200ms ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .deep-dive-modal-content {
          background: white;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          animation: slideUp 300ms ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .deep-dive-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e0e0e0;
          gap: 16px;
        }

        .deep-dive-modal-title-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .deep-dive-modal-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin: 0;
        }

        .deep-dive-modal-move {
          font-size: 16px;
          font-weight: 700;
          color: #667eea;
          font-family: 'Courier New', monospace;
          padding: 4px 8px;
          background: #f0f2f9;
          border-radius: 4px;
          min-width: 50px;
          text-align: center;
        }

        .deep-dive-modal-evaluation {
          font-size: 14px;
          font-weight: 600;
          color: #666;
          padding: 4px 8px;
          background: #f5f5f5;
          border-radius: 4px;
          min-width: 60px;
          text-align: center;
        }

        .deep-dive-modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 200ms ease;
        }

        .deep-dive-modal-close:hover {
          background: #f5f5f5;
          color: #333;
        }

        .deep-dive-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          min-height: 200px;
        }

        .deep-dive-modal-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          min-height: 200px;
        }

        .deep-dive-modal-loading p {
          color: #666;
          font-size: 14px;
          margin: 0;
        }

        .deep-dive-modal-explanation {
          display: flex;
          flex-direction: column;
        }

        .deep-dive-modal-text {
          font-size: 14px;
          line-height: 1.6;
          color: #333;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .deep-dive-modal-error {
          padding: 12px;
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 4px;
        }

        .deep-dive-modal-error-title {
          font-weight: 600;
          color: #c33;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .deep-dive-modal-error-message {
          font-size: 13px;
          color: #666;
          margin-bottom: 12px;
        }

        .deep-dive-modal-retry-btn {
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid #c33;
          border-radius: 4px;
          background: white;
          color: #c33;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .deep-dive-modal-retry-btn:hover {
          background: #c33;
          color: white;
        }

        .deep-dive-modal-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: #999;
          font-size: 14px;
        }

        .deep-dive-modal-footer {
          display: flex;
          gap: 8px;
          padding: 16px 20px;
          border-top: 1px solid #e0e0e0;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .deep-dive-modal-action-btn {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 4px;
          border: 1px solid #ddd;
          background: white;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .deep-dive-modal-action-btn:hover {
          background: #f5f5f5;
          border-color: #999;
        }

        .deep-dive-modal-action-btn:active {
          transform: scale(0.95);
        }

        .copy-btn {
          color: #667eea;
          border-color: #667eea;
        }

        .copy-btn:hover {
          background: #f0f2f9;
          border-color: #667eea;
        }

        .cancel-btn {
          color: #f97316;
          border-color: #f97316;
        }

        .cancel-btn:hover {
          background: #fef3c7;
          border-color: #f97316;
        }

        .close-btn {
          color: #666;
        }

        /* Dark mode */
        @media (prefers-color-scheme: dark) {
          .deep-dive-modal-content {
            background: #2a2a2a;
            color: #ddd;
          }

          .deep-dive-modal-header {
            border-bottom-color: #444;
          }

          .deep-dive-modal-title {
            color: #ddd;
          }

          .deep-dive-modal-move {
            background: #1a1a1a;
            color: #81d4fa;
            border-color: #444;
          }

          .deep-dive-modal-evaluation {
            background: #333;
            color: #aaa;
          }

          .deep-dive-modal-close {
            color: #666;
          }

          .deep-dive-modal-close:hover {
            background: #333;
            color: #ddd;
          }

          .deep-dive-modal-text {
            color: #ddd;
          }

          .deep-dive-modal-error {
            background: #3a1a1a;
            border-color: #6a3a3a;
          }

          .deep-dive-modal-error-title {
            color: #ff6b6b;
          }

          .deep-dive-modal-error-message {
            color: #aaa;
          }

          .deep-dive-modal-loading p {
            color: #aaa;
          }

          .deep-dive-modal-empty {
            color: #666;
          }

          .deep-dive-modal-footer {
            border-top-color: #444;
          }

          .deep-dive-modal-action-btn {
            background: #333;
            border-color: #555;
            color: #aaa;
          }

          .deep-dive-modal-action-btn:hover {
            background: #444;
            border-color: #666;
            color: #ddd;
          }

          .copy-btn {
            color: #81d4fa;
            border-color: #81d4fa;
          }

          .copy-btn:hover {
            background: #1a3a3a;
          }

          .cancel-btn {
            color: #ffb74d;
            border-color: #ffb74d;
          }

          .cancel-btn:hover {
            background: #3a2a1a;
          }

          .close-btn {
            color: #999;
          }
        }

        /* Mobile */
        @media (max-width: 640px) {
          .deep-dive-modal-overlay {
            padding: 12px;
          }

          .deep-dive-modal-content {
            max-height: 90vh;
          }

          .deep-dive-modal-header {
            padding: 16px;
          }

          .deep-dive-modal-body {
            padding: 16px;
            min-height: 150px;
          }

          .deep-dive-modal-footer {
            padding: 12px 16px;
          }

          .deep-dive-modal-title {
            font-size: 16px;
          }

          .deep-dive-modal-text {
            font-size: 13px;
          }

          .deep-dive-modal-action-btn {
            padding: 6px 12px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default DeepDiveModal;
