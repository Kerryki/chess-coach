/**
 * Game information display
 * Shows game metadata like players, event, date, result
 */

'use client';

import React from 'react';

/**
 * Props for GameInfo component
 */
interface GameInfoProps {
  readonly white?: string;
  readonly black?: string;
  readonly event?: string;
  readonly date?: string;
  readonly result?: string;
  readonly site?: string;
  readonly className?: string;
}

/**
 * Game information display component
 */
export const GameInfo: React.FC<GameInfoProps> = ({
  white,
  black,
  event,
  date,
  result,
  site,
  className = '',
}) => {
  // Don't render if no info
  if (!white && !black && !event && !date && !result && !site) {
    return null;
  }

  return (
    <div className={`game-info ${className}`}>
      <div className="game-info-content">
        {(white || black) && (
          <div className="game-info-item">
            <span className="label">Game:</span>
            <span className="value">
              {white || 'White'} vs {black || 'Black'}
            </span>
          </div>
        )}

        {event && (
          <div className="game-info-item">
            <span className="label">Event:</span>
            <span className="value">{event}</span>
          </div>
        )}

        {date && (
          <div className="game-info-item">
            <span className="label">Date:</span>
            <span className="value">{date}</span>
          </div>
        )}

        {site && (
          <div className="game-info-item">
            <span className="label">Site:</span>
            <span className="value">{site}</span>
          </div>
        )}

        {result && (
          <div className="game-info-item">
            <span className="label">Result:</span>
            <span className="value game-result">{result}</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .game-info {
          width: 100%;
          padding: 16px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .game-info-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .game-info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .label {
          font-size: 12px;
          font-weight: 700;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .value {
          font-size: 14px;
          color: #333;
          font-weight: 500;
          word-break: break-word;
        }

        .game-result {
          display: inline-block;
          padding: 4px 8px;
          background: #f5f5f5;
          border-radius: 4px;
          border-left: 3px solid #667eea;
          font-weight: 600;
          color: #667eea;
        }

        @media (prefers-color-scheme: dark) {
          .game-info {
            background: #2a2a2a;
            border-color: #444;
          }

          .label {
            color: #999;
          }

          .value {
            color: #ddd;
          }

          .game-result {
            background: #333;
            color: #81d4fa;
            border-left-color: #81d4fa;
          }
        }

        @media (max-width: 640px) {
          .game-info {
            padding: 12px;
          }

          .game-info-content {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .label {
            font-size: 11px;
          }

          .value {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
};

export default GameInfo;
