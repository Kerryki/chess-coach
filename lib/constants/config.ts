/**
 * Application configuration constants
 * Centralized settings for API, timeouts, and other configuration
 */

/**
 * API configuration
 */
export const API_CONFIG = {
  // Claude API
  CLAUDE_API_BASE_URL: 'https://api.anthropic.com',
  CLAUDE_API_TIMEOUT_MS: 30000,
  CLAUDE_API_VERSION: '2024-06-06',
  CLAUDE_DEFAULT_MODEL: 'claude-3-5-sonnet-20241022',
  CLAUDE_COACHING_MODEL: 'claude-3-5-sonnet-20241022',

  // Request timeouts
  ANALYSIS_TIMEOUT_MS: 30000,
  COACHING_TIMEOUT_MS: 45000,
  NETWORK_TIMEOUT_MS: 10000,

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  RETRY_BACKOFF_MULTIPLIER: 2,
} as const;

/**
 * Storage configuration
 */
export const STORAGE_CONFIG = {
  // localStorage keys
  SETTINGS_KEY: 'chess_coach_settings',
  CACHE_KEY_PREFIX: 'chess_coach_cache_',
  GAME_HISTORY_KEY: 'chess_coach_games',

  // Storage limits
  MAX_GAMES_STORED: 100,
  MAX_CACHE_SIZE_MB: 50,
} as const;

/**
 * UI configuration
 */
export const UI_CONFIG = {
  // Animation timings (ms)
  ANIMATION_DURATION_MS: 300,
  TRANSITION_DURATION_MS: 200,

  // Toast/notification timings
  NOTIFICATION_DISPLAY_MS: 4000,
  ERROR_DISPLAY_MS: 6000,

  // Polling intervals
  AUTO_SAVE_INTERVAL_MS: 5000,
  POLLING_INTERVAL_MS: 2000,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Feature flags
 */
export const FEATURES = {
  // Enable/disable major features
  ENABLE_OFFLINE_MODE: true,
  ENABLE_AI_ANALYSIS: true,
  ENABLE_LIVE_COACHING: true,

  // Debug features (set via environment)
  ENABLE_DEBUG_PANEL: process.env.NODE_ENV === 'development',
  ENABLE_PERFORMANCE_MONITORING: process.env.NODE_ENV === 'development',
} as const;

/**
 * Validation configuration
 */
export const VALIDATION_CONFIG = {
  // String length limits
  MIN_API_KEY_LENGTH: 20,
  MAX_API_KEY_LENGTH: 500,
  MIN_PGN_LENGTH: 10,
  MAX_PGN_LENGTH: 100000,

  // Number ranges
  MIN_SKILL_LEVEL: 0,
  MAX_SKILL_LEVEL: 100,
  MIN_NOTIFICATION_VOLUME: 0,
  MAX_NOTIFICATION_VOLUME: 100,

  // Timeouts
  PGN_PARSE_TIMEOUT_MS: 5000,
} as const;

/**
 * Environment-specific config
 */
export const ENV_CONFIG = {
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',
} as const;

/**
 * Gets a config value with fallback
 *
 * @param key - Config key path (e.g., 'API_CONFIG.CLAUDE_API_TIMEOUT_MS')
 * @param fallback - Fallback value if key not found
 * @returns Config value or fallback
 */
export function getConfig<T>(key: string, fallback: T): T {
  // Simple implementation - in production, might use lodash.get
  const keys = key.split('.');
  let current: unknown = { API_CONFIG, STORAGE_CONFIG, UI_CONFIG, FEATURES, VALIDATION_CONFIG, ENV_CONFIG };

  for (const k of keys) {
    if (typeof current === 'object' && current !== null && k in current) {
      current = (current as Record<string, unknown>)[k];
    } else {
      return fallback;
    }
  }

  return (current as T) || fallback;
}
