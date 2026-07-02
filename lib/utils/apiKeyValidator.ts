/**
 * API key validation and testing utilities
 * Verifies API keys by making a minimal test call to the selected provider
 */

import { logger } from '@/lib/utils/logger';
import { validateApiKey } from '@/lib/utils/validation';
import { AppError } from '@/lib/types/errors';
import { AIProvider } from '@/lib/types/storage';
import { createAppError } from '@/lib/utils/errorHandler';
import { generateText } from '@/lib/coaching/providers';

/**
 * Tests if an API key is valid by making a minimal request to the provider's API
 * Does not make any expensive API calls - just tests authentication
 *
 * @param key - API key to test
 * @param provider - Which AI provider the key belongs to (default: 'claude')
 * @returns Promise resolving to tuple of [isValid, error]
 */
export async function testApiKey(
  key: string,
  provider: AIProvider = 'claude',
): Promise<[boolean, AppError | null]> {
  const providerLabel = provider === 'gemini' ? 'Gemini' : 'Claude';

  // First, validate the format
  const [validKey, validationError] = validateApiKey(key, provider);
  if (validationError || !validKey) {
    logger.warn('API key format validation failed', { provider });
    return [false, validationError];
  }

  try {
    // Minimal request just to confirm the key authenticates
    await generateText(provider, {
      apiKey: validKey,
      systemPrompt: '',
      prompt: 'OK',
      maxTokens: 10,
    });

    logger.info('API key test successful', { provider });
    return [true, null];
  } catch (err: unknown) {
    const error = err as AppError;

    if (error?.code === 'INVALID_API_KEY') {
      logger.warn('API key test failed: Invalid credentials', { provider });
      return [false, error];
    }

    if (error?.code === 'RATE_LIMIT') {
      logger.warn('API key test failed: Rate limited', { provider });
      return [false, error];
    }

    if (error?.code) {
      logger.warn('API key test failed', { provider, code: error.code });
      return [false, error];
    }

    // Network or unexpected errors
    const message = err instanceof Error ? err.message : 'Unknown error';
    const fallbackError = createAppError(
      'API_TEST_FAILED',
      `Failed to test API key: ${message}`,
      `Could not verify your ${providerLabel} API key. Please try again.`,
    );
    logger.error('API key test failed with exception', err, { provider });
    return [false, fallbackError];
  }
}

/**
 * Masks an API key for display (shows only last 4 characters)
 *
 * @param key - Full API key
 * @returns Masked key string like "sk-...XXXX"
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 4) {
    return '••••••••••••••••';
  }

  const prefix = key.substring(0, 5);
  const suffix = key.substring(key.length - 4);
  const dots = '•'.repeat(Math.max(3, key.length - 9));

  return `${prefix}${dots}${suffix}`;
}

/**
 * Checks if a string looks like it might be an API key
 * Used for detecting if user has entered something meaningful.
 * Deliberately lenient on format since Claude keys ("sk-...") and Gemini
 * keys (commonly "AIza...") don't share a common prefix.
 *
 * @param str - String to check
 * @returns True if string looks like it could be an API key
 */
export function looksLikeApiKey(str: string): boolean {
  if (!str) return false;
  return str.trim().length > 10;
}
