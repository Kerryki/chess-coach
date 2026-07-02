/**
 * Settings modal for API key management and skill level selection
 * Modal interface for configuring application settings
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { AppSettings, AIProvider } from '@/lib/types/storage';
import { loadSettings, updateSettings } from '@/lib/storage/settings';
import { testApiKey, looksLikeApiKey } from '@/lib/utils/apiKeyValidator';
import { logger } from '@/lib/utils/logger';
import { AppError } from '@/lib/types/errors';

const PROVIDER_LABELS: Record<AIProvider, string> = {
  claude: 'Claude',
  gemini: 'Gemini',
};

const PROVIDER_KEY_FIELD: Record<AIProvider, keyof Pick<AppSettings, 'claudeApiKey' | 'geminiApiKey'>> = {
  claude: 'claudeApiKey',
  gemini: 'geminiApiKey',
};

/**
 * Props for SettingsModal component
 */
interface SettingsModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback when modal closes */
  onClose: () => void;
  /** Callback when settings are saved */
  onSettingsChanged?: (settings: AppSettings) => void;
  /** Optional CSS class */
  className?: string;
}

/**
 * SettingsModal component - displays settings form with API key and skill level
 */
export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsChanged,
  className = '',
}) => {
  // Settings state
  const [provider, setProvider] = useState<AIProvider>('claude');
  const [apiKey, setApiKey] = useState('');
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [hasExistingKey, setHasExistingKey] = useState(false);

  // UI state
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load settings on modal open
  useEffect(() => {
    if (isOpen) {
      const settings = loadSettings();
      setApiKey('');
      setProvider(settings.provider);
      setSkillLevel(settings.skillLevel);
      setHasExistingKey(!!settings[PROVIDER_KEY_FIELD[settings.provider]]);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  // Switch provider: reset the key input and re-check whether that
  // provider already has a saved key, so fields never mix between providers
  const handleProviderChange = useCallback((newProvider: AIProvider) => {
    setProvider(newProvider);
    setApiKey('');
    setError(null);
    setSuccess(null);
    setHasExistingKey(!!loadSettings()[PROVIDER_KEY_FIELD[newProvider]]);
  }, []);

  // Test API key validity
  const handleTestKey = useCallback(async () => {
    if (!apiKey.trim()) {
      setError({
        code: 'VALIDATION_ERROR',
        message: 'API key is empty',
        userMessage: 'Please enter an API key to test',
        timestamp: Date.now(),
      });
      return;
    }

    setIsTestingKey(true);
    setError(null);
    setSuccess(null);

    try {
      const [isValid, testError] = await testApiKey(apiKey.trim(), provider);

      if (isValid) {
        setSuccess('API key is valid!');
        setError(null);
      } else {
        setError(testError);
        setSuccess(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError({
        code: 'API_TEST_FAILED',
        message,
        userMessage: 'Failed to test API key. Please try again.',
        timestamp: Date.now(),
      });
      setSuccess(null);
      logger.error('API key test error', err);
    } finally {
      setIsTestingKey(false);
    }
  }, [apiKey, provider]);

  // Save settings
  const handleSave = useCallback((): void => {
    setError(null);
    setSuccess(null);

    try {
      // Only include the key for the currently selected provider if the user provided one
      const updates: Partial<AppSettings> = {
        provider,
        skillLevel,
        ...(apiKey.trim() ? { [PROVIDER_KEY_FIELD[provider]]: apiKey.trim() } : {}),
      };

      const [savedSettings, saveError] = updateSettings(updates);

      if (saveError) {
        setError(saveError);
        return;
      }

      if (savedSettings) {
        setSuccess('Settings saved successfully!');
        setHasExistingKey(true);
        onSettingsChanged?.(savedSettings);

        // Auto-close after short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError({
        code: 'SAVE_FAILED',
        message,
        userMessage: 'Failed to save settings. Please try again.',
        timestamp: Date.now(),
      });
      logger.error('Settings save error', err);
    }
  }, [apiKey, provider, skillLevel, onClose, onSettingsChanged]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setApiKey('');
    setError(null);
    setSuccess(null);
    onClose();
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  const showApiKeySection = true;

  return (
    <div className={`settings-modal-overlay ${className}`}>
      <div className="settings-modal">
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">Settings</h2>
          <button
            className="settings-modal-close"
            onClick={handleCancel}
            aria-label="Close settings"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="settings-modal-content">
          {/* Error Message */}
          {error && (
            <div className="settings-modal-alert settings-modal-alert-error" role="alert">
              <div className="settings-modal-alert-content">
                <span>{error.userMessage}</span>
                <button
                  className="settings-modal-alert-close"
                  onClick={() => setError(null)}
                  aria-label="Dismiss error"
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="settings-modal-alert settings-modal-alert-success" role="status">
              <div className="settings-modal-alert-content">
                <span>{success}</span>
                <button
                  className="settings-modal-alert-close"
                  onClick={() => setSuccess(null)}
                  aria-label="Dismiss message"
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* API Key Section */}
          {showApiKeySection && (
            <div className="settings-modal-section">
              <div className="settings-modal-section-header">
                <h3 className="settings-modal-section-title">AI Provider</h3>
                <p className="settings-modal-section-hint">
                  Choose which AI generates your coaching explanations
                </p>
              </div>

              <div className="settings-modal-field">
                <label htmlFor="provider-select" className="settings-modal-label">
                  Provider
                </label>
                <select
                  id="provider-select"
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
                  className="settings-modal-select"
                >
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="gemini">Gemini (Google) - has a free tier</option>
                </select>
              </div>

              <div className="settings-modal-field">
                <label htmlFor="api-key-input" className="settings-modal-label">
                  {PROVIDER_LABELS[provider]} API Key
                </label>
                <input
                  id="api-key-input"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    hasExistingKey && !apiKey
                      ? 'Current key set'
                      : provider === 'gemini'
                        ? 'AIza...'
                        : 'sk-...'
                  }
                  className="settings-modal-input"
                  aria-label={`${PROVIDER_LABELS[provider]} API key input`}
                />
                <p className="settings-modal-input-note">
                  {hasExistingKey && !apiKey
                    ? 'You have an API key saved for this provider. Enter a new one to replace it.'
                    : provider === 'gemini'
                      ? 'Get a free key from Google AI Studio (aistudio.google.com/apikey).'
                      : 'Get a key from console.anthropic.com/settings/keys.'}
                  {' '}Your API key is stored locally and never shared.
                </p>
              </div>

              <button
                onClick={handleTestKey}
                disabled={!looksLikeApiKey(apiKey) || isTestingKey}
                className="settings-modal-btn-secondary"
                type="button"
              >
                {isTestingKey ? 'Testing...' : 'Test API Key'}
              </button>
            </div>
          )}

          {/* Skill Level Section */}
          <div className="settings-modal-section">
            <div className="settings-modal-section-header">
              <h3 className="settings-modal-section-title">Skill Level</h3>
              <p className="settings-modal-section-hint">
                This affects the detail level of explanations
              </p>
            </div>

            <div className="settings-modal-field">
              <label htmlFor="skill-level-select" className="settings-modal-label">
                Your Level
              </label>
              <select
                id="skill-level-select"
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
                className="settings-modal-select"
              >
                <option value="beginner">Beginner (New to chess)</option>
                <option value="intermediate">Intermediate (Casual player)</option>
                <option value="advanced">Advanced (Competitive player)</option>
              </select>
            </div>

            <p className="settings-modal-skill-description">
              {skillLevel === 'beginner'
                ? 'Explanations will focus on basic concepts and move purposes.'
                : skillLevel === 'intermediate'
                  ? 'Explanations will include tactics, strategy, and positional ideas.'
                  : 'Explanations will cover deep tactical analysis, engine preferences, and advanced concepts.'}
            </p>
          </div>
        </div>

        {/* Footer with buttons */}
        <div className="settings-modal-footer">
          <button
            onClick={handleCancel}
            className="settings-modal-btn-cancel"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="settings-modal-btn-primary"
            type="button"
          >
            Save Settings
          </button>
        </div>
      </div>

      <style jsx>{`
        .settings-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .settings-modal {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .settings-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .settings-modal-title {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .settings-modal-close {
          width: 32px;
          height: 32px;
          padding: 0;
          border: none;
          background: none;
          color: #6b7280;
          font-size: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 200ms ease;
        }

        .settings-modal-close:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .settings-modal-close:active {
          background: #e5e7eb;
        }

        .settings-modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .settings-modal-alert {
          padding: 12px 16px;
          border-radius: 4px;
          border: 1px solid;
        }

        .settings-modal-alert-error {
          background-color: #fee;
          border-color: #fcc;
          color: #c00;
        }

        .settings-modal-alert-success {
          background-color: #efe;
          border-color: #cfc;
          color: #060;
        }

        .settings-modal-alert-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .settings-modal-alert-close {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          padding: 0;
          border: none;
          background: none;
          font-size: 18px;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 200ms ease;
        }

        .settings-modal-alert-close:hover {
          opacity: 1;
        }

        .settings-modal-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .settings-modal-section-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .settings-modal-section-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .settings-modal-section-hint {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
        }

        .settings-modal-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .settings-modal-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .settings-modal-input,
        .settings-modal-select {
          padding: 10px 12px;
          font-size: 14px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-family: inherit;
          background: white;
          color: #1f2937;
          transition: all 200ms ease;
        }

        .settings-modal-input:focus,
        .settings-modal-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .settings-modal-input-note {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
        }

        .settings-modal-skill-description {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
          padding: 8px 12px;
          background: #f9fafb;
          border-radius: 4px;
          border-left: 3px solid #667eea;
        }

        .settings-modal-footer {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .settings-modal-btn-primary,
        .settings-modal-btn-secondary,
        .settings-modal-btn-cancel {
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 4px;
          border: 1px solid;
          cursor: pointer;
          transition: all 200ms ease;
          font-family: inherit;
        }

        .settings-modal-btn-primary {
          flex: 1;
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        .settings-modal-btn-primary:hover {
          background: #5568d3;
          border-color: #5568d3;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
        }

        .settings-modal-btn-primary:active {
          transform: scale(0.95);
        }

        .settings-modal-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .settings-modal-btn-secondary {
          background: white;
          color: #667eea;
          border-color: #667eea;
        }

        .settings-modal-btn-secondary:hover:not(:disabled) {
          background: #667eea;
          color: white;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
        }

        .settings-modal-btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .settings-modal-btn-cancel {
          background: white;
          color: #6b7280;
          border-color: #d1d5db;
        }

        .settings-modal-btn-cancel:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        /* Dark mode */
        @media (prefers-color-scheme: dark) {
          .settings-modal {
            background: #1f2937;
            color: #f3f4f6;
          }

          .settings-modal-header {
            border-bottom-color: #374151;
          }

          .settings-modal-title {
            color: #f3f4f6;
          }

          .settings-modal-close {
            color: #9ca3af;
          }

          .settings-modal-close:hover {
            background: #374151;
            color: #f3f4f6;
          }

          .settings-modal-close:active {
            background: #4b5563;
          }

          .settings-modal-section-title {
            color: #f3f4f6;
          }

          .settings-modal-section-hint {
            color: #9ca3af;
          }

          .settings-modal-label {
            color: #e5e7eb;
          }

          .settings-modal-input,
          .settings-modal-select {
            background: #374151;
            color: #f3f4f6;
            border-color: #4b5563;
          }

          .settings-modal-input:focus,
          .settings-modal-select:focus {
            border-color: #81d4fa;
            box-shadow: 0 0 0 3px rgba(129, 212, 250, 0.1);
          }

          .settings-modal-input-note {
            color: #9ca3af;
          }

          .settings-modal-skill-description {
            background: #374151;
            border-left-color: #81d4fa;
            color: #e5e7eb;
          }

          .settings-modal-footer {
            border-top-color: #374151;
            background: #111827;
          }

          .settings-modal-btn-primary {
            background: #5b7ce9;
            border-color: #5b7ce9;
          }

          .settings-modal-btn-primary:hover {
            background: #4a6ad4;
            border-color: #4a6ad4;
          }

          .settings-modal-btn-secondary {
            background: #374151;
            color: #81d4fa;
            border-color: #81d4fa;
          }

          .settings-modal-btn-secondary:hover:not(:disabled) {
            background: #81d4fa;
            color: #1f2937;
          }

          .settings-modal-btn-cancel {
            background: #374151;
            color: #d1d5db;
            border-color: #4b5563;
          }

          .settings-modal-btn-cancel:hover {
            background: #4b5563;
            border-color: #6b7280;
          }
        }

        /* Responsive */
        @media (max-width: 600px) {
          .settings-modal {
            max-width: 100%;
          }

          .settings-modal-footer {
            flex-direction: column-reverse;
          }

          .settings-modal-btn-primary,
          .settings-modal-btn-cancel {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default SettingsModal;
