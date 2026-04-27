/**
 * App-wide configuration constants
 */

export const APP_NAME = 'ABHAYA';
export const APP_VERSION = '1.0.0';

/**
 * Storage keys for AsyncStorage
 * Prefixed to avoid conflicts with other apps
 */
export const STORAGE_KEYS = {
  EMERGENCY_CONTACTS: '@abhaya:emergency_contacts',
  USER_SETTINGS: '@abhaya:settings',
  SOS_HISTORY: '@abhaya:sos_history',
  VOICE_TRIGGER_ENABLED: '@abhaya:voice_trigger_enabled',
  TRIGGER_WORDS: '@abhaya:trigger_words',
} as const;

/**
 * Feature flags for enabling/disabling features
 * Useful during development and testing
 */
export const FEATURES = {
  VOICE_ACTIVATION: true, // Enable voice-triggered SOS
  FAKE_CALL: true, // Enable fake call feature
  EVIDENCE_RECORDING: true, // Enable evidence recording
  SMS_ALERTS: true, // Enable SMS sending
} as const;

/**
 * Colors for consistent theming
 * Design System: Emergency-first, high-contrast, sunlight-readable
 */
export const COLORS = {
  // Emergency reds
  PRIMARY: '#EF4444',           // SOS / danger / emergency
  PRIMARY_DARK: '#DC2626',      // Pressed state
  PRIMARY_DARKER: '#B91C1C',    // Active SOS background

  // Warning / scanning
  WARNING: '#F97316',           // Countdown / detecting
  WARNING_DARK: '#EA580C',

  // Success / confirmed
  SUCCESS: '#10B981',           // Ready / sent
  SUCCESS_DARK: '#059669',

  // Information
  SECONDARY: '#3B82F6',         // Links / info buttons
  SECONDARY_DARK: '#2563EB',

  // Backgrounds
  BACKGROUND: '#1F2937',        // Dark gray — main app background
  BACKGROUND_CARD: '#374151',   // Card/panel background
  BACKGROUND_LIGHT: '#4B5563',  // Elevated surfaces
  BACKGROUND_GRAY: '#F5F5F5',   // Legacy light gray (setup screens)

  // Text on dark backgrounds
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#9CA3AF',    // Gray-400
  TEXT_MUTED: '#6B7280',        // Gray-500

  // Borders
  BORDER: '#4B5563',            // Gray-600
  BORDER_LIGHT: '#6B7280',

  // Legacy aliases (backward compatible)
  DANGER: '#EF4444',
} as const;
