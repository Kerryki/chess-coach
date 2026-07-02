/**
 * PGN fetching utilities for Chess.com URLs
 * Handles URL parsing and PGN retrieval from Chess.com public API
 */

import { Chess } from 'chess.js';
import { decodeTCN } from 'chess-tcn';
import { createAppError } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';
import { API_CONFIG } from '@/lib/constants/config';

/**
 * Extracts numeric game ID from Chess.com URL
 * Supports formats:
 * - https://www.chess.com/game/live/123456789
 * - https://chess.com/game/rapid/987654321
 * - https://chess.com/game/blitz/111111111
 *
 * @param url - Chess.com URL
 * @returns Numeric game ID or null if invalid
 */
export function parseChessComUrl(url: string): string | null {
  try {
    // Extract game ID from URL path using regex
    // Matches /game/{gameType}/{gameId} patterns
    const match = url.match(/chess\.com\/game\/(?:[^/]+\/)?(\d+)/);
    return match?.[1] ?? null;
  } catch (error) {
    logger.debug('Failed to parse Chess.com URL', { url, error });
    return null;
  }
}

/**
 * Shape of the response from Chess.com's live-game callback endpoint.
 * This is an undocumented endpoint (there is no official public API for
 * fetching a single game by ID), so the shape is reverse-engineered and
 * may change without notice.
 */
interface ChessComCallbackResponse {
  readonly game?: {
    readonly moveList?: string;
    readonly pgnHeaders?: Record<string, string | number>;
  };
}

/**
 * Builds a PGN string from Chess.com's TCN-encoded move list and header data.
 *
 * @throws Error if the move list contains an illegal or undecodable move
 */
function buildPgnFromTcn(
  moveList: string,
  pgnHeaders: Record<string, string | number>,
): string {
  const chess = new Chess();

  for (const [key, value] of Object.entries(pgnHeaders)) {
    chess.setHeader(key, String(value));
  }

  const moves = decodeTCN(moveList);
  for (const move of moves) {
    if (!move.from) {
      throw new Error(
        'Move list contains a drop move, which indicates an unsupported variant (e.g. Crazyhouse)',
      );
    }
    chess.move({ from: move.from, to: move.to, promotion: move.promotion });
  }

  return chess.pgn();
}

/**
 * Fetches PGN for a Chess.com game via our `/api/chess-com/game/{gameId}` proxy,
 * which forwards Chess.com's undocumented live-game callback endpoint
 * (chess.com's public `/pub/` API has no single-game-by-ID lookup). The proxy
 * exists because that endpoint sends no CORS headers and can't be called
 * directly from the browser.
 *
 * @param url - Chess.com game URL
 * @returns PGN string
 * @throws AppError if URL is invalid, fetch fails, or API returns error
 */
export async function fetchPgnFromChessComUrl(url: string): Promise<string> {
  try {
    // Parse game ID from URL
    const gameId = parseChessComUrl(url);
    if (!gameId) {
      throw createAppError(
        'INVALID_CHESS_COM_URL',
        'Failed to extract game ID from Chess.com URL',
        'Invalid Chess.com URL. Please use a valid game link (e.g., chess.com/game/live/123456789).',
        { url },
      );
    }

    logger.debug('Fetching PGN from Chess.com API', { gameId });

    // Fetch via our same-origin proxy: Chess.com's callback endpoint has no
    // CORS headers, so it can't be called directly from the browser.
    const apiUrl = `/api/chess-com/game/${gameId}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      API_CONFIG.NETWORK_TIMEOUT_MS,
    );

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-200 responses
      if (!response.ok) {
        if (response.status === 404) {
          throw createAppError(
            'GAME_NOT_FOUND',
            `Chess.com game ${gameId} not found`,
            'The Chess.com game was not found. Please check the URL and try again.',
            { gameId, status: response.status },
          );
        }

        if (response.status >= 500) {
          throw createAppError(
            'CHESS_COM_API_ERROR',
            `Chess.com API returned ${response.status}`,
            'Chess.com is currently unavailable. Please try again later.',
            { gameId, status: response.status },
          );
        }

        throw createAppError(
          'CHESS_COM_API_ERROR',
          `Chess.com API returned ${response.status}: ${response.statusText}`,
          'Unable to fetch the game. Please check the URL and try again.',
          { gameId, status: response.status },
        );
      }

      // Parse response
      const data = (await response.json()) as ChessComCallbackResponse;
      const moveList = data?.game?.moveList;

      if (typeof moveList !== 'string') {
        throw createAppError(
          'INVALID_CHESS_COM_RESPONSE',
          'Chess.com API response missing moveList field',
          'Invalid response from Chess.com. Please try again.',
          { gameId },
        );
      }

      let pgn: string;
      try {
        pgn = buildPgnFromTcn(moveList, data.game?.pgnHeaders ?? {});
      } catch (decodeError) {
        throw createAppError(
          'INVALID_CHESS_COM_RESPONSE',
          `Failed to decode Chess.com move list: ${
            decodeError instanceof Error ? decodeError.message : String(decodeError)
          }`,
          'Unable to parse the Chess.com game. Please try again.',
          { gameId },
          decodeError instanceof Error ? decodeError : undefined,
        );
      }

      logger.info('Successfully fetched PGN from Chess.com', { gameId });
      return pgn;
    } catch (error) {
      clearTimeout(timeoutId);

      // Don't wrap if already an AppError
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        'userMessage' in error
      ) {
        throw error;
      }

      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw createAppError(
          'FETCH_TIMEOUT',
          'Chess.com API request timed out',
          'The request took too long. Please try again.',
          { gameId, timeoutMs: API_CONFIG.NETWORK_TIMEOUT_MS },
          error,
        );
      }

      // Handle network errors
      if (error instanceof Error && error.message.includes('fetch')) {
        throw createAppError(
          'NETWORK_ERROR',
          `Failed to fetch from Chess.com: ${error.message}`,
          'Unable to connect to Chess.com. Please check your internet connection.',
          { gameId },
          error,
        );
      }

      throw error;
    }
  } catch (error) {
    // Re-throw AppErrors as-is
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      'userMessage' in error
    ) {
      throw error;
    }

    // Wrap unknown errors
    logger.error('Unexpected error fetching PGN from Chess.com', error, { url });
    throw createAppError(
      'INTERNAL_ERROR',
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      'An unexpected error occurred. Please try again.',
      { url },
      error,
    );
  }
}
