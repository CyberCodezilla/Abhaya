/**
 * Emergency-related constants
 * Centralized configuration for SOS behavior
 */

/**
 * How long to wait before auto-triggering SOS (in seconds)
 * Gives user time to cancel accidental presses
 */
export const SOS_COUNTDOWN_DURATION = 3;

/**
 * How often to update location when SOS is active (in milliseconds)
 * Every 30 seconds to balance accuracy with battery
 */
export const LOCATION_UPDATE_INTERVAL = 30000;

/**
 * Maximum time to wait for GPS location (in milliseconds)
 * After this, proceed with "Location unavailable"
 */
export const LOCATION_TIMEOUT = 10000;

/**
 * Default SOS message template
 * Will be customizable by user later
 */
export const DEFAULT_SOS_MESSAGE = 
  "🚨 EMERGENCY ALERT 🚨\n" +
  "This is an SOS from ABHAYA app.\n" +
  "I need immediate help!\n\n";

/**
 * Message when location is loading
 */
export const LOCATION_LOADING_MESSAGE = "📍 Getting location...";

/**
 * Message when location is unavailable
 */
export const LOCATION_UNAVAILABLE_MESSAGE = "📍 Location: Unable to determine current location";

/**
 * Haptic pattern for SOS activation
 * Distinct pattern so user knows it's triggered even without looking
 */
export const SOS_HAPTIC_PATTERN = {
  durations: [300, 200, 300, 200, 300], // Vibration durations
  type: 'notificationSuccess' as const, // Expo Haptics notification type
};

/**
 * Button hold duration not used (we use countdown instead)
 * Kept for future reference
 */
export const BUTTON_HOLD_DURATION = 2000; // milliseconds
