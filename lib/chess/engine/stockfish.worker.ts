/**
 * Web worker for running Stockfish analysis in a separate thread
 * Prevents UI blocking during engine computation
 *
 * This file runs in a worker context, not the main thread
 * Note: This file is only loaded in web worker context, not in main bundle
 */

import type {
  EngineAnalysis,
  WorkerInputMessage,
  WorkerAnalysisResponse,
  WorkerInitResponse,
  WorkerErrorResponse,
} from '@/lib/chess/engine/types';
import { AnalysisRequestQueue } from '@/lib/chess/engine/analysisRequestQueue';

/**
 * Stockfish instance: a nested Worker spawned in initializeEngine(), driven
 * with raw UCI protocol strings over postMessage/onmessage.
 */
let engine: Worker | null = null;

/**
 * Flag to track if engine is currently analyzing
 */
let isAnalyzing = false;

/**
 * Current request ID for correlation between requests and responses
 */
let currentRequestId: number | null = null;

/**
 * Serializes ANALYZE requests against the single underlying Stockfish
 * process (a UCI engine can only search one position at a time) and
 * prioritizes the position the user is currently viewing over the bulk
 * per-move sweep that powers coaching-moment detection. See
 * analysisRequestQueue.ts for the full ordering/preemption rules.
 */
const analysisRequestQueue = new AnalysisRequestQueue({
  onSuperseded: (requestId) =>
    sendError('ANALYSIS_SUPERSEDED', 'Superseded by a newer analysis request', requestId),
  onInterruptCurrent: () => engine?.postMessage('stop'),
  isInterruptible: () => engine !== null && isAnalyzing,
});

/**
 * Detects WebAssembly support, mirroring stockfish.js's own recommended
 * feature-detection so we fall back to the pure-JS build when WASM isn't
 * available (see https://github.com/niklasf/stockfish.js#usage).
 */
function supportsWasm(): boolean {
  try {
    return (
      typeof WebAssembly === 'object' &&
      WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00))
    );
  } catch {
    return false;
  }
}

/**
 * Initialize Stockfish engine
 * Must be called before analysis can begin
 *
 * stockfish.js ships as a standalone worker script rather than an
 * importable factory function - per its own docs, it's meant to be spawned
 * as its own nested Worker and driven with raw UCI protocol strings over
 * postMessage/onmessage. The scripts are copied into public/ (see
 * package.json) so they're reachable by absolute URL from this worker.
 */
async function initializeEngine(_depth: number): Promise<void> {
  try {
    const scriptUrl = supportsWasm() ? '/stockfish.wasm.js' : '/stockfish.js';
    const stockfishWorker = new Worker(scriptUrl);

    // Wait for the engine to confirm it's actually up before declaring
    // initialization complete, rather than assuming postMessage calls made
    // immediately after `new Worker()` will be queued correctly.
    await new Promise<void>((resolve, reject) => {
      const handleMessage = (event: MessageEvent) => {
        if (typeof event.data === 'string' && event.data.includes('uciok')) {
          stockfishWorker.removeEventListener('message', handleMessage);
          resolve();
        }
      };

      const handleError = (event: ErrorEvent) => {
        stockfishWorker.removeEventListener('message', handleMessage);
        reject(new Error(`Failed to load Stockfish worker: ${event.message}`));
      };

      stockfishWorker.addEventListener('message', handleMessage);
      stockfishWorker.addEventListener('error', handleError, { once: true });
      stockfishWorker.postMessage('uci');
    });

    engine = stockfishWorker;
    engine.postMessage('ucinewgame');
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    sendError('ENGINE_INIT_FAILED', 'Failed to initialize Stockfish engine: ' + err.message);
    throw err;
  }
}

/**
 * Parsed UCI "info" line data
 */
interface ParsedInfoLine {
  readonly depth: number;
  readonly evaluation: number;
  readonly isMate: boolean;
  readonly mateIn?: number;
  readonly pv: string[];
}

/**
 * Parses UCI "info" line to extract evaluation and principal variation
 * Format: info depth 20 score cp -25 pv e2e4 c7c5 ...
 *
 * @param infoLine - UCI info line from engine
 * @returns Parsed data or null if parsing fails
 */
function parseInfoLine(infoLine: string): ParsedInfoLine | null {
  const depthMatch = infoLine.match(/depth (\d+)/);
  const scoreMatch = infoLine.match(/score (cp|mate) (-?\d+)/);
  const pvMatch = infoLine.match(/pv (.+?)(?:\s+(?:depth|nodes|time|nps|ponder|multipv)|$)/);

  if (!depthMatch || !scoreMatch) {
    return null;
  }

  const depth = parseInt(depthMatch[1], 10);
  const scoreType = scoreMatch[1];
  const scoreValue = parseInt(scoreMatch[2], 10);

  const isMate = scoreType === 'mate';
  const evaluation = isMate ? 0 : scoreValue;
  const mateIn = isMate ? Math.abs(scoreValue) : undefined;
  const pv = pvMatch ? pvMatch[1].trim().split(/\s+/) : [];

  return { depth, evaluation, isMate, mateIn, pv };
}

/**
 * Extracts the move from a UCI "bestmove e2e4 ponder e7e5" line
 *
 * @param line - UCI bestmove line
 * @returns Best move in UCI notation, or null if the line doesn't match
 */
function extractBestMove(line: string): string | null {
  const match = line.match(/bestmove (\S+)/);
  return match ? match[1] : null;
}

/**
 * Combines a bestmove and the last parsed info line into the analysis
 * result sent back to the main thread
 *
 * @param bestMove - Best move in UCI notation
 * @param info - Most recent parsed "info" line
 * @returns Engine analysis result
 */
function buildAnalysisResult(bestMove: string, info: ParsedInfoLine): EngineAnalysis {
  return {
    bestMove,
    evaluation: info.evaluation,
    depth: info.depth,
    principalVariation: info.pv.slice(0, 5),
    isMate: info.isMate,
    mateIn: info.mateIn,
  };
}

/**
 * Builds the final analysis result from a UCI "bestmove" line, given the
 * last "info" line seen before it
 *
 * @param line - UCI bestmove line
 * @param lastInfo - Most recent parsed "info" line, or null if none arrived
 * @returns Engine analysis result
 * @throws Error if the bestmove or evaluation couldn't be extracted
 */
function resolveBestmoveLine(line: string, lastInfo: ParsedInfoLine | null): EngineAnalysis {
  const bestMove = extractBestMove(line);
  if (!bestMove || !lastInfo) {
    throw new Error('Failed to extract best move or evaluation from engine output');
  }
  return buildAnalysisResult(bestMove, lastInfo);
}

/**
 * Analyzes a position using Stockfish engine
 * Uses UCI protocol to communicate with engine
 *
 * @param fen - Position in FEN notation
 * @param timeLimit - Time limit in milliseconds
 * @param requestId - Request ID for correlation with responses
 * @returns Engine analysis result
 */
async function analyzePosition(
  fen: string,
  timeLimit: number,
  requestId: number,
): Promise<EngineAnalysis> {
  const stockfish = engine;
  if (!stockfish) {
    throw new Error('Engine not initialized');
  }

  isAnalyzing = true;
  currentRequestId = requestId;
  let lastInfo: ParsedInfoLine | null = null;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (isAnalyzing) {
        stockfish.postMessage('stop');
      }
    }, timeLimit);

    const messageHandler = (event: MessageEvent<string>) => {
      const line = event?.data || '';

      if (line.includes('info ')) {
        lastInfo = parseInfoLine(line) ?? lastInfo;
      }

      if (line.includes('bestmove ')) {
        clearTimeout(timeout);
        stockfish.removeEventListener('message', messageHandler);
        isAnalyzing = false;

        try {
          resolve(resolveBestmoveLine(line, lastInfo));
        } catch (error: unknown) {
          reject(error);
        }
      }
    };

    stockfish.addEventListener('message', messageHandler);
    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage(`go movetime ${timeLimit}`);
  });
}

/**
 * Sends an error response to the main thread
 *
 * @param code - Error code
 * @param message - Error message
 * @param requestId - Request ID for correlation
 */
function sendError(code: string, message: string, requestId?: number): void {
  const response: WorkerErrorResponse = {
    type: 'ERROR',
    error: { code, message },
    requestId: requestId ?? currentRequestId ?? undefined,
  };
  self.postMessage(response);
}

/**
 * Sends analysis result to the main thread
 *
 * @param analysis - Engine analysis result
 * @param requestId - Request ID for correlation
 */
function sendAnalysis(analysis: EngineAnalysis, requestId: number): void {
  const response: WorkerAnalysisResponse = {
    type: 'ANALYSIS_COMPLETE',
    analysis,
    requestId,
  };
  self.postMessage(response);
}

/**
 * Confirms engine initialization succeeded to the main thread.
 * Without this, sendWorkerMessage()'s INIT request never resolves and
 * always hits its timeout, regardless of whether initializeEngine()
 * actually succeeded.
 *
 * @param requestId - Request ID for correlation
 */
function sendInitComplete(requestId: number): void {
  const response: WorkerInitResponse = {
    type: 'INIT_COMPLETE',
    requestId,
  };
  self.postMessage(response);
}

/**
 * Main worker message handler
 * Processes commands from the main thread
 */
self.onmessage = async (event: MessageEvent<WorkerInputMessage>) => {
  const message = event.data;
  const requestId = message.requestId ?? 0;

  try {
    if (message.type === 'INIT') {
      await initializeEngine(message.depth);
      sendInitComplete(requestId);
    } else if (message.type === 'ANALYZE') {
      analysisRequestQueue.enqueue({
        priority: message.priority ?? 'interactive',
        requestId,
        run: async () => {
          try {
            const analysis = await analyzePosition(message.fen, message.timeLimit, requestId);
            sendAnalysis(analysis, requestId);
          } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            sendError('ANALYSIS_ERROR', 'Engine analysis failed: ' + err.message, requestId);
          }
        },
      });
    } else if (message.type === 'STOP') {
      if (engine && isAnalyzing) {
        engine.postMessage('stop');
        isAnalyzing = false;
      }
    } else if (message.type === 'PROMOTE') {
      analysisRequestQueue.promote(message.targetRequestId);
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    sendError('ANALYSIS_ERROR', 'Engine analysis failed: ' + err.message, requestId);
  }
};
