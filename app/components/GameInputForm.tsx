/**
 * Game input form component
 * Provides tabbed interface for loading games from Chess.com URLs or pasting PGN
 */

'use client';

import React, { useState, useCallback } from 'react';
import { AppError } from '@/lib/types/errors';
import ErrorAlert from '@/app/components/ErrorAlert';
import LoadingSpinner from '@/app/components/LoadingSpinner';

/**
 * Props for GameInputForm component
 */
interface GameInputFormProps {
  /** Whether the form is currently loading */
  isLoading: boolean;

  /** Current error, if any */
  error: AppError | null;

  /** Method to load game from URL */
  loadFromUrl: (url: string) => Promise<void>;

  /** Method to load game from PGN text */
  loadFromPgn: (pgn: string) => Promise<void>;

  /** Callback to dismiss error */
  onErrorDismiss?: () => void;
}

/**
 * Input mode for the form
 */
type InputMode = 'url' | 'pgn';

/**
 * GameInputForm component - tabbed form for game input
 * Allows user to input games via Chess.com URL or PGN text
 *
 * @param props - Component props
 * @returns React component
 */
export const GameInputForm: React.FC<GameInputFormProps> = ({
  isLoading,
  error,
  loadFromUrl,
  loadFromPgn,
  onErrorDismiss,
}) => {
  const [mode, setMode] = useState<InputMode>('url');
  const [urlInput, setUrlInput] = useState('');
  const [pgnInput, setPgnInput] = useState('');

  /**
   * Handles URL input mode submit
   */
  const handleUrlSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!urlInput.trim()) return;
      await loadFromUrl(urlInput.trim());
    },
    [urlInput, loadFromUrl],
  );

  /**
   * Handles PGN input mode submit
   */
  const handlePgnSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!pgnInput.trim()) return;
      await loadFromPgn(pgnInput.trim());
    },
    [pgnInput, loadFromPgn],
  );

  /**
   * Handles tab switch
   */
  const handleModeChange = useCallback((newMode: InputMode) => {
    setMode(newMode);
  }, []);

  /**
   * Clears the URL input
   */
  const clearUrlInput = useCallback(() => {
    setUrlInput('');
  }, []);

  /**
   * Clears the PGN input
   */
  const clearPgnInput = useCallback(() => {
    setPgnInput('');
  }, []);

  return (
    <div className="game-input-form">
      {/* Error Alert */}
      <ErrorAlert error={error} onDismiss={onErrorDismiss} />

      {/* Tab Buttons */}
      <div className="game-input-tabs" role="tablist">
        <button
          type="button"
          className={`game-input-tab ${mode === 'url' ? 'active' : ''}`}
          onClick={() => handleModeChange('url')}
          disabled={isLoading}
          aria-selected={mode === 'url'}
          role="tab"
        >
          Load from Chess.com
        </button>
        <button
          type="button"
          className={`game-input-tab ${mode === 'pgn' ? 'active' : ''}`}
          onClick={() => handleModeChange('pgn')}
          disabled={isLoading}
          aria-selected={mode === 'pgn'}
          role="tab"
        >
          Paste PGN
        </button>
      </div>

      {/* Loading Spinner */}
      {isLoading && <LoadingSpinner message="Loading game..." size={30} />}

      {/* URL Input Mode */}
      {mode === 'url' && !isLoading && (
        <form onSubmit={handleUrlSubmit} className="game-input-form-content" role="tabpanel">
          <div className="game-input-field">
            <label htmlFor="chess-com-url">Chess.com Game URL</label>
            <input
              id="chess-com-url"
              type="url"
              placeholder="https://chess.com/game/live/123456789"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={isLoading}
              className="game-input-text"
              aria-label="Chess.com game URL"
              aria-describedby={error ? 'game-input-error' : undefined}
            />
            {urlInput && (
              <button
                type="button"
                className="game-input-clear"
                onClick={clearUrlInput}
                aria-label="Clear URL input"
              >
                Clear
              </button>
            )}
          </div>

          <div className="game-input-helper-text">
            Paste a Chess.com game link. Supports live, rapid, blitz, and bullet games.
          </div>

          <button
            type="submit"
            className="game-input-submit"
            disabled={!urlInput.trim() || isLoading}
            aria-label="Load game from Chess.com URL"
          >
            Load Game
          </button>
        </form>
      )}

      {/* PGN Input Mode */}
      {mode === 'pgn' && !isLoading && (
        <form onSubmit={handlePgnSubmit} className="game-input-form-content" role="tabpanel">
          <div className="game-input-field">
            <label htmlFor="pgn-text">PGN Text</label>
            <textarea
              id="pgn-text"
              placeholder={`[Event "Sample Game"]
[White "Player 1"]
[Black "Player 2"]

1. e4 e5 2. Nf3 Nc6...`}
              value={pgnInput}
              onChange={(e) => setPgnInput(e.target.value)}
              disabled={isLoading}
              className="game-input-textarea"
              rows={10}
              aria-label="PGN text"
              aria-describedby={error ? 'game-input-error' : undefined}
            />
            {pgnInput && (
              <button
                type="button"
                className="game-input-clear"
                onClick={clearPgnInput}
                aria-label="Clear PGN input"
              >
                Clear
              </button>
            )}
          </div>

          <div className="game-input-helper-text">
            Paste your PGN (Portable Game Notation) here. Include game headers and all moves.
          </div>

          <button
            type="submit"
            className="game-input-submit"
            disabled={!pgnInput.trim() || isLoading}
            aria-label="Parse PGN text"
          >
            Parse Game
          </button>
        </form>
      )}

      <style jsx>{`
        .game-input-form {
          width: 100%;
          padding: 24px;
          background-color: #f5f5f5;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }

        .game-input-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e0e0e0;
        }

        .game-input-tab {
          padding: 12px 16px;
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 200ms ease;
          margin-bottom: -2px;
        }

        .game-input-tab:hover:not(:disabled) {
          color: #333;
        }

        .game-input-tab.active {
          color: #1976d2;
          border-bottom-color: #1976d2;
        }

        .game-input-tab:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .game-input-form-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .game-input-field {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .game-input-field label {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .game-input-text,
        .game-input-textarea {
          padding: 12px;
          font-size: 14px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-family: inherit;
          background-color: white;
          color: #333;
          transition: border-color 200ms ease;
        }

        .game-input-text:focus,
        .game-input-textarea:focus {
          outline: none;
          border-color: #1976d2;
          box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
        }

        .game-input-text:disabled,
        .game-input-textarea:disabled {
          background-color: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }

        .game-input-textarea {
          resize: vertical;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          line-height: 1.5;
        }

        .game-input-clear {
          position: absolute;
          top: 36px;
          right: 12px;
          padding: 4px 8px;
          font-size: 12px;
          background-color: transparent;
          border: 1px solid #ccc;
          border-radius: 3px;
          color: #666;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .game-input-clear:hover {
          background-color: #f0f0f0;
          border-color: #999;
        }

        .game-input-helper-text {
          font-size: 13px;
          color: #666;
          font-style: italic;
        }

        .game-input-submit {
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          background-color: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .game-input-submit:hover:not(:disabled) {
          background-color: #1565c0;
          box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
        }

        .game-input-submit:active:not(:disabled) {
          background-color: #154399;
        }

        .game-input-submit:disabled {
          background-color: #ccc;
          color: #999;
          cursor: not-allowed;
        }

        @media (prefers-color-scheme: dark) {
          .game-input-form {
            background-color: #1e1e1e;
            border-color: #333;
          }

          .game-input-tabs {
            border-bottom-color: #333;
          }

          .game-input-tab {
            color: #999;
          }

          .game-input-tab:hover:not(:disabled) {
            color: #ccc;
          }

          .game-input-tab.active {
            color: #90caf9;
            border-bottom-color: #90caf9;
          }

          .game-input-field label {
            color: #ccc;
          }

          .game-input-text,
          .game-input-textarea {
            background-color: #2a2a2a;
            border-color: #444;
            color: #ddd;
          }

          .game-input-text:focus,
          .game-input-textarea:focus {
            border-color: #90caf9;
            box-shadow: 0 0 0 2px rgba(144, 202, 249, 0.1);
          }

          .game-input-text:disabled,
          .game-input-textarea:disabled {
            background-color: #1e1e1e;
            color: #666;
          }

          .game-input-helper-text {
            color: #999;
          }

          .game-input-clear {
            background-color: transparent;
            border-color: #444;
            color: #999;
          }

          .game-input-clear:hover {
            background-color: #2a2a2a;
            border-color: #666;
          }
        }
      `}</style>
    </div>
  );
};

export default GameInputForm;
