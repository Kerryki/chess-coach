/**
 * Settings storage and persistence layer using localStorage
 * All operations validate with Zod before saving
 */

import { z } from 'zod';
import { AppSettings } from '@/lib/types/storage';
import { AppError } from '@/lib/types/errors';
import { logger } from '@/lib/utils/logger';
import { createAppError, wrapError } from '@/lib/utils/errorHandler';
import { validateInput } from '@/lib/utils/validation';
import { STORAGE_CONFIG } from '@/lib/constants/config';

/**
 * Default application settings
 */
const DEFAULT_SETTINGS: AppSettings = {
  provider: 'claude',
  claudeApiKey: '',
  geminiApiKey: '',
  skillLevel: 'intermediate',
  theme: 'light',
  autoAnnotate: true,
  language: 'en',
  notificationVolume: 50,
  updatedAt: Date.now(),
};

/**
 * Zod schema for validating AppSettings
 */
const AppSettingsSchema = z.object({
  // .default(...) lets settings saved before multi-provider support (missing
  // these fields) still validate instead of falling back to all defaults.
  provider: z.enum(['claude', 'gemini']).default('claude'),
  claudeApiKey: z.string(),
  geminiApiKey: z.string().default(''),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  theme: z.enum(['light', 'dark']),
  autoAnnotate: z.boolean(),
  language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
  notificationVolume: z.number().int().min(0).max(100),
  updatedAt: z.number(),
}) as z.ZodSchema<AppSettings>;

/**
 * Storage key for settings - use STORAGE_CONFIG as single source of truth
 */
const SETTINGS_STORAGE_KEY = STORAGE_CONFIG.SETTINGS_KEY;

/**
 * Checks if localStorage is available
 *
 * @returns True if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__chess_coach_storage_test__';
    if (typeof window === 'undefined') return false;
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads settings from localStorage with Zod validation
 * Falls back to defaults if settings don't exist or are invalid
 *
 * @returns Settings object
 */
export function loadSettings(): AppSettings {
  if (!isLocalStorageAvailable()) {
    logger.warn('localStorage not available, using default settings');
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!stored) {
      logger.info('No stored settings found, using defaults');
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(stored);
    const [validated, error] = validateInput(AppSettingsSchema, parsed, 'stored settings');

    if (error || !validated) {
      logger.warn('Stored settings failed validation, using defaults', {
        error: error?.message || 'Validation returned null',
      });
      return DEFAULT_SETTINGS;
    }

    logger.debug('Settings loaded successfully');
    return validated;
  } catch (error) {
    logger.error('Failed to load settings', error, {
      key: SETTINGS_STORAGE_KEY,
    });
    return DEFAULT_SETTINGS;
  }
}

/**
 * Saves settings to localStorage with Zod validation
 * Creates immutable copy with updated timestamp
 *
 * @param settings - Settings to save
 * @returns Success or error
 */
export function saveSettings(settings: AppSettings): [AppSettings | null, AppError | null] {
  if (!isLocalStorageAvailable()) {
    const error = createAppError(
      'STORAGE_UNAVAILABLE',
      'localStorage is not available',
      'Unable to save settings. Please check browser permissions.',
    );
    logger.error('Failed to save settings', error);
    return [null, error];
  }

  try {
    // Create new settings object with updated timestamp (immutable pattern)
    const settingsToSave: AppSettings = {
      ...settings,
      updatedAt: Date.now(),
    };

    // Validate before saving
    const [validated, validationError] = validateInput(
      AppSettingsSchema,
      settingsToSave,
      'settings to save',
    );

    if (validationError || !validated) {
      logger.error('Settings validation failed', validationError || new Error('Validation returned null'));
      return [null, validationError];
    }

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(validated));
    logger.info('Settings saved successfully');
    return [validated, null];
  } catch (error) {
    const appError = wrapError(error, {
      operation: 'saveSettings',
    });
    logger.error('Failed to save settings', appError);
    return [null, appError];
  }
}

/**
 * Updates a single setting field (immutable)
 * Loads current settings, updates one field, validates, and saves
 *
 * @param field - Setting field to update
 * @param value - New value
 * @returns Updated settings or error
 */
export function updateSetting<K extends keyof AppSettings>(
  field: K,
  value: AppSettings[K],
): [AppSettings | null, AppError | null] {
  try {
    const current = loadSettings();

    // Create new settings object with updated field (immutable pattern)
    const updated: AppSettings = {
      ...current,
      [field]: value,
    };

    // Validate the updated settings
    const [validated, validationError] = validateInput(
      AppSettingsSchema,
      updated,
      `settings with updated ${String(field)}`,
    );

    if (validationError || !validated) {
      logger.error(`Setting update validation failed for ${String(field)}`, validationError || new Error('Validation returned null'));
      return [null, validationError];
    }

    // Save if valid
    return saveSettings(validated);
  } catch (error) {
    const appError = wrapError(error, {
      operation: 'updateSetting',
      field: String(field),
    });
    logger.error('Failed to update setting', appError);
    return [null, appError];
  }
}

/**
 * Updates multiple settings at once (immutable)
 * Merges updates with current settings, validates, and saves
 *
 * @param updates - Partial settings to update
 * @returns Updated settings or error
 */
export function updateSettings(
  updates: Partial<AppSettings>,
): [AppSettings | null, AppError | null] {
  try {
    const current = loadSettings();

    // Create new settings object with updates (immutable pattern)
    const updated: AppSettings = {
      ...current,
      ...updates,
    };

    // Validate the updated settings
    const [validated, validationError] = validateInput(
      AppSettingsSchema,
      updated,
      'updated settings',
    );

    if (validationError || !validated) {
      logger.error('Settings update validation failed', validationError || new Error('Validation returned null'));
      return [null, validationError];
    }

    // Save if valid
    return saveSettings(validated);
  } catch (error) {
    const appError = wrapError(error, {
      operation: 'updateSettings',
    });
    logger.error('Failed to update settings', appError);
    return [null, appError];
  }
}

/**
 * Clears all settings and returns to defaults
 *
 * @returns Default settings
 */
export function resetSettings(): AppSettings {
  try {
    if (isLocalStorageAvailable()) {
      window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    }
    logger.info('Settings reset to defaults');
    return DEFAULT_SETTINGS;
  } catch (error) {
    logger.error('Failed to reset settings', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Exports settings as JSON (for backup)
 * Never includes full API key in export
 *
 * @param settings - Settings to export
 * @returns JSON string with masked API key
 */
export function exportSettings(settings: AppSettings): string {
  const exportData = {
    ...settings,
    claudeApiKey: settings.claudeApiKey ? '[REDACTED]' : '',
    geminiApiKey: settings.geminiApiKey ? '[REDACTED]' : '',
  };

  return JSON.stringify(exportData, null, 2);
}
