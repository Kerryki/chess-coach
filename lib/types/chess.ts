/**
 * Chess domain types for the coaching application.
 * All types follow immutable patterns - no field mutations.
 */

/**
 * Represents a square on the chessboard (e.g., "e4", "a1")
 */
export type Square = string;

/**
 * Represents a single chess move with algebraic notation
 */
export interface Move {
  readonly from: Square;
  readonly to: Square;
  readonly promotion?: 'q' | 'r' | 'b' | 'n';
  readonly timestamp?: number;
}

/**
 * Represents the current position on the board
 * Contains the FEN string (Forsyth-Edwards Notation)
 */
export interface Position {
  readonly fen: string;
  readonly moveNumber: number;
  readonly halfMoveClock: number;
}

/**
 * Represents the entire state of a chess game
 */
export interface GameState {
  readonly position: Position;
  readonly moves: ReadonlyArray<Move>;
  readonly status: GameStatus;
  readonly result?: GameResult;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/**
 * Possible game statuses
 */
export type GameStatus = 'active' | 'checkmate' | 'stalemate' | 'draw' | 'abandoned';

/**
 * Result of a completed game
 */
export interface GameResult {
  readonly winner?: 'white' | 'black';
  readonly reason: 'checkmate' | 'resignation' | 'agreement' | 'timeout' | 'insufficient_material' | 'threefold_repetition' | 'fifty_move_rule';
  readonly completedAt: number;
}

/**
 * Represents an annotation for a move in a game
 */
export interface MoveAnnotation {
  readonly moveIndex: number;
  readonly text: string;
  readonly strength?: 'excellent' | 'good' | 'interesting' | 'dubious' | 'bad' | 'blunder';
  readonly alternatives?: ReadonlyArray<string>;
}

/**
 * Represents a game review by the AI coach
 */
export interface GameReview {
  readonly gameId: string;
  readonly annotations: ReadonlyArray<MoveAnnotation>;
  readonly summary: string;
  readonly keyLessons: ReadonlyArray<string>;
  readonly createdAt: number;
}
