/**
 * Board state utilities
 * Derives board state from positions and provides legal moves
 */

import { Chess } from 'chess.js';

/**
 * Literal union type of all 64 chess squares
 */
export type Square =
  | 'a1' | 'b1' | 'c1' | 'd1' | 'e1' | 'f1' | 'g1' | 'h1'
  | 'a2' | 'b2' | 'c2' | 'd2' | 'e2' | 'f2' | 'g2' | 'h2'
  | 'a3' | 'b3' | 'c3' | 'd3' | 'e3' | 'f3' | 'g3' | 'h3'
  | 'a4' | 'b4' | 'c4' | 'd4' | 'e4' | 'f4' | 'g4' | 'h4'
  | 'a5' | 'b5' | 'c5' | 'd5' | 'e5' | 'f5' | 'g5' | 'h5'
  | 'a6' | 'b6' | 'c6' | 'd6' | 'e6' | 'f6' | 'g6' | 'h6'
  | 'a7' | 'b7' | 'c7' | 'd7' | 'e7' | 'f7' | 'g7' | 'h7'
  | 'a8' | 'b8' | 'c8' | 'd8' | 'e8' | 'f8' | 'g8' | 'h8';

/**
 * Represents a move in algebraic notation with source/destination
 */
export interface MoveInfo {
  readonly from: Square;
  readonly to: Square;
  readonly san: string; // Standard algebraic notation (e.g., "e4", "Nf3")
  readonly lan: string; // Long algebraic notation (e.g., "e2e4")
}

/**
 * Represents the state of the board at a specific position
 */
export interface BoardState {
  readonly fen: string;
  readonly legalMoves: ReadonlyArray<MoveInfo>;
  readonly lastMove?: {
    readonly from: Square;
    readonly to: Square;
  };
  readonly currentMoveIndex: number;
  readonly totalMoves: number;
}

/**
 * Gets the board state for a given position in the game
 *
 * @param moves - Array of moves in algebraic notation
 * @param moveIndex - Index of the current move (0 = starting position)
 * @returns Board state including FEN and legal moves
 */
export function getBoardState(moves: ReadonlyArray<string>, moveIndex: number): BoardState {
  const game = new Chess();

  // Apply all moves up to the current index
  const appliedMoves: MoveInfo[] = [];
  let lastMove: { from: Square; to: Square } | undefined;

  for (let i = 0; i < moveIndex && i < moves.length; i++) {
    const move = game.move(moves[i], { strict: false });
    if (move) {
      appliedMoves.push({
        from: move.from as Square,
        to: move.to as Square,
        san: move.san,
        lan: `${move.from}${move.to}`,
      });
      lastMove = { from: move.from as Square, to: move.to as Square };
    }
  }

  // Get current FEN
  const fen = game.fen();

  // Get legal moves from current position
  const legalMovesChess = game.moves({ verbose: true });
  const legalMoves = legalMovesChess.map((move) => ({
    from: move.from as Square,
    to: move.to as Square,
    san: move.san,
    lan: `${move.from}${move.to}`,
  }));

  return Object.freeze({
    fen,
    legalMoves: Object.freeze(legalMoves),
    lastMove,
    currentMoveIndex: moveIndex,
    totalMoves: moves.length,
  });
}

/**
 * Gets all legal moves from a FEN position
 * Useful for validation and move highlighting
 *
 * @param fen - FEN string of the position
 * @returns Array of legal moves
 */
export function getLegalMovesFromFen(fen: string): ReadonlyArray<MoveInfo> {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });

  return Object.freeze(
    moves.map((move) => ({
      from: move.from as Square,
      to: move.to as Square,
      san: move.san,
      lan: `${move.from}${move.to}`,
    })),
  );
}

/**
 * Checks if a move is legal in the current position
 *
 * @param fen - FEN string of the position
 * @param from - Source square
 * @param to - Destination square
 * @returns True if the move is legal
 */
export function isMoveLegal(fen: string, from: Square, to: Square): boolean {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  return moves.some((m) => m.from === from && m.to === to);
}
