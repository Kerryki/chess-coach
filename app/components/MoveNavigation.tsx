/**
 * Move navigation controls
 * Provides buttons and slider for game navigation with keyboard support
 */

'use client';

import React, { useCallback, useEffect } from 'react';

/**
 * Props for MoveNavigation component
 */
interface MoveNavigationProps {
  readonly currentMoveIndex: number;
  readonly totalMoves: number;
  readonly isAtStart: boolean;
  readonly isAtEnd: boolean;
  readonly onStart: () => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onEnd: () => void;
  readonly onJumpToMove: (index: number) => void;
  readonly className?: string;
}

/**
 * Move navigation component with buttons, slider, and keyboard support
 */
export const MoveNavigation: React.FC<MoveNavigationProps> = ({
  currentMoveIndex,
  totalMoves,
  isAtStart,
  isAtEnd,
  onStart,
  onPrevious,
  onNext,
  onEnd,
  onJumpToMove,
  className = '',
}) => {
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) {
        return; // Don't intercept if typing in input
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          onPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNext();
          break;
        case 'Home':
          e.preventDefault();
          onStart();
          break;
        case 'End':
          e.preventDefault();
          onEnd();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart, onPrevious, onNext, onEnd]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onJumpToMove(parseInt(e.currentTarget.value, 10));
    },
    [onJumpToMove],
  );

  const moveNumber = Math.ceil(currentMoveIndex / 2);
  const totalMoveNumber = Math.ceil(totalMoves / 2);

  return (
    <div className={`move-navigation ${className}`}>
      <div className="nav-buttons">
        <button
          onClick={onStart}
          disabled={isAtStart}
          aria-label="Go to start"
          title="Go to start (Home)"
          className="nav-button nav-button-start"
        >
          ≪
        </button>

        <button
          onClick={onPrevious}
          disabled={isAtStart}
          aria-label="Previous move"
          title="Previous move (←)"
          className="nav-button nav-button-prev"
        >
          ‹
        </button>

        <button
          onClick={onNext}
          disabled={isAtEnd}
          aria-label="Next move"
          title="Next move (→)"
          className="nav-button nav-button-next"
        >
          ›
        </button>

        <button
          onClick={onEnd}
          disabled={isAtEnd}
          aria-label="Go to end"
          title="Go to end (End)"
          className="nav-button nav-button-end"
        >
          ≫
        </button>
      </div>

      <div className="nav-info">
        <div className="move-display">
          <span className="move-number">{moveNumber}</span>
          <span className="move-separator">/</span>
          <span className="move-total">{totalMoveNumber}</span>
        </div>
      </div>

      <div className="nav-slider-container">
        <input
          type="range"
          min="0"
          max={totalMoves}
          value={currentMoveIndex}
          onChange={handleSliderChange}
          className="nav-slider"
          aria-label="Jump to move"
          title="Drag to jump to any move"
        />
      </div>

      <style jsx>{`
        .move-navigation {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          padding: 16px;
          background: #f9f9f9;
          border-radius: 8px;
        }

        .nav-buttons {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .nav-button {
          width: 40px;
          height: 40px;
          padding: 0;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          color: #333;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 200ms ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-button:hover:not(:disabled) {
          background: #667eea;
          color: white;
          border-color: #667eea;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
        }

        .nav-button:active:not(:disabled) {
          transform: scale(0.95);
        }

        .nav-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .nav-info {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
        }

        .move-display {
          display: flex;
          align-items: baseline;
          gap: 4px;
          font-weight: 600;
          color: #333;
          background: white;
          padding: 8px 16px;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
          min-width: 120px;
          justify-content: center;
        }

        .move-number {
          font-size: 18px;
          color: #667eea;
        }

        .move-separator {
          color: #999;
          font-size: 16px;
        }

        .move-total {
          font-size: 16px;
          color: #666;
        }

        .nav-slider-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-slider {
          flex: 1;
          height: 6px;
          border-radius: 3px;
          background: #ddd;
          outline: none;
          -webkit-appearance: none;
          appearance: none;
        }

        .nav-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #667eea;
          cursor: pointer;
          transition: background 200ms ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .nav-slider::-webkit-slider-thumb:hover {
          background: #764ba2;
        }

        .nav-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #667eea;
          cursor: pointer;
          transition: background 200ms ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          border: none;
        }

        .nav-slider::-moz-range-thumb:hover {
          background: #764ba2;
        }

        .nav-slider::-moz-range-track {
          background: transparent;
          border: none;
        }

        @media (prefers-color-scheme: dark) {
          .move-navigation {
            background: #2a2a2a;
          }

          .nav-button {
            background: #333;
            border-color: #555;
            color: #ddd;
          }

          .nav-button:hover:not(:disabled) {
            background: #667eea;
            border-color: #667eea;
            color: white;
          }

          .move-display {
            background: #333;
            border-color: #555;
            color: #ddd;
          }

          .move-number {
            color: #81d4fa;
          }

          .move-separator {
            color: #888;
          }

          .move-total {
            color: #aaa;
          }

          .nav-slider {
            background: #444;
          }
        }

        @media (max-width: 640px) {
          .move-navigation {
            padding: 12px;
            gap: 12px;
          }

          .nav-button {
            width: 36px;
            height: 36px;
            font-size: 16px;
          }

          .move-display {
            font-size: 14px;
            padding: 6px 12px;
            min-width: 100px;
          }

          .move-number {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default MoveNavigation;
