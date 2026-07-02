/**
 * Input validation utilities for PGN and Chess.com URLs
 * Pre-validates inputs before parsing/fetching for fail-fast behavior
 */

import { VALIDATION_CONFIG } from '@/lib/constants/config';

/**
 * Validation result with optional error message
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly error?: string;
}

/**
 * Validates a Chess.com URL format
 * Checks for proper URL structure before attempting to fetch
 *
 * @param url - URL to validate
 * @returns Validation result with error message if invalid
 */
export function validateChessComUrl(url: string): ValidationResult {
  // Check if string
  if (typeof url !== 'string') {
    return {
      isValid: false,
      error: 'URL must be a text string.',
    };
  }

  // Trim and check length
  const trimmedUrl = url.trim();
  if (trimmedUrl.length === 0) {
    return {
      isValid: false,
      error: 'URL cannot be empty.',
    };
  }

  // Check max length (reasonable limit for URLs)
  if (trimmedUrl.length > 2048) {
    return {
      isValid: false,
      error: 'URL is too long.',
    };
  }

  // Check if it looks like a URL
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return {
      isValid: false,
      error: 'URL must start with http:// or https://.',
    };
  }

  // Check Chess.com domain
  if (!trimmedUrl.includes('chess.com')) {
    return {
      isValid: false,
      error: 'URL must be from chess.com domain.',
    };
  }

  // Check if it contains /game/
  if (!trimmedUrl.includes('/game/')) {
    return {
      isValid: false,
      error: 'URL must be a chess.com game link (contains /game/).',
    };
  }

  // Check pattern match (should extract a numeric game ID)
  const match = trimmedUrl.match(/chess\.com\/game\/(?:[^/]+\/)?(\d+)/);
  if (!match || !match[1]) {
    return {
      isValid: false,
      error:
        'Could not find game ID in URL. Use a link like: https://chess.com/game/live/123456789',
    };
  }

  return { isValid: true };
}

/**
 * Validates PGN format and content
 * Checks structure and length before parsing
 *
 * @param pgn - PGN string to validate
 * @returns Validation result with error message if invalid
 */
export function validatePgn(pgn: string): ValidationResult {
  // Check if string
  if (typeof pgn !== 'string') {
    return {
      isValid: false,
      error: 'PGN must be a text string.',
    };
  }

  // Trim and check length
  const trimmedPgn = pgn.trim();

  if (trimmedPgn.length === 0) {
    return {
      isValid: false,
      error: 'PGN cannot be empty.',
    };
  }

  // Check minimum length
  if (trimmedPgn.length < VALIDATION_CONFIG.MIN_PGN_LENGTH) {
    return {
      isValid: false,
      error: `PGN is too short (minimum ${VALIDATION_CONFIG.MIN_PGN_LENGTH} characters).`,
    };
  }

  // Check maximum length
  if (trimmedPgn.length > VALIDATION_CONFIG.MAX_PGN_LENGTH) {
    return {
      isValid: false,
      error: `PGN is too long (maximum ${VALIDATION_CONFIG.MAX_PGN_LENGTH} characters).`,
    };
  }

  // Check for basic PGN structure (should have tags or moves)
  const hasMetadata = /\[[\w]+\s+"[^"]*"\]/.test(trimmedPgn);
  const hasMoves = /\d+\./.test(trimmedPgn);

  if (!hasMetadata && !hasMoves) {
    return {
      isValid: false,
      error: 'PGN does not contain valid chess game data.',
    };
  }

  // Check for at least one move
  const moveCount = (trimmedPgn.match(/\d+\./g) || []).length;
  if (moveCount === 0) {
    return {
      isValid: false,
      error: 'PGN does not contain any moves.',
    };
  }

  // Note: We intentionally allow a wide range of characters here (including accented letters,
  // en-dashes, etc.) because legitimate PGN files may contain extended metadata.
  // The true validation happens during move parsing (chess.js validates move legality).
  // PGN metadata can contain any UTF-8 text; only the moves must be valid chess notation.

  return { isValid: true };
}

/**
 * Combined validation for multiple PGN/URL inputs
 * Returns first error found
 *
 * @param inputs - Array of { type: 'pgn' | 'url', value: string }
 * @returns Validation result with error for first invalid input
 */
export function validateInputs(
  inputs: ReadonlyArray<{ type: 'pgn' | 'url'; value: string }>,
): ValidationResult {
  for (const input of inputs) {
    let result: ValidationResult;

    if (input.type === 'url') {
      result = validateChessComUrl(input.value);
    } else {
      result = validatePgn(input.value);
    }

    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true };
}
