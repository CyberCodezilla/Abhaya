/**
 * Voice Detection Constants
 * Configuration for Porcupine wake-word detection and SOS trigger logic
 */

/**
 * USE MOCK ENGINE FOR DEVELOPMENT
 * true  → Test via buttons in Voice Test screen (Metro dev mode or missing .ppn assets)
 * false → Real Porcupine mic detection (compiled APK only)
 */
export const USE_MOCK_ENGINE = false;

/**
 * Picovoice Access Key
 * IMPORTANT: Replace with your actual Picovoice Console access key
 * Get one free at: https://console.picovoice.ai/
 * 
 * FOR STUDENTS: You CAN use personal/Gmail/university email
 * If you still face issues, keep USE_MOCK_ENGINE = true above
 */
export const PICOVOICE_ACCESS_KEY = 'Ovvpxl1BbytZhikiA7YNmUeZ5F4DedApoMqYRwzveoXE1FaH1OkrIg==';

/**
 * Wake words to detect
 * These are the trigger keywords that initiate SOS
 * Using Porcupine built-in "hey google" as fallback; custom .ppn files needed for "Help" and "Bachao"
 */
export const WAKE_WORDS = {
  HELP: 'help',
  BACHAO: 'bachao',
} as const;

/**
 * Number of keyword detections required to trigger SOS
 * WHY: Set to 1 for extremely frictionless and highly sensitive demonstration!
 */
export const KEYWORD_TRIGGER_COUNT = 1;

/**
 * Time window (ms) within which KEYWORD_TRIGGER_COUNT detections must occur
 * WHY: 5 seconds ensures the person is actively calling for help
 */
export const KEYWORD_TIME_WINDOW_MS = 5000;

/**
 * Cooldown period (ms) after an SOS is triggered before another can fire
 * WHY: Set extremely low for fast rapid-fire testing!
 */
export const SOS_COOLDOWN_MS = 2000;

/**
 * Porcupine sensitivity (0.0 – 1.0)
 * Higher = more sensitive but more false positives
 * WHY: 1.0 ensures maximum detection rate for non-US accents during presentations
 */
export const PORCUPINE_SENSITIVITY = 1.0;

/**
 * Foreground service notification config
 */
export const FOREGROUND_NOTIFICATION = {
  CHANNEL_ID: 'abhaya_protection',
  CHANNEL_NAME: 'Abhaya Protection',
  NOTIFICATION_ID: 1001,
  TITLE: 'Abhaya Protection Active',
  BODY: 'Voice safety monitoring is running in the background.',
  ICON: 'ic_launcher', // Uses app icon
} as const;

/**
 * Audio engine status values
 */
export type VoiceEngineStatus =
  | 'idle'
  | 'initializing'
  | 'listening'
  | 'error'
  | 'stopped';

/**
 * Voice detection log entry for debugging
 */
export interface VoiceDetectionLog {
  keyword: string;
  timestamp: number;
  count: number;
  triggered: boolean;
}
