/**
 * Custom React hook for deep-dive move analysis with streaming
 * Provides on-demand Claude explanations with real-time streaming UI
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { DeepDiveContext, buildDeepDivePrompt } from '@/lib/coaching/deep-dive';
import { streamText } from '@/lib/coaching/providers';
import { AIProvider } from '@/lib/types/storage';
import { AppError } from '@/lib/types/errors';
import { logger } from '@/lib/utils/logger';
import { createAppError, wrapError, getErrorMessage } from '@/lib/utils/errorHandler';

const DEEP_DIVE_SYSTEM_PROMPT = `You are a chess coach providing on-demand analysis of specific moves.
Your job is to help the player understand the move deeply: why it was played, if it was good, and what they should learn.
Be constructive, specific, and adapt your explanation to the player's skill level.
Focus on practical understanding and actionable insights.`;

/**
 * State for deep-dive analysis
 */
interface DeepDiveState {
  /** Streaming explanation text (grows as it arrives) */
  explanation: string;

  /** Whether analysis is currently streaming */
  isLoading: boolean;

  /** Current error, if any */
  error: AppError | null;
}

/**
 * Hook for on-demand deep-dive move analysis
 * Streams Claude explanations in real-time with cancellation support
 *
 * @returns Object with analysis state and control methods
 */
export function useDeepDive() {
  const [state, setState] = useState<DeepDiveState>({
    explanation: '',
    isLoading: false,
    error: null,
  });

  // Track component mount status
  const isMountedRef = useRef(true);

  // Track active abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce timer to prevent duplicate concurrent requests
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Analyzes a move with streaming explanation
   * Updates state with text as it arrives from the configured AI provider
   *
   * @param context - Deep dive context with move and position
   * @param apiKey - API key for the selected provider
   * @param provider - Which AI provider to use (default: 'claude')
   */
  const analyzeMove = useCallback(
    async (
      context: DeepDiveContext,
      apiKey: string,
      provider: AIProvider = 'claude',
    ): Promise<AbortController> => {
      // Cancel any in-progress analysis
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Debounce: prevent duplicate requests within 500ms
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Validate API key
      if (!apiKey || apiKey.trim().length === 0) {
        const error = createAppError(
          'INVALID_API_KEY',
          `${provider === 'gemini' ? 'Gemini' : 'Anthropic'} API key is missing or empty`,
          `Please configure your ${provider === 'gemini' ? 'Gemini' : 'Anthropic'} API key in settings`,
          { context },
        );

        if (isMountedRef.current) {
          setState({
            explanation: '',
            isLoading: false,
            error,
          });
        }

        throw error;
      }

      // Create new abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      if (!isMountedRef.current) {
        return abortController;
      }

      // Reset state
      setState({
        explanation: '',
        isLoading: true,
        error: null,
      });

      try {
        logger.info('Starting deep-dive analysis', {
          provider,
          moveIndex: context.moveIndex,
          skillLevel: context.skillLevel,
        });

        const prompt = buildDeepDivePrompt(context);

        const fullExplanation = await streamText(provider, {
          apiKey,
          systemPrompt: DEEP_DIVE_SYSTEM_PROMPT,
          prompt,
          maxTokens: 500,
          signal: abortController.signal,
          onChunk: (accumulatedText) => {
            if (isMountedRef.current) {
              setState((prev) => ({
                ...prev,
                explanation: accumulatedText,
              }));
            }
          },
        });

        // Stream completed successfully
        if (isMountedRef.current && !abortController.signal.aborted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: null,
            explanation: fullExplanation,
          }));

          logger.info('Deep-dive analysis completed', {
            provider,
            moveIndex: context.moveIndex,
            explanationLength: fullExplanation.length,
          });
        }
      } catch (error: unknown) {
        // Check if error is due to abort
        if (error instanceof DOMException && error.name === 'AbortError') {
          logger.info('Deep-dive analysis aborted');
          if (isMountedRef.current) {
            setState((prev) => ({
              ...prev,
              isLoading: false,
            }));
          }
          return abortController;
        }

        // Network or other errors
        logger.error('Deep-dive analysis failed', error, { provider, moveIndex: context.moveIndex });
        const appError = wrapError(error, { moveIndex: context.moveIndex, provider });

        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: appError,
          }));
        }

        throw appError;
      } finally {
        abortControllerRef.current = null;
      }

      return abortController;
    },
    [],
  );

  /**
   * Cancels the current streaming analysis
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      logger.info('Deep-dive analysis cancelled');

      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    }
  }, []);

  /**
   * Resets the explanation state
   */
  const reset = useCallback(() => {
    cancel();
    if (isMountedRef.current) {
      setState({
        explanation: '',
        isLoading: false,
        error: null,
      });
    }
  }, [cancel]);

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
      // Cancel any in-progress requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear any pending debounce timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    // State
    explanation: state.explanation,
    isLoading: state.isLoading,
    error: state.error,
    errorMessage: state.error ? getErrorMessage(state.error) : null,

    // Methods
    analyzeMove,
    cancel,
    reset,
  };
}

export type { DeepDiveState, DeepDiveContext };
