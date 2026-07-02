/**
 * Provider-agnostic AI text generation for chess coaching explanations
 * Supports Claude (Anthropic) and Gemini (Google) as interchangeable backends
 */

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI, ApiError as GeminiApiError } from '@google/genai';
import { AIProvider } from '@/lib/types/storage';
import { AppError } from '@/lib/types/errors';
import { createAppError } from '@/lib/utils/errorHandler';

const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';
const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Parameters shared by both one-shot and streaming generation
 */
interface GenerateParams {
  readonly apiKey: string;
  readonly systemPrompt: string;
  readonly prompt: string;
  readonly maxTokens: number;
}

/**
 * Generates a complete (non-streaming) text response from the given provider
 *
 * @throws AppError if the request fails or the API key is invalid
 */
export async function generateText(
  provider: AIProvider,
  params: GenerateParams,
): Promise<string> {
  return provider === 'gemini'
    ? generateTextWithGemini(params)
    : generateTextWithClaude(params);
}

async function generateTextWithClaude({
  apiKey,
  systemPrompt,
  prompt,
  maxTokens,
}: GenerateParams): Promise<string> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  try {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw createAppError(
        'INVALID_API_RESPONSE',
        'Claude API returned unexpected response format',
        'Failed to generate explanation. Please try again.',
        { responseContent: response.content },
      );
    }

    return textContent.text;
  } catch (error) {
    throw mapClaudeError(error);
  }
}

async function generateTextWithGemini({
  apiKey,
  systemPrompt,
  prompt,
  maxTokens,
}: GenerateParams): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: maxTokens,
      },
    });

    if (!response.text) {
      throw createAppError(
        'INVALID_API_RESPONSE',
        'Gemini API returned an empty response',
        'Failed to generate explanation. Please try again.',
        {},
      );
    }

    return response.text;
  } catch (error) {
    throw mapGeminiError(error);
  }
}

/**
 * Parameters for streaming generation
 */
interface StreamParams extends GenerateParams {
  readonly signal: AbortSignal;
  /** Called with the full accumulated text each time a new chunk arrives */
  readonly onChunk: (accumulatedText: string) => void;
}

/**
 * Streams a text response chunk-by-chunk from the given provider
 * Resolves with the full accumulated text once the stream completes
 *
 * @throws AppError if the request fails or the API key is invalid
 * @throws DOMException with name 'AbortError' if the signal is aborted (left
 *   unwrapped so callers can distinguish user-initiated cancellation from
 *   real failures)
 */
export async function streamText(
  provider: AIProvider,
  params: StreamParams,
): Promise<string> {
  return provider === 'gemini'
    ? streamTextWithGemini(params)
    : streamTextWithClaude(params);
}

async function streamTextWithClaude({
  apiKey,
  systemPrompt,
  prompt,
  maxTokens,
  signal,
  onChunk,
}: StreamParams): Promise<string> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  let fullText = '';

  try {
    const stream = await client.messages.create(
      {
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal },
    );

    for await (const event of stream) {
      if (signal.aborted) {
        break;
      }

      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta' &&
        event.delta.text
      ) {
        fullText += event.delta.text;
        onChunk(fullText);
      }
    }

    return fullText;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw mapClaudeError(error);
  }
}

async function streamTextWithGemini({
  apiKey,
  systemPrompt,
  prompt,
  maxTokens,
  signal,
  onChunk,
}: StreamParams): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  let fullText = '';

  try {
    const stream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: maxTokens,
        abortSignal: signal,
      },
    });

    for await (const chunk of stream) {
      if (signal.aborted) {
        break;
      }

      if (chunk.text) {
        fullText += chunk.text;
        onChunk(fullText);
      }
    }

    return fullText;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw mapGeminiError(error);
  }
}

/**
 * Type guard for values that are already an AppError (e.g. re-thrown as-is)
 */
function isAppError(error: unknown): error is AppError {
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    'userMessage' in error
  );
}

function mapClaudeError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Anthropic.APIError) {
    if (error.status === 401) {
      return createAppError(
        'INVALID_API_KEY',
        'Invalid or expired Anthropic API key',
        'Your API key is invalid. Please check your settings.',
        {},
        error,
      );
    }

    if (error.status === 429) {
      return createAppError(
        'RATE_LIMIT',
        'Claude API rate limit exceeded',
        'Too many requests. Please wait a moment and try again.',
        { retryAfter: error.headers?.['retry-after'] },
        error,
      );
    }

    return createAppError(
      'API_ERROR',
      `Claude API error: ${error.message}`,
      'Failed to generate explanation. Please try again.',
      { status: error.status },
      error,
    );
  }

  return createAppError(
    'API_ERROR',
    error instanceof Error ? error.message : String(error),
    'Failed to generate explanation. Please try again.',
    {},
    error,
  );
}

function mapGeminiError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof GeminiApiError) {
    // Google's Generative Language API reports invalid/missing keys as 400
    // or 403 rather than a dedicated 401, depending on the failure mode.
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      return createAppError(
        'INVALID_API_KEY',
        'Invalid or expired Gemini API key',
        'Your API key is invalid. Please check your settings.',
        { status: error.status },
        error,
      );
    }

    if (error.status === 429) {
      return createAppError(
        'RATE_LIMIT',
        'Gemini API rate limit exceeded',
        'Too many requests. Please wait a moment and try again.',
        {},
        error,
      );
    }

    return createAppError(
      'API_ERROR',
      `Gemini API error: ${error.message}`,
      'Failed to generate explanation. Please try again.',
      { status: error.status },
      error,
    );
  }

  return createAppError(
    'API_ERROR',
    error instanceof Error ? error.message : String(error),
    'Failed to generate explanation. Please try again.',
    {},
    error,
  );
}
