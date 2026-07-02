/**
 * Custom React hook for managing game input state and operations
 * Handles loading games from URLs and PGN strings with proper error handling
 */

'use client';

import { useState, useCallback } from 'react';
import { ParsedPgn } from '@/lib/chess/pgn/parser';
import { fetchPgnFromChessComUrl } from '@/lib/chess/pgn/fetcher';
import { parsePgn } from '@/lib/chess/pgn/parser';
import { validateChessComUrl, validatePgn } from '@/lib/chess/pgn/validator';
import { AppError } from '@/lib/types/errors';
import { createAppError, wrapError } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';

/**
 * State for game input hook
 */
interface GameInputState {
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly parsedGame: ParsedPgn | null;
}

/**
 * Hook return type
 */
export interface UseGameInputReturn {
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly parsedGame: ParsedPgn | null;
  readonly loadFromUrl: (url: string) => Promise<void>;
  readonly loadFromPgn: (pgn: string) => Promise<void>;
  readonly reset: () => void;
}

/**
 * Custom hook for managing game input
 * Provides state and methods for loading games from URLs or PGN text
 *
 * @returns Hook with state and methods
 */
export function useGameInput(): UseGameInputReturn {
  const [state, setState] = useState<GameInputState>({
    isLoading: false,
    error: null,
    parsedGame: null,
  });

  /**
   * Resets state to initial empty state
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      parsedGame: null,
    });
    logger.debug('Game input state reset');
  }, []);

  /**
   * Loads a game from a Chess.com URL
   * Fetches PGN via API and parses it
   *
   * @param url - Chess.com game URL
   */
  const loadFromUrl = useCallback(
    async (url: string): Promise<void> => {
      try {
        // Set isLoading first unconditionally to prevent race conditions
        setState({
          isLoading: true,
          error: null,
          parsedGame: null,
        });

        // Validate URL format
        const validation = validateChessComUrl(url);
        if (!validation.isValid) {
          const error = createAppError(
            'INVALID_INPUT',
            validation.error || 'Invalid Chess.com URL',
            validation.error || 'Invalid Chess.com URL',
            { url },
          );
          setState({
            isLoading: false,
            error,
            parsedGame: null,
          });
          return;
        }

        logger.info('Loading game from Chess.com URL', { url: url.substring(0, 50) });

        // Fetch PGN from Chess.com API
        const pgn = await fetchPgnFromChessComUrl(url);

        // Parse the PGN
        const parsed = parsePgn(pgn);

        setState({
          isLoading: false,
          error: null,
          parsedGame: parsed,
        });

        logger.info('Successfully loaded game from URL', {
          moveCount: parsed.moveCount,
        });
      } catch (error) {
        const appError = wrapError(error, { url });
        logger.error('Failed to load game from URL', error, { url });
        setState({
          isLoading: false,
          error: appError,
          parsedGame: null,
        });
      }
    },
    [],
  );

  /**
   * Loads a game from pasted PGN text
   * Parses the PGN directly without fetching
   *
   * @param pgn - PGN string
   */
  const loadFromPgn = useCallback(
    async (pgn: string): Promise<void> => {
      try {
        // Set isLoading first unconditionally to prevent race conditions
        setState({
          isLoading: true,
          error: null,
          parsedGame: null,
        });

        // Validate PGN format
        const validation = validatePgn(pgn);
        if (!validation.isValid) {
          const error = createAppError(
            'INVALID_INPUT',
            validation.error || 'Invalid PGN',
            validation.error || 'Invalid PGN',
            { pgnLength: pgn?.length },
          );
          setState({
            isLoading: false,
            error,
            parsedGame: null,
          });
          return;
        }

        logger.info('Parsing PGN text', { length: pgn.length });

        // Parse the PGN
        const parsed = parsePgn(pgn);

        setState({
          isLoading: false,
          error: null,
          parsedGame: parsed,
        });

        logger.info('Successfully parsed PGN', {
          moveCount: parsed.moveCount,
        });
      } catch (error) {
        const appError = wrapError(error, { pgnLength: pgn?.length });
        logger.error('Failed to parse PGN', error);
        setState({
          isLoading: false,
          error: appError,
          parsedGame: null,
        });
      }
    },
    [],
  );

  return {
    isLoading: state.isLoading,
    error: state.error,
    parsedGame: state.parsedGame,
    loadFromUrl,
    loadFromPgn,
    reset,
  };
}
