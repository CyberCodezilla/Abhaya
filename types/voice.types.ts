/**
 * Voice Detection Types
 * Type definitions for the voice-triggered SOS system
 */

/**
 * Status of the voice detection engine
 */
export type VoiceEngineStatus =
  | 'idle'         // Not started
  | 'initializing' // Loading Porcupine models
  | 'listening'    // Actively listening for wake words
  | 'error'        // Failed to initialize or runtime error
  | 'stopped';     // Explicitly stopped by user

/**
 * A single keyword detection event
 */
export interface KeywordDetection {
  /** Which keyword was detected */
  keyword: string;
  /** Timestamp of detection (Date.now()) */
  timestamp: number;
  /** Index in the Porcupine keyword array */
  keywordIndex: number;
}

/**
 * State of the keyword repetition counter
 */
export interface KeywordCounterState {
  /** Rolling list of recent detections within the time window */
  detections: KeywordDetection[];
  /** Whether SOS was triggered (for cooldown tracking) */
  lastTriggerTimestamp: number | null;
  /** Whether currently in cooldown period */
  isInCooldown: boolean;
}

/**
 * Configuration for the voice detection engine
 */
export interface VoiceDetectionConfig {
  /** Picovoice access key */
  accessKey: string;
  /** Paths to custom .ppn keyword model files (or built-in keyword names) */
  keywordPaths: string[];
  /** Keyword labels (must match keywordPaths order) */
  keywordLabels: string[];
  /** Sensitivity per keyword (0.0–1.0) */
  sensitivities: number[];
  /** Number of detections required to trigger */
  triggerCount: number;
  /** Time window in ms */
  timeWindowMs: number;
  /** Cooldown in ms after trigger */
  cooldownMs: number;
}

/**
 * Result from the voice SOS trigger
 */
export interface VoiceSOSTriggerResult {
  /** Whether SOS was triggered */
  triggered: boolean;
  /** Keyword that triggered it */
  keyword: string;
  /** Number of detections that led to trigger */
  detectionCount: number;
  /** Timestamp of trigger */
  timestamp: number;
}

/**
 * Voice protection state exposed to UI
 */
export interface VoiceProtectionState {
  /** Overall engine status */
  status: VoiceEngineStatus;
  /** Whether the engine is actively listening */
  isListening: boolean;
  /** Whether voice protection is enabled by user */
  isEnabled: boolean;
  /** Error message if status is 'error' */
  errorMessage: string | null;
  /** Last keyword detected (for UI feedback) */
  lastDetectedKeyword: string | null;
  /** Current detection count in the window */
  currentDetectionCount: number;
}
