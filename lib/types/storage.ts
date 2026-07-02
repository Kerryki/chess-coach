/**
 * AI provider used to generate coaching explanations
 */
export type AIProvider = 'claude' | 'gemini';

/**
 * Application settings and configuration stored persistently
 */
export interface AppSettings {
  /** Which AI provider to use for coaching explanations */
  readonly provider: AIProvider;

  /** Claude (Anthropic) API key for AI coach */
  readonly claudeApiKey: string;

  /** Gemini (Google) API key for AI coach */
  readonly geminiApiKey: string;

  /** User's skill level for personalized coaching */
  readonly skillLevel: 'beginner' | 'intermediate' | 'advanced';

  /** UI theme preference */
  readonly theme: 'light' | 'dark';

  /** Whether to show annotations automatically */
  readonly autoAnnotate: boolean;

  /** Preferred language for explanations */
  readonly language: string;

  /** Volume level for notifications (0-100) */
  readonly notificationVolume: number;

  /** Timestamp of last settings update */
  readonly updatedAt: number;
}

/**
 * Complete storage schema with all persisted data
 */
export interface StorageSchema {
  readonly settings: AppSettings;
}
