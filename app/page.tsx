/**
 * Main entry point page
 * Orchestrates game input and board layout views
 */

'use client';

import React, { useState } from 'react';
import { ParsedPgn } from '@/lib/chess/pgn/parser';
import { logger } from '@/lib/utils/logger';
import { loadSettings } from '@/lib/storage/settings';
import { ErrorAlert } from '@/app/components/ErrorAlert';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import GameInput from '@/app/components/GameInput';
import BoardLayout from '@/app/components/BoardLayout';

const STYLES = `
  .home-page {
    flex: 1;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .home-container { width: 100%; max-width: 900px; }
  .welcome-section {
    background: white;
    border-radius: 8px;
    padding: 40px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }
  .welcome-title {
    font-size: 48px;
    font-weight: 700;
    margin-bottom: 8px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .welcome-subtitle { font-size: 18px; color: #666; margin-bottom: 32px; }
  .foundation-status {
    margin-bottom: 32px;
    padding-bottom: 32px;
    border-bottom: 1px solid #e0e0e0;
  }
  .foundation-status h2 { font-size: 24px; margin-bottom: 12px; color: #333; }
  .status-description { color: #666; margin-bottom: 20px; }
  .status-items { display: grid; gap: 8px; }
  .status-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    font-size: 14px;
  }
  .status-item.complete { color: #2e7d32; }
  .status-check { font-weight: bold; font-size: 18px; }
  .settings-display {
    margin-bottom: 32px;
    padding: 24px;
    background: #f5f5f5;
    border-radius: 8px;
  }
  .settings-display h3 { font-size: 18px; margin-bottom: 16px; color: #333; }
  .settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }
  .setting-item { display: flex; flex-direction: column; gap: 4px; }
  .setting-item label {
    font-size: 12px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .setting-value { font-size: 16px; font-weight: 500; color: #333; }
  .next-phase {
    margin-bottom: 32px;
    padding: 24px;
    background: #e3f2fd;
    border-left: 4px solid #1976d2;
    border-radius: 4px;
  }
  .next-phase h3 { font-size: 18px; margin-bottom: 8px; color: #1565c0; }
  .next-phase p { color: #0d47a1; line-height: 1.6; }
  .tech-specs h3 { font-size: 18px; margin-bottom: 12px; color: #333; }
  .tech-specs ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 8px;
  }
  .tech-specs li {
    padding: 8px 0;
    color: #666;
    border-bottom: 1px solid #eee;
  }
  .tech-specs li:last-child { border-bottom: none; }
  @media (max-width: 768px) {
    .welcome-section { padding: 24px; }
    .welcome-title { font-size: 32px; }
    .welcome-subtitle { font-size: 16px; }
    .settings-grid { grid-template-columns: 1fr; }
    .tech-specs ul { grid-template-columns: 1fr; }
  }
`;

/**
 * Home page component
 * Main entry point - orchestrates game input and board views
 *
 * @returns React component
 */
export default function Home(): React.ReactElement {
  const [isInitialized, setIsInitialized] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [parsedGame, setParsedGame] = useState<ParsedPgn | null>(null);

  React.useEffect(() => {
    try {
      logger.info('Initializing Chess Coach application');

      // Load settings to verify initialization
      const loadedSettings = loadSettings();

      logger.info('Application initialized successfully', {
        skillLevel: loadedSettings.skillLevel,
        theme: loadedSettings.theme,
      });

      setIsInitialized(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to initialize application', error);
      setError(error);
    }
  }, []);

  const handleGameLoaded = React.useCallback((game: ParsedPgn) => {
    setParsedGame(game);
    logger.info('Game loaded for analysis', { moveCount: game.moveCount });
  }, []);

  const handleLoadDifferentGame = React.useCallback(() => {
    setParsedGame(null);
  }, []);

  if (error) {
    return (
      <main className="home-page">
        <ErrorAlert
          error={{
            code: 'INIT_ERROR',
            message: error.message,
            userMessage: 'Failed to initialize the application. Please refresh the page.',
            timestamp: Date.now(),
          }}
        />
      </main>
    );
  }

  if (!isInitialized) {
    return (
      <main className="home-page">
        <LoadingSpinner message="Initializing Chess Coach..." />
      </main>
    );
  }

  // Show board layout if game is loaded
  if (parsedGame) {
    return (
      <main className="home-page">
        <BoardLayout
          parsedGame={parsedGame}
          onLoadDifferentGame={handleLoadDifferentGame}
        />
      </main>
    );
  }

  // Show game input form
  return (
    <main className="home-page">
      <div className="home-container">
        <GameInput onGameLoaded={handleGameLoaded} />
      </div>

      <style jsx>{STYLES}</style>
    </main>
  );
}
