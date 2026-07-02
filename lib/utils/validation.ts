/**
 * Input validation utilities using Zod
 * Validates user input at system boundaries
 */

import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { createAppError, wrapError } from '@/lib/utils/errorHandler';
import { AppError } from '@/lib/types/errors';

/**
 * Validates an input value against a Zod schema
 * Returns either validated data or AppError
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param fieldName - Optional field name for error context
 * @returns Tuple of [data, error] where error is null on success
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fieldName: string = 'input',
): [T | null, AppError | null] {
  try {
    const validated = schema.parse(data);
    return [validated, null];
  } catch (error) {
    // Build context without sensitive data
    const context: Record<string, unknown> = { fieldName };
    // Only include receivedData for non-sensitive fields
    if (fieldName !== 'API key' && fieldName !== 'apiKey') {
      context.receivedData = String(data);
    }

    const validationError = wrapError(error, context);

    logger.warn('Input validation failed', {
      field: fieldName,
      error: validationError.message,
    });

    return [
      null,
      createAppError(
        'VALIDATION_ERROR',
        validationError.message,
        `Invalid ${fieldName}. Please check your input and try again.`,
        { fieldName },
      ),
    ];
  }
}

/**
 * Validates an input value and throws on error
 * Use when you want to fail fast
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param fieldName - Optional field name for error context
 * @returns Validated data
 * @throws AppError if validation fails
 */
export function validateInputOrThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fieldName: string = 'input',
): T {
  const [validated, error] = validateInput(schema, data, fieldName);

  if (error) {
    throw error;
  }

  return validated as T;
}

/**
 * Validators for common input types
 */
export const validators = {
  /**
   * Non-empty string
   */
  nonEmptyString: z.string().trim().min(1, 'Value cannot be empty'),

  /**
   * Valid email address
   */
  email: z.string().email('Invalid email address'),

  /**
   * Valid URL
   */
  url: z.string().url('Invalid URL'),

  /**
   * Non-negative integer
   */
  positiveInt: z.number().int().nonnegative('Value must be a positive integer'),

  /**
   * Percentage value (0-100)
   */
  percentage: z.number().int().min(0).max(100, 'Value must be between 0 and 100'),

  /**
   * Claude API key (starts with sk- and is reasonable length)
   */
  claudeApiKey: z
    .string()
    .regex(/^sk-/, 'API key must start with sk-')
    .min(20, 'API key appears too short')
    .max(500, 'API key appears too long'),

  /**
   * Gemini (Google) API key - format varies (commonly starts with "AIza"),
   * so only length is enforced rather than a strict prefix
   */
  geminiApiKey: z
    .string()
    .min(20, 'API key appears too short')
    .max(500, 'API key appears too long'),

  /**
   * Skill level enum
   */
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),

  /**
   * Theme selection
   */
  theme: z.enum(['light', 'dark']),

  /**
   * Language code
   */
  language: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code')
    .default('en'),

  /**
   * Chess FEN position
   */
  chessFen: z.string().regex(
    /^[pnbrqkPNBRQK1-8]+\/[pnbrqkPNBRQK1-8]+\/[pnbrqkPNBRQK1-8]+\/[pnbrqkPNBRQK1-8]+\/[pnbrqkPNBRQK1-8]+\/[pnbrqkPNBRQK1-8]+\/[pnbrqkPNBRQK1-8]+\/[pnbrqkPNBRQK1-8]+ [wb] (-|K?Q?k?q?) (-|[a-h][36]) \d+ \d+$/,
    'Invalid FEN position',
  ),

  /**
   * Chess move in algebraic notation (e.g., "e2e4")
   */
  chessMove: z.string().regex(/^[a-h][1-8][a-h][1-8]([qrbn])?$/, 'Invalid chess move'),
};

/**
 * Validates a chess move
 *
 * @param move - Move string to validate
 * @returns Validated move or error
 */
export function validateChessMove(move: string): [string | null, AppError | null] {
  return validateInput(validators.chessMove, move, 'chess move');
}

/**
 * Validates an AI provider API key
 * Never logs the actual key
 *
 * @param key - API key to validate
 * @param provider - Which provider's key format to validate against (default: 'claude')
 * @returns Validated key or error
 */
export function validateApiKey(
  key: string,
  provider: 'claude' | 'gemini' = 'claude',
): [string | null, AppError | null] {
  const validator = provider === 'gemini' ? validators.geminiApiKey : validators.claudeApiKey;
  return validateInput(validator, key, 'API key');
}

/**
 * Validates a FEN position string
 *
 * @param fen - FEN string to validate
 * @returns Validated FEN or error
 */
export function validateFen(fen: string): [string | null, AppError | null] {
  return validateInput(validators.chessFen, fen, 'FEN position');
}
