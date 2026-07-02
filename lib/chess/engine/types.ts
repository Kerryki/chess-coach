/**
 * Types for Stockfish engine analysis
 * Defines interfaces for engine configuration, analysis results, and errors
 */

/**
 * Analysis result from Stockfish engine
 * Contains best move, evaluation, and principal variation
 */
export interface EngineAnalysis {
  /** Best move in algebraic notation (e.g., "e2e4", "e7e5") */
  readonly bestMove: string;

  /** Position evaluation in centipawns (positive = white advantage) */
  readonly evaluation: number;

  /** Search depth reached by engine */
  readonly depth: number;

  /** Principal variation: sequence of best moves (3-5 moves) */
  readonly principalVariation: ReadonlyArray<string>;

  /** Whether the position is a checkmate (true if mate detected) */
  readonly isMate: boolean;

  /** Moves until mate if mate is detected (e.g., 3 for "Mate in 3") */
  readonly mateIn?: number;
}

/**
 * Configuration options for engine analysis
 */
export interface EngineOptions {
  /** Maximum search depth (default: 20) */
  readonly depth?: number;

  /** Time limit in milliseconds (default: 2000) */
  readonly timeLimit?: number;
}

/**
 * Engine error with code and message
 */
export interface EngineError {
  /** Error code for categorization */
  readonly code: string;

  /** Human-readable error message */
  readonly message: string;
}

/**
 * Priority of an analysis request. 'interactive' requests (the position the
 * user is currently viewing) preempt 'background' requests (e.g. the bulk
 * per-move sweep that powers coaching-moment detection) so the UI never
 * sits queued behind a long-running bulk scan.
 */
export type AnalysisPriority = 'interactive' | 'background';

/**
 * Worker message for analyzing a position
 */
export interface WorkerAnalyzeMessage {
  readonly type: 'ANALYZE';
  readonly fen: string;
  readonly timeLimit: number;
  readonly requestId?: number;
  readonly priority?: AnalysisPriority;
}

/**
 * Worker message for stopping analysis
 */
export interface WorkerStopMessage {
  readonly type: 'STOP';
  readonly requestId?: number;
}

/**
 * Worker message to upgrade an in-flight 'background' ANALYZE request to
 * 'interactive' priority in place. Sent when a caller wants the exact same
 * FEN that a background request is already analyzing - promoting the
 * existing request gets it fast-tracked without starting a second,
 * duplicate search for the same position.
 */
export interface WorkerPromoteMessage {
  readonly type: 'PROMOTE';
  readonly targetRequestId: number;
  readonly requestId?: number;
}

/**
 * Worker message for initializing engine
 */
export interface WorkerInitMessage {
  readonly type: 'INIT';
  readonly depth: number;
  readonly requestId?: number;
}

/**
 * Union of all worker input messages
 */
export type WorkerInputMessage =
  | WorkerAnalyzeMessage
  | WorkerStopMessage
  | WorkerInitMessage
  | WorkerPromoteMessage;

/**
 * Worker response with analysis results
 */
export interface WorkerAnalysisResponse {
  readonly type: 'ANALYSIS_COMPLETE';
  readonly analysis: EngineAnalysis;
  readonly requestId?: number;
}

/**
 * Worker response confirming engine initialization succeeded
 */
export interface WorkerInitResponse {
  readonly type: 'INIT_COMPLETE';
  readonly requestId?: number;
}

/**
 * Worker response with error
 */
export interface WorkerErrorResponse {
  readonly type: 'ERROR';
  readonly error: EngineError;
  readonly requestId?: number;
}

/**
 * Union of all worker output messages
 */
export type WorkerOutputMessage = WorkerAnalysisResponse | WorkerInitResponse | WorkerErrorResponse;
