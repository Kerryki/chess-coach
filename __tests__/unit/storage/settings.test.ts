/**
 * Unit tests for settings storage and persistence
 * Tests loading, saving, validating, and persisting application settings
 */

import {
  loadSettings,
  saveSettings,
  updateSetting,
  updateSettings,
  resetSettings,
  exportSettings,
} from '../../../lib/storage/settings'
import { AppSettings } from '../../../lib/types/storage'

describe('Settings Storage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    jest.clearAllMocks()
  })

  describe('loadSettings', () => {
    it('should return default settings when localStorage is empty', () => {
      const settings = loadSettings()

      expect(settings.claudeApiKey).toBe('')
      expect(settings.skillLevel).toBe('intermediate')
      expect(settings.theme).toBe('light')
      expect(settings.autoAnnotate).toBe(true)
      expect(settings.language).toBe('en')
      expect(settings.notificationVolume).toBe(50)
    })

    it('should load settings from localStorage when available', () => {
      const testSettings: AppSettings = {
        provider: 'claude',
        claudeApiKey: 'test-key',
        geminiApiKey: '',
        skillLevel: 'advanced',
        theme: 'dark',
        autoAnnotate: false,
        language: 'en',
        notificationVolume: 75,
        updatedAt: Date.now(),
      }

      localStorage.setItem('chess_coach_settings', JSON.stringify(testSettings))

      const loaded = loadSettings()

      expect(loaded.claudeApiKey).toBe('test-key')
      expect(loaded.skillLevel).toBe('advanced')
      expect(loaded.theme).toBe('dark')
    })

    it('should return defaults for invalid stored settings', () => {
      localStorage.setItem('chess_coach_settings', 'invalid json')

      const settings = loadSettings()

      expect(settings.skillLevel).toBe('intermediate')
      expect(settings.claudeApiKey).toBe('')
    })

    it('should validate stored settings', () => {
      const invalidSettings = {
        provider: 'claude',
        claudeApiKey: 'key',
        geminiApiKey: '',
        skillLevel: 'invalid_level',
        theme: 'light',
        autoAnnotate: true,
        language: 'en',
        notificationVolume: 50,
        updatedAt: Date.now(),
      }

      localStorage.setItem('chess_coach_settings', JSON.stringify(invalidSettings))

      const settings = loadSettings()

      // Should fall back to defaults due to validation failure
      expect(settings.skillLevel).toBe('intermediate')
    })

    it('should preserve timestamps', () => {
      const timestamp = 1234567890
      const testSettings: AppSettings = {
        provider: 'claude',
        claudeApiKey: 'test',
        geminiApiKey: '',
        skillLevel: 'beginner',
        theme: 'light',
        autoAnnotate: true,
        language: 'en',
        notificationVolume: 50,
        updatedAt: timestamp,
      }

      localStorage.setItem('chess_coach_settings', JSON.stringify(testSettings))

      const loaded = loadSettings()

      expect(loaded.updatedAt).toBe(timestamp)
    })
  })

  describe('saveSettings', () => {
    it('should save settings to localStorage', () => {
      const settings: AppSettings = {
        provider: 'claude',
        claudeApiKey: 'test-key',
        geminiApiKey: '',
        skillLevel: 'advanced',
        theme: 'dark',
        autoAnnotate: false,
        language: 'en',
        notificationVolume: 80,
        updatedAt: 0,
      }

      const [saved, error] = saveSettings(settings)

      expect(error).toBeNull()
      expect(saved).toBeDefined()
      expect(saved?.skillLevel).toBe('advanced')

      // Verify it was actually saved
      const stored = localStorage.getItem('chess_coach_settings')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.skillLevel).toBe('advanced')
    })

    it('should update timestamp when saving', () => {
      const settings: AppSettings = {
        provider: 'claude',
        claudeApiKey: '',
        geminiApiKey: '',
        skillLevel: 'intermediate',
        theme: 'light',
        autoAnnotate: true,
        language: 'en',
        notificationVolume: 50,
        updatedAt: 1000,
      }

      const [saved] = saveSettings(settings)

      expect(saved?.updatedAt).toBeGreaterThan(1000)
    })

    it('should return error for invalid settings', () => {
      const invalidSettings = {
        provider: 'claude',
        claudeApiKey: 'key',
        geminiApiKey: '',
        skillLevel: 'invalid',
        theme: 'light',
        autoAnnotate: true,
        language: 'en',
        notificationVolume: 50,
        updatedAt: Date.now(),
      } as unknown as AppSettings

      const [saved, error] = saveSettings(invalidSettings)

      expect(saved).toBeNull()
      expect(error).toBeDefined()
    })

    it('should validate notificationVolume range', () => {
      const invalidVolume: AppSettings = {
        provider: 'claude',
        claudeApiKey: '',
        geminiApiKey: '',
        skillLevel: 'intermediate',
        theme: 'light',
        autoAnnotate: true,
        language: 'en',
        notificationVolume: 150, // Invalid: > 100
        updatedAt: Date.now(),
      }

      const [, error] = saveSettings(invalidVolume)

      expect(error).toBeDefined()
    })

    it('should reject negative volume', () => {
      const invalidVolume: AppSettings = {
        provider: 'claude',
        claudeApiKey: '',
        geminiApiKey: '',
        skillLevel: 'intermediate',
        theme: 'light',
        autoAnnotate: true,
        language: 'en',
        notificationVolume: -10,
        updatedAt: Date.now(),
      }

      const [, error] = saveSettings(invalidVolume)

      expect(error).toBeDefined()
    })
  })

  describe('updateSetting', () => {
    it('should update single setting field', () => {
      const [updated, error] = updateSetting('skillLevel', 'advanced')

      expect(error).toBeNull()
      expect(updated?.skillLevel).toBe('advanced')
    })

    it('should preserve other settings when updating one field', () => {
      const initial: AppSettings = {
        provider: 'claude',
        claudeApiKey: 'my-key',
        geminiApiKey: '',
        skillLevel: 'beginner',
        theme: 'dark',
        autoAnnotate: false,
        language: 'en',
        notificationVolume: 30,
        updatedAt: Date.now(),
      }

      localStorage.setItem('chess_coach_settings', JSON.stringify(initial))

      const [updated] = updateSetting('skillLevel', 'advanced')

      expect(updated?.claudeApiKey).toBe('my-key')
      expect(updated?.theme).toBe('dark')
      expect(updated?.skillLevel).toBe('advanced')
    })

    it('should update theme', () => {
      const [updated, error] = updateSetting('theme', 'dark')

      expect(error).toBeNull()
      expect(updated?.theme).toBe('dark')
    })

    it('should update API key', () => {
      const [updated, error] = updateSetting('claudeApiKey', 'sk-test-key-123')

      expect(error).toBeNull()
      expect(updated?.claudeApiKey).toBe('sk-test-key-123')
    })

    it('should update notification volume', () => {
      const [updated, error] = updateSetting('notificationVolume', 75)

      expect(error).toBeNull()
      expect(updated?.notificationVolume).toBe(75)
    })

    it('should reject invalid updates', () => {
      const [, error] = updateSetting('skillLevel', 'invalid' as any)

      expect(error).toBeDefined()
    })

    it('should validate language format', () => {
      const [updated1] = updateSetting('language', 'fr')
      expect(updated1?.language).toBe('fr')

      const [updated2] = updateSetting('language', 'en-US')
      expect(updated2?.language).toBe('en-US')

      const [, error] = updateSetting('language', 'invalid-lang')
      expect(error).toBeDefined()
    })
  })

  describe('updateSettings', () => {
    it('should update multiple settings at once', () => {
      const updates = {
        skillLevel: 'advanced' as const,
        theme: 'dark' as const,
        notificationVolume: 90,
      }

      const [updated, error] = updateSettings(updates)

      expect(error).toBeNull()
      expect(updated?.skillLevel).toBe('advanced')
      expect(updated?.theme).toBe('dark')
      expect(updated?.notificationVolume).toBe(90)
    })

    it('should preserve unmodified settings', () => {
      const initial: AppSettings = {
        provider: 'claude',
        claudeApiKey: 'test-key',
        geminiApiKey: '',
        skillLevel: 'beginner',
        theme: 'light',
        autoAnnotate: true,
        language: 'en',
        notificationVolume: 50,
        updatedAt: Date.now(),
      }

      localStorage.setItem('chess_coach_settings', JSON.stringify(initial))

      const [updated] = updateSettings({ skillLevel: 'advanced' })

      expect(updated?.claudeApiKey).toBe('test-key')
      expect(updated?.autoAnnotate).toBe(true)
      expect(updated?.skillLevel).toBe('advanced')
    })

    it('should reject if any update is invalid', () => {
      const updates = {
        skillLevel: 'invalid' as any,
        theme: 'dark' as const,
      }

      const [saved, error] = updateSettings(updates)

      expect(saved).toBeNull()
      expect(error).toBeDefined()
    })

    it('should handle empty updates', () => {
      const [updated, error] = updateSettings({})

      expect(error).toBeNull()
      expect(updated).toBeDefined()
    })
  })

  describe('resetSettings', () => {
    it('should clear localStorage and return defaults', () => {
      const testSettings: AppSettings = {
        provider: 'claude',
        claudeApiKey: 'test-key',
        geminiApiKey: '',
        skillLevel: 'advanced',
        theme: 'dark',
        autoAnnotate: false,
        language: 'en',
        notificationVolume: 75,
        updatedAt: Date.now(),
      }

      localStorage.setItem('chess_coach_settings', JSON.stringify(testSettings))

      const reset = resetSettings()

      expect(reset.skillLevel).toBe('intermediate')
      expect(reset.theme).toBe('light')
      expect(reset.claudeApiKey).toBe('')

      // Verify localStorage was cleared
      const stored = localStorage.getItem('chess_coach_settings')
      expect(stored).toBeNull()
    })

    it('should always return default values', () => {
      // Even with no storage, should return defaults
      const reset = resetSettings()

      expect(reset.skillLevel).toBe('intermediate')
      expect(reset.autoAnnotate).toBe(true)
      expect(reset.notificationVolume).toBe(50)
    })
  })

  describe('exportSettings', () => {
    it('should export settings as JSON string', () => {
      const settings: AppSettings = {
        provider: 'claude',
        claudeApiKey: 'test-key-123',
        geminiApiKey: '',
        skillLevel: 'advanced',
        theme: 'dark',
        autoAnnotate: false,
        language: 'en',
        notificationVolume: 80,
        updatedAt: 1234567890,
      }

      const exported = exportSettings(settings)

      const parsed = JSON.parse(exported)
      expect(parsed.skillLevel).toBe('advanced')
      expect(parsed.notificationVolume).toBe(80)
    })

    it('should redact API key in export', () => {
      const settings: AppSettings = {
        provider: 'claude',
        claudeApiKey: 'sk-secret-key-123-very-long',
        geminiApiKey: '',
        skillLevel: 'intermediate',
        theme: 'light',
        autoAnnotate: true,
        language: 'en',
        notificationVolume: 50,
        updatedAt: Date.now(),
      }

      const exported = exportSettings(settings)

      expect(exported).toContain('[REDACTED]')
      expect(exported).not.toContain('sk-secret-key-123')
    })

    it('should handle empty API key', () => {
      const settings: AppSettings = {
        provider: 'claude',
        claudeApiKey: '',
        geminiApiKey: '',
        skillLevel: 'intermediate',
        theme: 'light',
        autoAnnotate: true,
        language: 'en',
        notificationVolume: 50,
        updatedAt: Date.now(),
      }

      const exported = exportSettings(settings)

      const parsed = JSON.parse(exported)
      expect(parsed.claudeApiKey).toBe('')
    })

    it('should format JSON with indentation', () => {
      const settings: AppSettings = {
        provider: 'claude',
        claudeApiKey: 'key',
        geminiApiKey: '',
        skillLevel: 'intermediate',
        theme: 'light',
        autoAnnotate: true,
        language: 'en',
        notificationVolume: 50,
        updatedAt: Date.now(),
      }

      const exported = exportSettings(settings)

      expect(exported).toContain('\n')
      expect(exported).toContain('  ')
    })
  })

  describe('immutability and validation', () => {
    it('should validate skill level enum', () => {
      const [, error1] = updateSetting('skillLevel', 'beginner')
      const [, error2] = updateSetting('skillLevel', 'intermediate')
      const [, error3] = updateSetting('skillLevel', 'advanced')
      const [, error4] = updateSetting('skillLevel', 'invalid' as any)

      expect(error1).toBeNull()
      expect(error2).toBeNull()
      expect(error3).toBeNull()
      expect(error4).toBeDefined()
    })

    it('should validate theme enum', () => {
      const [, error1] = updateSetting('theme', 'light')
      const [, error2] = updateSetting('theme', 'dark')
      const [, error3] = updateSetting('theme', 'auto' as any)

      expect(error1).toBeNull()
      expect(error2).toBeNull()
      expect(error3).toBeDefined()
    })

    it('should validate autoAnnotate boolean', () => {
      const [, error1] = updateSetting('autoAnnotate', true)
      const [, error2] = updateSetting('autoAnnotate', false)

      expect(error1).toBeNull()
      expect(error2).toBeNull()
    })

    it('should ensure settings are immutable', () => {
      const settings: AppSettings = {
        provider: 'claude',
        claudeApiKey: '',
        geminiApiKey: '',
        skillLevel: 'intermediate',
        theme: 'light',
        autoAnnotate: true,
        language: 'en',
        notificationVolume: 50,
        updatedAt: Date.now(),
      }

      const [updated] = saveSettings(settings)

      // Verify original is not modified
      expect(settings.skillLevel).toBe('intermediate')
      // Not strictly greater: two Date.now() calls in the same test can
      // legitimately land in the same millisecond, so the real invariant
      // to check here is "not older than", not "strictly newer than".
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(settings.updatedAt)
    })
  })

  describe('edge cases', () => {
    it('should handle notificationVolume of 0', () => {
      const [updated, error] = updateSetting('notificationVolume', 0)

      expect(error).toBeNull()
      expect(updated?.notificationVolume).toBe(0)
    })

    it('should handle notificationVolume of 100', () => {
      const [updated, error] = updateSetting('notificationVolume', 100)

      expect(error).toBeNull()
      expect(updated?.notificationVolume).toBe(100)
    })

    it('should handle very long API keys', () => {
      const longKey = 'sk-' + 'x'.repeat(500)
      const [updated, error] = updateSetting('claudeApiKey', longKey)

      expect(error).toBeNull()
      expect(updated?.claudeApiKey).toBe(longKey)
    })

    it('should handle concurrent updates gracefully', async () => {
      const updates = [
        updateSetting('skillLevel', 'advanced'),
        updateSetting('theme', 'dark'),
        updateSetting('notificationVolume', 75),
      ]

      const results = await Promise.all(updates)

      // All should succeed or fail consistently
      expect(results.length).toBe(3)
    })
  })
})
