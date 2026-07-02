/**
 * Game input container component
 * Wraps GameInputForm with state management and success display
 */

'use client';

import React, { useCallback } from 'react';
import { ParsedPgn } from '@/lib/chess/pgn/parser';
import { useGameInput } from '@/lib/hooks/useGameInput';
import GameInputForm from '@/app/components/GameInputForm';

/**
 * Props for GameInput component
 */
interface GameInputProps {
  /** Callback when a game is successfully loaded */
  onGameLoaded: (game: ParsedPgn) => void;

  /** Optional CSS class name for styling */
  className?: string;
}

/**
 * GameInput component - container for game input with state management
 * Combines GameInputForm with success state display
 *
 * @param props - Component props
 * @returns React component
 */
export const GameInput: React.FC<GameInputProps> = ({ onGameLoaded, className = '' }) => {
  const { isLoading, error, parsedGame, loadFromUrl, loadFromPgn, reset } = useGameInput();

  /**
   * Handles successful game load
   */
  const handleGameLoaded = useCallback(
    (game: ParsedPgn) => {
      onGameLoaded(game);
    },
    [onGameLoaded],
  );

  /**
   * Handles starting a new game input
   */
  const handleStartNew = useCallback(() => {
    reset();
  }, [reset]);

  // Show success state if game is loaded
  if (parsedGame) {
    return (
      <div className={`game-input-container ${className}`}>
        <div className="game-input-success">
          <div className="game-input-success-header">
            <h3>Game Loaded Successfully</h3>
            <button
              type="button"
              className="game-input-success-close"
              onClick={handleStartNew}
              aria-label="Load another game"
            >
              ×
            </button>
          </div>

          <div className="game-input-success-content">
            <div className="game-input-success-item">
              <span className="game-input-success-label">Moves:</span>
              <span className="game-input-success-value">{parsedGame.moveCount}</span>
            </div>

            {parsedGame.metadata.white && (
              <div className="game-input-success-item">
                <span className="game-input-success-label">White:</span>
                <span className="game-input-success-value">{parsedGame.metadata.white}</span>
              </div>
            )}

            {parsedGame.metadata.black && (
              <div className="game-input-success-item">
                <span className="game-input-success-label">Black:</span>
                <span className="game-input-success-value">{parsedGame.metadata.black}</span>
              </div>
            )}

            {parsedGame.metadata.result && (
              <div className="game-input-success-item">
                <span className="game-input-success-label">Result:</span>
                <span className="game-input-success-value">{parsedGame.metadata.result}</span>
              </div>
            )}

            {parsedGame.metadata.date && (
              <div className="game-input-success-item">
                <span className="game-input-success-label">Date:</span>
                <span className="game-input-success-value">{parsedGame.metadata.date}</span>
              </div>
            )}

            {parsedGame.metadata.timeControl && (
              <div className="game-input-success-item">
                <span className="game-input-success-label">Time Control:</span>
                <span className="game-input-success-value">{parsedGame.metadata.timeControl}</span>
              </div>
            )}
          </div>

          <div className="game-input-success-actions">
            <button
              type="button"
              className="game-input-analyze-btn"
              onClick={() => handleGameLoaded(parsedGame)}
              aria-label="Analyze this game"
            >
              Analyze Game
            </button>
            <button
              type="button"
              className="game-input-load-new-btn"
              onClick={handleStartNew}
              aria-label="Load another game"
            >
              Load Another
            </button>
          </div>
        </div>

        <style jsx>{`
          .game-input-success {
            padding: 24px;
            background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
            border: 2px solid #4caf50;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(76, 175, 80, 0.15);
          }

          .game-input-success-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(76, 175, 80, 0.3);
          }

          .game-input-success-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #2e7d32;
          }

          .game-input-success-close {
            padding: 0;
            width: 32px;
            height: 32px;
            background: none;
            border: none;
            font-size: 24px;
            color: #2e7d32;
            cursor: pointer;
            transition: opacity 200ms ease;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .game-input-success-close:hover {
            opacity: 0.7;
          }

          .game-input-success-content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
          }

          .game-input-success-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .game-input-success-label {
            font-size: 12px;
            font-weight: 600;
            color: #558b2f;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .game-input-success-value {
            font-size: 14px;
            color: #1b5e20;
            font-weight: 500;
            word-break: break-word;
          }

          .game-input-success-actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }

          .game-input-analyze-btn,
          .game-input-load-new-btn {
            padding: 10px 16px;
            font-size: 14px;
            font-weight: 600;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: all 200ms ease;
          }

          .game-input-analyze-btn {
            background-color: #4caf50;
            color: white;
          }

          .game-input-analyze-btn:hover {
            background-color: #45a049;
            box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
          }

          .game-input-load-new-btn {
            background-color: transparent;
            color: #2e7d32;
            border: 1px solid #4caf50;
          }

          .game-input-load-new-btn:hover {
            background-color: rgba(76, 175, 80, 0.1);
          }

          @media (prefers-color-scheme: dark) {
            .game-input-success {
              background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%);
              border-color: #81c784;
              box-shadow: 0 2px 8px rgba(129, 199, 132, 0.15);
            }

            .game-input-success-header {
              border-bottom-color: rgba(129, 199, 132, 0.3);
            }

            .game-input-success-header h3 {
              color: #81c784;
            }

            .game-input-success-close {
              color: #81c784;
            }

            .game-input-success-label {
              color: #a5d6a7;
            }

            .game-input-success-value {
              color: #c8e6c9;
            }

            .game-input-load-new-btn {
              color: #81c784;
              border-color: #81c784;
            }

            .game-input-load-new-btn:hover {
              background-color: rgba(129, 199, 132, 0.1);
            }
          }
        `}</style>
      </div>
    );
  }

  // Show input form if no game is loaded
  return (
    <div className={`game-input-container ${className}`}>
      <GameInputForm
        isLoading={isLoading}
        error={error}
        loadFromUrl={loadFromUrl}
        loadFromPgn={loadFromPgn}
        onErrorDismiss={reset}
      />

      <style jsx>{`
        .game-input-container {
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default GameInput;
