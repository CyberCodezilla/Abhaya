/**
 * Alert and messaging constants
 */

/**
 * Maximum number of emergency contacts allowed
 * WHY: Prevent excessive SMS costs and spam
 */
export const MAX_EMERGENCY_CONTACTS = 10;

/**
 * Minimum contacts recommended
 */
export const MIN_RECOMMENDED_CONTACTS = 2;

/**
 * SMS character limit (single SMS in India)
 * WHY: Keep messages within single SMS to ensure delivery
 */
export const SMS_CHARACTER_LIMIT = 160;

/**
 * Delay between sending alerts to different contacts (milliseconds)
 * WHY: Give time for app to open before switching to next
 * OPTIMIZED: Reduced for faster sequential sending
 */
export const CONTACT_SWITCH_DELAY = 300; // 300ms - just enough for app to open

/**
 * Delay between different alert methods for same contact (milliseconds)
 * WHY: Allow time for previous app to open before opening next
 * OPTIMIZED: Minimal delay for fastest user experience
 */
export const METHOD_SWITCH_DELAY = 200; // 200ms - quick app switching

/**
 * WhatsApp URL scheme for sending messages
 * WHY: Open WhatsApp with pre-filled message
 */
export const WHATSAPP_URL_SCHEME = 'whatsapp://send';

/**
 * Maximum length for contact name
 */
export const MAX_NAME_LENGTH = 50;

/**
 * Relationship options for contacts
 */
export const RELATIONSHIP_OPTIONS = [
  'Mother',
  'Father',
  'Sister',
  'Brother',
  'Friend',
  'Spouse',
  'Partner',
  'Colleague',
  'Neighbor',
  'Other',
] as const;

/**
 * Alert method labels for UI
 */
export const ALERT_METHOD_LABELS: Record<string, string> = {
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  email: 'Email',
};

/**
 * Alert method icons (emoji)
 */
export const ALERT_METHOD_ICONS: Record<string, string> = {
  sms: '💬',
  whatsapp: '📱',
  email: '📧',
};

/**
 * Default alert methods for new contacts
 */
export const DEFAULT_ALERT_METHODS = ['sms', 'whatsapp'] as const;
