/**
 * Move validation and application utilities
 * Uses chess.js for legal move validation
 */

import { Chess } from 'chess.js';

/**
 * Result of attempting to apply a move
 */
export interface ApplyMoveResult {
  readonly success: boolean;
  readonly newFen?: string;
  readonly san?: string; // Standard algebraic notation
  readonly error?: string;
}

/**
 * Applies a move to a FEN position and returns the new FEN
 * The move can be in algebraic (e.g., "e4") or coordinate notation (e.g., "e2e4")
 *
 * @param fen - Current FEN string
 * @param moveStr - Move in algebraic or coordinate notation
 * @returns Result object with success flag and new FEN or error message
 */
export function applyMove(fen: string, moveStr: string): ApplyMoveResult {
  try {
    const game = new Chess(fen);
    const move = game.move(moveStr, { strict: false });

    if (!move) {
      return {
        success: false,
        error: `Illegal move: ${moveStr}`,
      };
    }

    return {
      success: true,
      newFen: game.fen(),
      san: move.san,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply move',
    };
  }
}

/**
 * Gets all legal moves from a FEN position in algebraic notation
 * Includes both short algebraic (e.g., "e4") and long algebraic (e.g., "e2e4")
 *
 * @param fen - FEN string of the position
 * @returns Array of legal moves in algebraic notation
 */
export function getLegalMoves(fen: string): ReadonlyArray<string> {
  try {
    const game = new Chess(fen);
    const moves = game.moves({ verbose: false });
    return Object.freeze(moves);
  } catch (error) {
    return Object.freeze([]);
  }
}

/**
 * Gets all legal moves with additional move information
 * Useful for UI highlighting and validation
 *
 * @param fen - FEN string of the position
 * @returns Array of moves with from/to squares
 */
export function getLegalMovesDetailed(
  fen: string,
): ReadonlyArray<{ from: string; to: string; san: string }> {
  try {
    const game = new Chess(fen);
    const moves = game.moves({ verbose: true });
    return Object.freeze(
      moves.map((m) => ({
        from: m.from,
        to: m.to,
        san: m.san,
      })),
    );
  } catch (error) {
    return Object.freeze([]);
  }
}

/**
 * Validates if a move is legal in the given position
 * Accepts moves in algebraic notation (e.g., "e4", "Nf3") or coordinate notation (e.g., "e2e4")
 *
 * @param fen - FEN string of the position
 * @param moveStr - Move to validate
 * @returns True if the move is legal
 */
export function validateMove(fen: string, moveStr: string): boolean {
  try {
    const game = new Chess(fen);
    const move = game.move(moveStr, { strict: false });
    return !!move;
  } catch (error) {
    return false;
  }
}

/**
 * Validates a complete move sequence from the starting position
 * Used to verify PGN or game sequences
 *
 * @param moves - Array of moves in algebraic notation
 * @returns Object with validation result and error details if invalid
 */
export function validateMoveSequence(
  moves: ReadonlyArray<string>,
): {
  readonly isValid: boolean;
  readonly errorMove?: string;
  readonly errorIndex?: number;
  readonly errorMessage?: string;
} {
  const game = new Chess();

  for (let i = 0; i < moves.length; i++) {
    const move = game.move(moves[i] as string, { strict: false });

    if (!move) {
      return {
        isValid: false,
        errorMove: moves[i],
        errorIndex: i,
        errorMessage: `Illegal move "${moves[i]}" at position ${i + 1}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Gets the game status for a FEN position
 * Indicates check, checkmate, stalemate, etc.
 *
 * @param fen - FEN string of the position
 * @returns Game status
 */
export function getGameStatus(
  fen: string,
): 'active' | 'check' | 'checkmate' | 'stalemate' {
  try {
    const game = new Chess(fen);

    if (game.isCheckmate()) {
      return 'checkmate';
    }
    if (game.isStalemate()) {
      return 'stalemate';
    }
    if (game.inCheck()) {
      return 'check';
    }
    return 'active';
  } catch (error) {
    return 'active';
  }
}

/**
 * Gets whose turn it is to move
 *
 * @param fen - FEN string of the position
 * @returns 'white' or 'black'
 */
export function getTurn(fen: string): 'white' | 'black' {
  try {
    const game = new Chess(fen);
    return game.turn() === 'w' ? 'white' : 'black';
  } catch (error) {
    return 'white';
  }
}
