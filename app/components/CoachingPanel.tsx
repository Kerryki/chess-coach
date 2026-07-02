/**
 * Coaching panel for displaying and managing critical moments
 * Shows list of detected moments with expandable explanations
 */

'use client';

import React, { useMemo } from 'react';
import { CriticalMoment, CoachingExplanation } from '@/lib/coaching/types';
import { AppError } from '@/lib/types/errors';
import MomentCard from '@/app/components/MomentCard';
import ErrorAlert from '@/app/components/ErrorAlert';
import LoadingSpinner from '@/app/components/LoadingSpinner';

/**
 * Props for CoachingPanel component
 */
interface CoachingPanelProps {
  readonly moments: ReadonlyArray<CriticalMoment>;
  readonly explanations: ReadonlyMap<number, CoachingExplanation>;
  readonly isLoading?: boolean;
  readonly error?: AppError | null;
  readonly skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  readonly onRetry?: () => void;
  readonly className?: string;
}

/**
 * Panel component displaying coaching moments and explanations
 */
export const CoachingPanel: React.FC<CoachingPanelProps> = ({
  moments,
  explanations,
  isLoading = false,
  error = null,
  skillLevel = 'intermediate',
  onRetry,
  className = '',
}) => {
  // Count by reason type
  const momentCounts = useMemo(() => {
    const counts = {
      blunder: 0,
      brilliant: 0,
      inaccuracy: 0,
      key_position: 0,
      defensive_move: 0,
    };

    for (const moment of moments) {
      counts[moment.reason]++;
    }

    return counts;
  }, [moments]);

  const hasContent = moments.length > 0;
  const explanationCount = explanations.size;

  return (
    <div className={`coaching-panel ${className}`}>
      {/* Header */}
      <div className="coaching-panel-header">
        <h3 className="coaching-panel-title">
          Coaching Analysis
          {hasContent && (
            <span className="coaching-panel-count">
              {moments.length} moment{moments.length !== 1 ? 's' : ''}
            </span>
          )}
        </h3>
        {hasContent && (
          <div className="coaching-panel-stats">
            {momentCounts.blunder > 0 && (
              <span className="coaching-panel-stat" style={{ color: '#dc2626' }}>
                {momentCounts.blunder} blunder{momentCounts.blunder !== 1 ? 's' : ''}
              </span>
            )}
            {momentCounts.inaccuracy > 0 && (
              <span className="coaching-panel-stat" style={{ color: '#f59e0b' }}>
                {momentCounts.inaccuracy} inaccuracy{momentCounts.inaccuracy !== 1 ? 's' : ''}
              </span>
            )}
            {momentCounts.brilliant > 0 && (
              <span className="coaching-panel-stat" style={{ color: '#16a34a' }}>
                {momentCounts.brilliant} brilliant move{momentCounts.brilliant !== 1 ? 's' : ''}
              </span>
            )}
            {momentCounts.key_position > 0 && (
              <span className="coaching-panel-stat" style={{ color: '#0ea5e9' }}>
                {momentCounts.key_position} key position{momentCounts.key_position !== 1 ? 's' : ''}
              </span>
            )}
            {momentCounts.defensive_move > 0 && (
              <span className="coaching-panel-stat" style={{ color: '#8b5cf6' }}>
                {momentCounts.defensive_move} defensive move{momentCounts.defensive_move !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      {hasContent && (
        <div className="coaching-panel-status">
          <div className="coaching-panel-status-item">
            <span className="coaching-panel-status-label">Explanations:</span>
            <span className="coaching-panel-status-value">
              {explanationCount} of {moments.length}
            </span>
          </div>
          {isLoading && (
            <div className="coaching-panel-status-item">
              <span className="coaching-panel-status-loading">
                <span className="coaching-panel-spinner" /> Generating...
              </span>
            </div>
          )}
          {error && (
            <div className="coaching-panel-status-item" style={{ color: '#dc2626' }}>
              <span>Error generating explanations</span>
            </div>
          )}
          {skillLevel && (
            <div className="coaching-panel-status-item">
              <span className="coaching-panel-status-label">Level:</span>
              <span className="coaching-panel-status-level">{skillLevel}</span>
            </div>
          )}
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="coaching-panel-error-container">
          <ErrorAlert
            error={error}
            onDismiss={onRetry}
            className="coaching-panel-error-alert"
          />
        </div>
      )}

      {/* Loading state */}
      {isLoading && moments.length === 0 && (
        <div className="coaching-panel-loading">
          <LoadingSpinner />
          <p className="coaching-panel-loading-text">Analyzing game and generating coaching...</p>
        </div>
      )}

      {/* Empty state */}
      {!hasContent && !isLoading && (
        <div className="coaching-panel-empty">
          <p className="coaching-panel-empty-message">
            No critical moments detected in this game.
          </p>
          <p className="coaching-panel-empty-hint">
            Load a game to start coaching analysis.
          </p>
        </div>
      )}

      {/* Moments list */}
      {hasContent && (
        <div className="coaching-panel-moments">
          {moments.map((moment) => (
            <MomentCard
              key={moment.moveIndex}
              moment={moment}
              explanation={explanations.get(moment.moveIndex)}
              isLoading={isLoading && !explanations.has(moment.moveIndex)}
              skillLevel={skillLevel}
              className="coaching-panel-moment-card"
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .coaching-panel {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .coaching-panel-header {
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
        }

        .coaching-panel-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .coaching-panel-count {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
          background: white;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .coaching-panel-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .coaching-panel-stat {
          padding: 4px 8px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.05);
        }

        .coaching-panel-status {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          background: #f3f4f6;
          border-bottom: 1px solid #e5e7eb;
          font-size: 12px;
          flex-wrap: wrap;
        }

        .coaching-panel-status-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #6b7280;
        }

        .coaching-panel-status-label {
          font-weight: 600;
          color: #374151;
        }

        .coaching-panel-status-value {
          font-weight: 600;
          color: #667eea;
        }

        .coaching-panel-status-level {
          padding: 2px 8px;
          background: #dbeafe;
          border-radius: 4px;
          color: #1e40af;
          font-weight: 600;
          text-transform: capitalize;
        }

        .coaching-panel-status-loading {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #667eea;
          font-weight: 600;
        }

        .coaching-panel-spinner {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid #dbeafe;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 600ms linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .coaching-panel-error-container {
          padding: 12px 16px;
          background: #fef2f2;
          border-bottom: 1px solid #fecaca;
        }

        .coaching-panel-error-alert {
          margin: 0;
        }

        .coaching-panel-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          text-align: center;
          color: #6b7280;
        }

        .coaching-panel-loading-text {
          margin: 16px 0 0 0;
          font-size: 14px;
          color: #6b7280;
        }

        .coaching-panel-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          text-align: center;
          color: #9ca3af;
        }

        .coaching-panel-empty-message {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .coaching-panel-empty-hint {
          margin: 8px 0 0 0;
          font-size: 12px;
          color: #9ca3af;
        }

        .coaching-panel-moments {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          flex: 1;
          overflow-y: auto;
          max-height: 600px;
        }

        .coaching-panel-moment-card {
          max-height: 500px;
        }

        @media (prefers-color-scheme: dark) {
          .coaching-panel {
            border-color: #374151;
            background: #1f2937;
          }

          .coaching-panel-header {
            background: #111827;
            border-bottom-color: #374151;
          }

          .coaching-panel-title {
            color: #f3f4f6;
          }

          .coaching-panel-count {
            background: #374151;
            color: #d1d5db;
          }

          .coaching-panel-stat {
            background: rgba(255, 255, 255, 0.1);
            color: #f3f4f6;
          }

          .coaching-panel-status {
            background: #111827;
            border-bottom-color: #374151;
            color: #d1d5db;
          }

          .coaching-panel-status-label {
            color: #f3f4f6;
          }

          .coaching-panel-status-value {
            color: #93c5fd;
          }

          .coaching-panel-status-level {
            background: #1e3a8a;
            color: #bfdbfe;
          }

          .coaching-panel-error-container {
            background: #7f1d1d;
            border-bottom-color: #991b1b;
          }

          .coaching-panel-empty {
            color: #6b7280;
          }

          .coaching-panel-empty-message {
            color: #9ca3af;
          }

          .coaching-panel-moments {
            border-top: 1px solid #374151;
          }
        }

        @media (max-width: 768px) {
          .coaching-panel-header {
            flex-direction: column;
            gap: 12px;
          }

          .coaching-panel-title {
            width: 100%;
          }

          .coaching-panel-stats {
            width: 100%;
          }

          .coaching-panel-moments {
            max-height: 400px;
            gap: 10px;
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default CoachingPanel;
