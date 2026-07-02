/**
 * Custom React hook for chess coaching
 * Manages moment detection and Claude explanation generation with rate limiting
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { GameState } from '@/lib/types/chess';
import { EngineAnalysis } from '@/lib/chess/engine/types';
import { AppError } from '@/lib/types/errors';
import {
  CriticalMoment,
  CoachingExplanation,
  CoachingContext,
  CoachingConfig,
  DEFAULT_COACHING_CONFIG,
} from '@/lib/coaching/types';
import { detectCriticalMoments } from '@/lib/coaching/moment-detector';
import { generateExplanation } from '@/lib/coaching/explanation-client';
import { AIProvider } from '@/lib/types/storage';
import { logger } from '@/lib/utils/logger';
import { getErrorMessage, wrapError } from '@/lib/utils/errorHandler';

/**
 * State for the coaching hook
 */
interface CoachingState {
  /** Detected critical moments */
  moments: ReadonlyArray<CriticalMoment>;

  /** Explanations for each moment, keyed by moveIndex */
  explanations: ReadonlyMap<number, CoachingExplanation>;

  /** Whether explanations are currently being generated */
  isLoading: boolean;

  /** Current error, if any */
  error: AppError | null;
}

/**
 * Cache entry for explanations
 */
interface CacheEntry {
  readonly gameId: string;
  readonly moments: ReadonlyArray<CriticalMoment>;
  readonly explanations: Map<number, CoachingExplanation>;
}

/**
 * Parameters for generateCoaching
 */
interface GenerateCoachingParams {
  /** Game state (moves) */
  readonly game: GameState;
  /** Engine analysis for each position, aligned by move index */
  readonly analyses: ReadonlyArray<EngineAnalysis | null>;
  /** FEN of the position after each move, aligned by move index */
  readonly fens: ReadonlyArray<string>;
  /** API key for the selected provider */
  readonly apiKey: string;
  /** Player skill level (default: 'intermediate') */
  readonly skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  /** Unique game identifier for caching (default: 'default') */
  readonly gameId?: string;
  /** Coaching configuration (default: DEFAULT_COACHING_CONFIG) */
  readonly config?: CoachingConfig;
  /** Which AI provider to use (default: 'claude') */
  readonly provider?: AIProvider;
  /** Game metadata (player names, event, etc.) included in the prompt */
  readonly gameMetadata?: {
    readonly white?: string;
    readonly black?: string;
    readonly event?: string;
    readonly timeControl?: string;
  };
}

/**
 * Hook for managing chess coaching
 * Detects critical moments and generates Claude explanations with rate limiting
 *
 * @returns Object with coaching state and methods
 */
export function useCoaching() {
  // State
  const [state, setState] = useState<CoachingState>({
    moments: [],
    explanations: new Map(),
    isLoading: false,
    error: null,
  });

  // Cache for explanations (session-only)
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  // Track mount status
  const isMountedRef = useRef(true);

  // Track last API call time for rate limiting (1 req/sec)
  const lastApiCallRef = useRef(0);

  // Track active generation to prevent multiple simultaneous calls
  const isGeneratingRef = useRef(false);

  /**
   * Detects critical moments in a game
   *
   * @param game - Game state
   * @param analyses - Engine analyses for each position
   * @param skillLevel - Player skill level
   * @param config - Coaching configuration
   * @returns Array of critical moments
   */
  const detectMoments = useCallback(
    (
      game: GameState,
      analyses: ReadonlyArray<EngineAnalysis | null>,
      skillLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
      config: CoachingConfig = DEFAULT_COACHING_CONFIG,
    ): ReadonlyArray<CriticalMoment> => {
      try {
        logger.info('Detecting critical moments', {
          moveCount: game.moves.length,
          analysisCount: analyses.length,
          skillLevel,
        });

        const moments = detectCriticalMoments(game, analyses, skillLevel, config);

        logger.info('Moments detected', {
          count: moments.length,
          reasons: moments.map((m) => m.reason).join(', '),
        });

        return moments;
      } catch (error: unknown) {
        logger.error('Failed to detect moments', error);
        return [];
      }
    },
    [],
  );

  /**
   * Generates explanations for critical moments using the configured AI provider
   * Implements 1 req/sec rate limiting
   */
  const generateCoaching = useCallback(
    async ({
      game,
      analyses,
      fens,
      apiKey,
      skillLevel = 'intermediate',
      gameId = 'default',
      config = DEFAULT_COACHING_CONFIG,
      provider = 'claude',
      gameMetadata,
    }: GenerateCoachingParams) => {
      // Prevent multiple simultaneous generation attempts
      if (isGeneratingRef.current) {
        logger.warn('Generation already in progress');
        return;
      }

      if (!isMountedRef.current) {
        return;
      }

      // Check cache first
      const cached = cacheRef.current.get(gameId);
      if (cached) {
        logger.info('Using cached coaching data', { gameId });
        if (isMountedRef.current) {
          setState({
            moments: cached.moments,
            explanations: new Map(cached.explanations),
            isLoading: false,
            error: null,
          });
        }
        return;
      }

      isGeneratingRef.current = true;

      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: true,
          error: null,
        }));
      }

      try {
        // Detect moments first
        const detectedMoments = detectMoments(game, analyses, skillLevel, config);

        if (!isMountedRef.current) {
          return;
        }

        if (detectedMoments.length === 0) {
          logger.info('No critical moments detected');
          setState({
            moments: [],
            explanations: new Map(),
            isLoading: false,
            error: null,
          });
          return;
        }

        // Generate explanations for each moment with rate limiting
        const explanations = new Map<number, CoachingExplanation>();
        const errors: AppError[] = [];

        for (const moment of detectedMoments) {
          if (!isMountedRef.current) {
            break;
          }

          // Rate limiting: ensure 1 second between API calls
          const timeSinceLastCall = Date.now() - lastApiCallRef.current;
          if (timeSinceLastCall < 1000) {
            const waitTime = 1000 - timeSinceLastCall;
            logger.debug('Rate limiting: waiting before next API call', { waitTime });
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }

          try {
            // Build context for this moment
            const context: CoachingContext = {
              fen: fens[moment.moveIndex] || '',
              movePlayed: moment.playedMove || '',
              bestMove: moment.bestMove || '',
              evaluationBefore: moment.previousEvaluation,
              evaluationAfter: moment.evaluation,
              momentType: moment.reason,
              moveNumber: moment.moveIndex + 1,
              gameMetadata,
            };

            // Call Claude API
            logger.info('Generating explanation for moment', {
              moveIndex: moment.moveIndex,
              reason: moment.reason,
            });

            const explanation = await generateExplanation(moment, context, apiKey, skillLevel, provider);

            lastApiCallRef.current = Date.now();

            if (isMountedRef.current) {
              explanations.set(moment.moveIndex, explanation);
            }

            logger.info('Explanation generated', {
              moveIndex: moment.moveIndex,
              length: explanation.explanation.length,
            });
          } catch (error: unknown) {
            logger.error('Failed to generate explanation for moment', error, {
              moveIndex: moment.moveIndex,
            });

            // Track error and continue with next moment
            errors.push(wrapError(error));
          }
        }

        // Update state with explanations and aggregate errors
        if (isMountedRef.current) {
          const cacheEntry: CacheEntry = {
            gameId,
            moments: detectedMoments,
            explanations,
          };

          // Implement cache size bound to prevent unbounded growth
          const MAX_CACHE_SIZE = 10;
          if (cacheRef.current.size >= MAX_CACHE_SIZE) {
            // Remove the first (oldest) cache entry
            const firstKey = cacheRef.current.keys().next().value;
            if (firstKey) {
              cacheRef.current.delete(firstKey);
            }
          }

          cacheRef.current.set(gameId, cacheEntry);

          // Create aggregate error if any explanations failed
          const aggregateError =
            errors.length > 0
              ? {
                  ...errors[0],
                  message: `Failed to generate ${errors.length} explanation${errors.length !== 1 ? 's' : ''}`,
                  userMessage: `Some explanations could not be generated. ${errors.length} moment${errors.length !== 1 ? 's' : ''} failed.`,
                  context: {
                    ...errors[0].context,
                    failureCount: errors.length,
                  },
                }
              : null;

          setState({
            moments: detectedMoments,
            explanations,
            isLoading: false,
            error: aggregateError,
          });

          logger.info('Coaching generation complete', {
            momentCount: detectedMoments.length,
            explanationCount: explanations.size,
            failureCount: errors.length,
          });
        }
      } catch (error: unknown) {
        logger.error('Coaching generation failed', error);

        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: wrapError(error),
          }));
        }
      } finally {
        isGeneratingRef.current = false;
      }
    },
    [detectMoments],
  );

  /**
   * Clears the explanation cache
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    logger.info('Coaching cache cleared');
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
    };
  }, []);

  return {
    // State
    moments: state.moments,
    explanations: state.explanations,
    isLoading: state.isLoading,
    error: state.error,
    errorMessage: state.error ? getErrorMessage(state.error) : null,

    // Methods
    generateCoaching,
    detectMoments,
    clearCache,
  };
}

export type { CoachingState };
