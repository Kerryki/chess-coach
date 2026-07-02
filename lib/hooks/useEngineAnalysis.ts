/**
 * Custom React hook for Stockfish engine analysis
 * Manages analyzer lifecycle, caching, and state
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { EngineAnalyzer } from '@/lib/chess/engine/engine';
import { AnalysisPriority, EngineAnalysis } from '@/lib/chess/engine/types';
import { AppError } from '@/lib/types/errors';
import { logger } from '@/lib/utils/logger';
import { getErrorMessage, isErrorCode, wrapError } from '@/lib/utils/errorHandler';

/**
 * State for the engine analysis hook
 */
interface EngineAnalysisState {
  /** Whether the analyzer has been initialized */
  isInitialized: boolean;

  /** Whether analysis is currently in progress */
  isAnalyzing: boolean;

  /** Current analysis result, or null if no analysis */
  analysis: EngineAnalysis | null;

  /** Current error, or null if no error */
  error: AppError | null;
}

/**
 * Hook for managing Stockfish engine analysis
 * Handles lazy initialization, caching, and cleanup
 *
 * @returns Object with state and methods
 */
export function useEngineAnalysis() {
  // State
  const [state, setState] = useState<EngineAnalysisState>({
    isInitialized: false,
    isAnalyzing: false,
    analysis: null,
    error: null,
  });

  // Analyzer instance (maintained across re-renders)
  const analyzerRef = useRef<EngineAnalyzer | null>(null);

  // In-flight initialization promise, so concurrent callers (e.g. the
  // interactive per-move effect and the bulk background sweep both firing
  // on initial game load) await the same EngineAnalyzer.create() call
  // instead of each racing to create - and orphan - their own worker.
  const initializingRef = useRef<Promise<void> | null>(null);

  // Track component mount status
  const isMountedRef = useRef(true);

  /**
   * Initialize analyzer on first use
   * Lazy initialization to avoid startup overhead
   */
  const initializeAnalyzer = useCallback(async () => {
    if (analyzerRef.current) {
      return;
    }

    if (initializingRef.current) {
      await initializingRef.current;
      return;
    }

    const initPromise = (async () => {
      try {
        logger.info('Initializing engine analyzer');

        const analyzer = await EngineAnalyzer.create();

        if (!isMountedRef.current) {
          // The component unmounted while EngineAnalyzer.create() was in
          // flight. The mount-cleanup effect already ran and found
          // analyzerRef.current still null, so nothing destroyed this -
          // without this check it would be silently orphaned with no
          // destroy() ever called on its worker.
          analyzer.destroy();
          return;
        }

        analyzerRef.current = analyzer;
        setState((prev) => ({
          ...prev,
          isInitialized: true,
          error: null,
        }));

        logger.info('Engine analyzer initialized');
      } catch (error: unknown) {
        logger.error('Failed to initialize analyzer', error);

        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            error: wrapError(error),
          }));
        }
      }
    })();

    initializingRef.current = initPromise;
    await initPromise;
    initializingRef.current = null;
  }, []);

  /**
   * Marks analysis as in-progress in visible state
   */
  const beginInteractiveAnalysis = useCallback(() => {
    if (isMountedRef.current) {
      setState((prev) => ({
        ...prev,
        isAnalyzing: true,
        error: null,
      }));
    }
  }, []);

  /**
   * Applies a successful analysis result to visible state
   */
  const applyInteractiveResult = useCallback((analysis: EngineAnalysis | null) => {
    if (isMountedRef.current) {
      setState((prev) => ({
        ...prev,
        analysis,
        isAnalyzing: false,
        error: null,
      }));
    }
  }, []);

  /**
   * Applies an analysis failure to visible state
   */
  const applyInteractiveError = useCallback((appError: AppError) => {
    if (isMountedRef.current) {
      setState((prev) => ({
        ...prev,
        error: appError,
        isAnalyzing: false,
      }));
    }
  }, []);

  /**
   * Analyze a chess position
   * Returns cached result if available
   *
   * @param fen - FEN string of position
   * @param timeLimit - Time limit in milliseconds (default: 2000)
   * @param priority - 'interactive' (default) drives the visible
   *   analysis/isAnalyzing/error state, since it's the position the user is
   *   currently viewing. 'background' calls (e.g. the bulk per-move sweep
   *   that powers coaching-moment detection) intentionally skip these state
   *   updates - otherwise the spinner and displayed evaluation would
   *   flicker through every position in the game while the sweep runs,
   *   regardless of what the user is actually looking at.
   * @returns Analysis result, or throws AppError
   */
  const analyzePosition = useCallback(
    async (
      fen: string,
      timeLimit: number = 2000,
      priority: AnalysisPriority = 'interactive',
    ): Promise<EngineAnalysis | null> => {
      // Initialize if not already done
      if (!analyzerRef.current) {
        await initializeAnalyzer();
      }

      if (!analyzerRef.current) {
        logger.error('Analyzer still not initialized after initialization attempt');
        return null;
      }

      const isInteractive = priority === 'interactive';
      if (isInteractive) {
        beginInteractiveAnalysis();
      }

      try {
        const analysis = await analyzerRef.current.analyzePosition(fen, timeLimit, priority);
        if (isInteractive) {
          applyInteractiveResult(analysis);
        }
        return analysis;
      } catch (error: unknown) {
        // A newer interactive request preempted this one before it ran -
        // not a real failure. The newer request is already in flight and
        // will update state when it resolves, so leave isAnalyzing/error
        // alone rather than flashing a spurious error.
        if (isErrorCode(error, 'ANALYSIS_SUPERSEDED')) {
          return null;
        }

        logger.error('Analysis failed', error);
        if (isInteractive) {
          applyInteractiveError(wrapError(error));
        }
        return null;
      }
    },
    [initializeAnalyzer, beginInteractiveAnalysis, applyInteractiveResult, applyInteractiveError],
  );

  /**
   * Clear the analysis cache
   * Useful to free memory or reset state
   */
  const clearCache = useCallback(() => {
    if (analyzerRef.current) {
      analyzerRef.current.clearCache();
      logger.info('Analysis cache cleared');
    }
  }, []);

  /**
   * Get cache statistics
   *
   * @returns Cache size and capacity
   */
  const getCacheStats = useCallback(() => {
    if (analyzerRef.current) {
      return analyzerRef.current.getCacheStats();
    }
    return { size: 0, capacity: 100 };
  }, []);

  /**
   * Mount/cleanup lifecycle.
   * Explicitly resets isMountedRef to true in the effect body (not just via
   * the useRef initializer) because React Strict Mode's dev-mode
   * mount->cleanup->mount double-invoke would otherwise leave it stuck at
   * false after the synthetic first cleanup, silently dropping every
   * subsequent setState call for the lifetime of the component.
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (analyzerRef.current) {
        analyzerRef.current.destroy();
        analyzerRef.current = null;
      }
    };
  }, []);

  return {
    // State
    isInitialized: state.isInitialized,
    isAnalyzing: state.isAnalyzing,
    analysis: state.analysis,
    error: state.error,
    errorMessage: state.error ? getErrorMessage(state.error) : null,

    // Methods
    analyzePosition,
    clearCache,
    getCacheStats,
  };
}

export type { EngineAnalysisState };
