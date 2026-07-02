/**
 * Main Stockfish engine analyzer
 * Provides high-level interface for position analysis with caching and timeout handling
 */

import {
  AnalysisPriority,
  EngineAnalysis,
  WorkerInputMessage,
  WorkerOutputMessage,
} from '@/lib/chess/engine/types';
import { AnalysisCache } from '@/lib/chess/engine/cache';
import { createAppError } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';

/**
 * Default engine configuration
 */
const DEFAULT_DEPTH = 20;
const DEFAULT_TIME_LIMIT = 2000;

/**
 * An analysis request in flight for a given FEN. `priority` is mutable: a
 * later caller requesting the same FEN at 'interactive' priority upgrades
 * an in-progress 'background' request in place (see promoteIfNeeded)
 * rather than starting a second, duplicate search for the same position.
 */
interface InFlightAnalysis {
  readonly promise: Promise<EngineAnalysis>;
  readonly requestId: number;
  priority: AnalysisPriority;
}

/**
 * Main analyzer class for Stockfish engine interaction
 * Uses a web worker to prevent UI blocking
 * Implements LRU caching to avoid re-analyzing positions
 */
export class EngineAnalyzer {
  private worker: Worker | null = null;
  private cache: AnalysisCache;
  private isInitialized: boolean = false;
  private analysisQueue: Map<string, InFlightAnalysis> = new Map();
  private messageId: number = 0;

  /**
   * Private constructor - use static create() factory method
   */
  private constructor() {
    this.cache = new AnalysisCache(100);
  }

  /**
   * Factory method to create and initialize analyzer
   * Must be awaited before use
   *
   * @returns Initialized EngineAnalyzer instance
   * @throws AppError if worker initialization fails
   */
  static async create(): Promise<EngineAnalyzer> {
    const analyzer = new EngineAnalyzer();
    await analyzer.initialize();
    return analyzer;
  }

  /**
   * Initialize the web worker and engine
   *
   * @throws AppError on initialization failure
   */
  private async initialize(): Promise<void> {
    try {
      logger.info('Initializing Stockfish engine');

      // Create worker from the stockfish.worker.ts file
      // Next.js handles .worker.ts files natively
      this.worker = new Worker(
        new URL('@/lib/chess/engine/stockfish.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Initialize engine with default depth
      await this.sendWorkerMessage(
        { type: 'INIT', depth: DEFAULT_DEPTH },
        this.nextRequestId(),
      );

      this.isInitialized = true;
      logger.info('Stockfish engine initialized successfully');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Engine initialization failed', err);

      // Terminate worker if it exists
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }

      throw createAppError(
        'ENGINE_INIT_FAILED',
        'Failed to initialize Stockfish engine: ' + err.message,
        'Chess engine is unavailable. Analysis features will be disabled.',
        { originalError: err.message },
        error,
      );
    }
  }

  /**
   * Generates the next unique request ID for correlating worker messages
   * with their responses
   */
  private nextRequestId(): number {
    return ++this.messageId;
  }

  /**
   * Send message to worker and wait for response
   * Implements promise-based communication with request ID correlation
   *
   * @param message - Message to send to worker
   * @param requestId - Request ID to correlate with the worker's response
   * @returns Promise resolving to worker response
   */
  private sendWorkerMessage(
    message: WorkerInputMessage,
    requestId: number,
  ): Promise<WorkerOutputMessage> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        this.worker?.removeEventListener('message', handler);
        reject(new Error('Worker message timeout'));
      }, 10000);

      const handler = (event: MessageEvent<WorkerOutputMessage>) => {
        // Only handle messages for this request ID
        if (event.data.requestId !== requestId) {
          return;
        }

        clearTimeout(timeout);
        this.worker?.removeEventListener('message', handler);
        resolve(event.data);
      };

      this.worker.addEventListener('message', handler);
      this.worker.postMessage({ ...message, requestId });
    });
  }

  /**
   * Analyzes a position and returns engine evaluation
   * Uses cache to avoid re-analyzing same position
   * Enforces timeout to prevent long analysis
   *
   * @param fen - Position in FEN notation
   * @param timeLimit - Time limit in milliseconds (default: 2000)
   * @param priority - 'interactive' (default) preempts any in-flight
   *   'background' request in the worker's queue, so the position the user
   *   is actively viewing is never stuck waiting behind a bulk sweep.
   * @returns Engine analysis result
   * @throws AppError on analysis failure
   */
  async analyzePosition(
    fen: string,
    timeLimit: number = DEFAULT_TIME_LIMIT,
    priority: AnalysisPriority = 'interactive',
  ): Promise<EngineAnalysis> {
    // Validate FEN format (basic check)
    if (!fen || typeof fen !== 'string' || fen.trim().length === 0) {
      throw createAppError(
        'INVALID_FEN',
        'Invalid FEN string provided',
        'The position could not be analyzed due to invalid format.',
        { fen },
      );
    }

    // Check cache first
    const cached = this.cache.get(fen);
    if (cached) {
      logger.debug('Using cached analysis', { fen });
      return cached;
    }

    // Check if analysis is already in progress for this exact position. If
    // a caller wants 'interactive' priority but the in-flight request was
    // started as 'background', promote that request in place rather than
    // either silently inheriting its lower priority (it would then never
    // reach the worker's priority queue) or starting a second, duplicate
    // search for the same FEN (wastes engine time and, worse, can trigger
    // an extra interrupt/unwind round-trip that eats into both requests'
    // timeout budgets).
    const inFlight = this.analysisQueue.get(fen);
    if (inFlight) {
      this.promoteIfNeeded(inFlight, priority);
      logger.debug('Awaiting in-progress analysis', { fen, priority });
      return inFlight.promise;
    }

    // Create analysis promise and add to queue
    const requestId = this.nextRequestId();
    const analysisPromise = this.performAnalysis(fen, timeLimit, priority, requestId);
    this.analysisQueue.set(fen, { promise: analysisPromise, requestId, priority });

    try {
      const result = await analysisPromise;
      return result;
    } finally {
      this.analysisQueue.delete(fen);
    }
  }

  /**
   * Upgrades an in-flight 'background' analysis to 'interactive' priority
   * in place when a new caller wants the same FEN
   *
   * @param inFlight - The in-flight analysis record to potentially promote
   * @param requestedPriority - Priority of the new, joining request
   */
  private promoteIfNeeded(inFlight: InFlightAnalysis, requestedPriority: AnalysisPriority): void {
    if (requestedPriority !== 'interactive' || inFlight.priority !== 'background') {
      return;
    }

    inFlight.priority = 'interactive';
    this.worker?.postMessage({ type: 'PROMOTE', targetRequestId: inFlight.requestId });
  }

  /**
   * Performs actual analysis, wrapped for promise queue management
   *
   * @param fen - Position in FEN notation
   * @param timeLimit - Time limit in milliseconds
   * @param priority - Forwarded to the worker's request queue
   * @param requestId - Pre-generated request ID, so the caller can track
   *   this specific in-flight request (e.g. to promote it later)
   * @returns Engine analysis result
   * @throws AppError on analysis failure
   */
  private async performAnalysis(
    fen: string,
    timeLimit: number,
    priority: AnalysisPriority,
    requestId: number,
  ): Promise<EngineAnalysis> {
    if (!this.isInitialized || !this.worker) {
      throw createAppError(
        'ENGINE_NOT_INITIALIZED',
        'Engine not initialized',
        'Analysis is not available at this time.',
      );
    }

    try {
      // Create timeout abort. The extra 1000ms (beyond the requested
      // timeLimit) covers the worker's own internal stop/bestmove
      // round-trip, plus - for a request that has to interrupt an
      // in-flight lower-priority search (see stockfish.worker.ts's request
      // queue) - the time for that interrupted search to actually unwind
      // before this one can start. That handoff is normally fast, but can
      // take a few hundred ms on the very first interrupt while the engine
      // is still warming up.
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              `Analysis timeout after ${timeLimit}ms - returning best move found`,
            ),
          );
        }, timeLimit + 1000);
      });

      // Race between analysis and timeout
      const response = await Promise.race([
        this.sendWorkerMessage(
          { type: 'ANALYZE', fen, timeLimit, priority },
          requestId,
        ),
        timeoutPromise,
      ]);

      if (response.type === 'ERROR') {
        throw createAppError(
          response.error.code,
          response.error.message,
          'Engine analysis failed. Please try again.',
          { fen },
        );
      }

      if (response.type !== 'ANALYSIS_COMPLETE') {
        throw createAppError(
          'INVALID_RESPONSE',
          'Invalid response from engine',
          'Engine returned unexpected response format.',
          { response },
        );
      }

      // Cache result
      this.cache.set(fen, response.analysis);

      logger.debug('Analysis complete', {
        fen: fen.slice(0, 20) + '...',
        evaluation: response.analysis.evaluation,
        depth: response.analysis.depth,
      });

      return response.analysis;
    } catch (error: unknown) {
      // Re-throw already-formed AppErrors (e.g. ANALYSIS_SUPERSEDED from
      // the response.type === 'ERROR' branch above) as-is, rather than
      // flattening every error into a generic ANALYSIS_FAILED - callers
      // need the original code to tell a benign preemption apart from a
      // real failure, and re-wrapping a plain object via String(error)
      // also produces a useless "[object Object]" message.
      if (error && typeof error === 'object' && 'code' in error && 'userMessage' in error) {
        throw error;
      }

      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Engine analysis error', err);

      throw createAppError(
        'ANALYSIS_FAILED',
        'Engine analysis failed: ' + err.message,
        'Could not analyze this position. Please try again.',
        { fen, originalError: err.message },
        error,
      );
    }
  }

  /**
   * Clears the analysis cache
   * Useful when engine options change or to free memory
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Analysis cache cleared');
  }

  /**
   * Get current cache statistics
   *
   * @returns Cache size and capacity info
   */
  getCacheStats(): { size: number; capacity: number } {
    return {
      size: this.cache.size(),
      capacity: this.cache.maxSize,
    };
  }

  /**
   * Cleanup: terminate worker and free resources
   * Call this when analyzer is no longer needed
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.cache.clear();
    this.isInitialized = false;
    this.analysisQueue.clear();
    logger.info('Engine analyzer destroyed');
  }
}
