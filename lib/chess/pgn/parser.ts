/**
 * PGN parsing utilities
 * Extracts metadata and validated move lists from PGN strings
 */

import { Chess } from 'chess.js';
import { createAppError } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';

/**
 * Game metadata extracted from PGN headers
 */
export interface PgnMetadata {
  readonly event?: string;
  readonly date?: string;
  readonly white?: string;
  readonly black?: string;
  readonly result?: string;
  readonly timeControl?: string;
  readonly site?: string;
  readonly eco?: string;
  readonly whiteElo?: string;
  readonly blackElo?: string;
}

/**
 * Result of PGN parsing
 */
export interface ParsedPgn {
  readonly pgn: string;
  readonly metadata: PgnMetadata;
  readonly moveCount: number;
  readonly moves: ReadonlyArray<string>;
  readonly legalMoves: boolean;
}

/**
 * Matches a single PGN header tag, e.g. [Event "Tournament \"2023\""].
 * Per the PGN spec, tag values escape embedded quotes/backslashes with a
 * leading backslash, so the value group matches either an escaped
 * character (\\.) or any non-quote, non-backslash character.
 */
const PGN_TAG_REGEX = /\[(\w+)\s+"((?:\\.|[^"\\])*)"\]/g;

/**
 * Reverses PGN tag-value escaping (\" -> ", \\ -> \)
 *
 * @param value - Raw captured tag value, still containing escape sequences
 * @returns Unescaped tag value
 */
function unescapePgnTagValue(value: string): string {
  return value.replace(/\\(.)/g, '$1');
}

/**
 * Parses PGN metadata (tags) from the header section
 *
 * @param pgn - PGN string
 * @returns Extracted metadata object
 */
function extractMetadata(pgn: string): PgnMetadata {
  const metadataMap: Record<string, string> = {};
  let match;

  // Create fresh regex instance per call to avoid lastIndex state collisions
  const regex = new RegExp(PGN_TAG_REGEX);

  while ((match = regex.exec(pgn)) !== null) {
    const [, key, value] = match;
    metadataMap[key] = unescapePgnTagValue(value);
  }

  // Build immutable metadata object
  const metadata: PgnMetadata = {
    event: metadataMap['Event'],
    date: metadataMap['Date'],
    white: metadataMap['White'],
    black: metadataMap['Black'],
    result: metadataMap['Result'],
    timeControl: metadataMap['TimeControl'],
    site: metadataMap['Site'],
    eco: metadataMap['ECO'],
    whiteElo: metadataMap['WhiteElo'],
    blackElo: metadataMap['BlackElo'],
  };

  // Remove undefined fields
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  ) as PgnMetadata;
}

/**
 * Extracts moves from PGN move section (after metadata)
 *
 * @param pgn - PGN string
 * @returns Array of move strings
 */
function extractMoves(pgn: string): string[] {
  // Strip header tags first, rather than cutting at the first "\d+." match:
  // multi-word tag values (e.g. FEN "rnbqkbnr/... w KQkq - 0 1", or a Date tag
  // like "2026.07.02") can otherwise be mistaken for the start of movetext.
  let movesSection = pgn.replace(new RegExp(PGN_TAG_REGEX), '');

  if (!/\d+\./.test(movesSection)) {
    return [];
  }

  // Remove brace comments: { ... }
  movesSection = movesSection.replace(/\{[^}]*\}/g, '');

  // Remove parenthetical variations: ( ... )
  // Apply repeatedly for nested variations like (1. e4 (1. d4) 1...e5)
  while (movesSection.includes('(') && movesSection.includes(')')) {
    movesSection = movesSection.replace(/\([^()]*\)/g, '');
  }

  // Split by move numbers and filter out empty strings
  // Matches patterns like: 1. e4 e5 2. Nf3 Nc6
  const tokens = movesSection.split(/\s+/).filter((token) => token.length > 0);

  const moves: string[] = [];

  for (const token of tokens) {
    // Skip move numbers (e.g., "1.", "2.", etc.)
    if (/^\d+\.{1,3}$/.test(token) || /^--$/.test(token)) {
      continue;
    }

    // Skip annotations (start with $)
    if (token.startsWith('$')) {
      continue;
    }

    // Skip any remaining brackets or parentheses
    if (token.includes('(') || token.includes(')') || token.includes('[') || token.includes(']')) {
      continue;
    }

    // Skip game result tokens
    if (token === '1-0' || token === '0-1' || token === '1/2-1/2' || token === '*') {
      continue;
    }

    // Add valid move notation
    if (token.length > 0) {
      moves.push(token);
    }
  }

  return moves;
}

/**
 * Validates all moves in a game using chess.js
 * Ensures the move sequence is legal from starting position
 *
 * @param moves - Array of move strings in algebraic notation
 * @returns Object with validation result and any error details
 */
function validateMoves(moves: string[]): {
  isValid: boolean;
  errorMove?: string;
  errorIndex?: number;
  errorMessage?: string;
} {
  const game = new Chess();

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];

    // Try to make the move (chess.js accepts algebraic notation)
    const result = game.move(move, { strict: false });

    if (!result) {
      return {
        isValid: false,
        errorMove: move,
        errorIndex: i,
        errorMessage: `Illegal move "${move}" at move ${Math.floor(i / 2) + 1}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Parses a PGN string and extracts metadata and moves
 * Validates all moves are legal using chess.js
 *
 * @param pgn - PGN string to parse
 * @returns Parsed PGN with metadata and moves
 * @throws AppError if PGN is invalid or contains illegal moves
 */
export function parsePgn(pgn: string): ParsedPgn {
  try {
    // Validate input
    if (!pgn || typeof pgn !== 'string') {
      throw createAppError(
        'INVALID_PGN',
        'PGN input is empty or not a string',
        'The game format is empty. Please paste a valid PGN.',
        { type: typeof pgn, length: pgn?.length },
      );
    }

    const trimmedPgn = pgn.trim();

    if (trimmedPgn.length < 10) {
      throw createAppError(
        'INVALID_PGN',
        'PGN is too short to be valid',
        'The game format is too short. Please paste a valid PGN.',
        { length: trimmedPgn.length },
      );
    }

    // Extract metadata from tags
    const metadata = extractMetadata(trimmedPgn);

    // Extract moves
    const moves = extractMoves(trimmedPgn);

    if (moves.length === 0) {
      throw createAppError(
        'INVALID_PGN',
        'PGN contains no valid moves',
        'The game format contains no moves. Please check and try again.',
        { pgnLength: trimmedPgn.length },
      );
    }

    // Validate all moves are legal
    const validation = validateMoves(moves);

    if (!validation.isValid) {
      throw createAppError(
        'INVALID_MOVE',
        validation.errorMessage || 'Invalid move sequence in PGN',
        `Illegal move in the game: "${validation.errorMove}". Please check the PGN.`,
        {
          errorMove: validation.errorMove,
          errorIndex: validation.errorIndex,
          moveAtPosition: moves[validation.errorIndex || 0],
        },
      );
    }

    logger.info('Successfully parsed PGN', {
      moveCount: moves.length,
      hasWhite: !!metadata.white,
      hasBlack: !!metadata.black,
    });

    return {
      pgn: trimmedPgn,
      metadata,
      moveCount: moves.length,
      moves: Object.freeze(moves),
      legalMoves: true,
    };
  } catch (error) {
    // Re-throw AppErrors
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      'userMessage' in error
    ) {
      throw error;
    }

    // Wrap other errors
    logger.error('Unexpected error parsing PGN', error);
    throw createAppError(
      'INTERNAL_ERROR',
      `Failed to parse PGN: ${error instanceof Error ? error.message : String(error)}`,
      'Unable to parse the game format. Please try again.',
      {},
      error,
    );
  }
}
