/**
 * Keyword Counter Service (Layer 2)
 * ═══════════════════════════════════════════════════════
 * Maintains a rolling detection counter with time-windowed logic.
 *
 * RULES:
 * 1. Store each keyword detection with timestamp
 * 2. Prune detections older than TIME_WINDOW_MS
 * 3. If count >= TRIGGER_COUNT within window → trigger SOS
 * 4. After trigger → enter COOLDOWN_MS period (no re-trigger)
 * 5. Reset counter when time window is exceeded without enough detections
 *
 * This module is pure logic — no side effects, no native calls.
 */

import {
    KEYWORD_TIME_WINDOW_MS,
    KEYWORD_TRIGGER_COUNT,
    SOS_COOLDOWN_MS,
} from '@/constants/voice.constants';
import {
    KeywordCounterState,
    KeywordDetection,
    VoiceSOSTriggerResult,
} from '@/types/voice.types';

// ─────────────────────────────────────────────────────────
// MODULE STATE (singleton within JS thread)
// ─────────────────────────────────────────────────────────

let state: KeywordCounterState = {
  detections: [],
  lastTriggerTimestamp: null,
  isInCooldown: false,
};

// ─────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────

/**
 * Record a new keyword detection and evaluate whether SOS should trigger.
 *
 * @param keyword  The detected keyword label (e.g. "help", "bachao")
 * @param keywordIndex  Index in the Porcupine keyword array
 * @returns VoiceSOSTriggerResult indicating whether SOS was triggered
 */
export function recordDetection(
  keyword: string,
  keywordIndex: number
): VoiceSOSTriggerResult {
  const now = Date.now();

  // ── Check cooldown ──
  if (state.isInCooldown && state.lastTriggerTimestamp !== null) {
    const elapsed = now - state.lastTriggerTimestamp;
    if (elapsed < SOS_COOLDOWN_MS) {
      if (__DEV__) {
        console.log(
          `[KeywordCounter] In cooldown. ${Math.ceil((SOS_COOLDOWN_MS - elapsed) / 1000)}s remaining.`
        );
      }
      return {
        triggered: false,
        keyword,
        detectionCount: 0,
        timestamp: now,
      };
    }
    // Cooldown expired — reset
    state.isInCooldown = false;
    state.lastTriggerTimestamp = null;
  }

  // ── Add new detection ──
  const detection: KeywordDetection = {
    keyword,
    timestamp: now,
    keywordIndex,
  };
  state.detections.push(detection);

  // ── Prune old detections (outside time window) ──
  const windowStart = now - KEYWORD_TIME_WINDOW_MS;
  state.detections = state.detections.filter((d) => d.timestamp >= windowStart);

  const count = state.detections.length;

  if (__DEV__) {
    console.log(
      `[KeywordCounter] "${keyword}" detected. Count: ${count}/${KEYWORD_TRIGGER_COUNT} in ${KEYWORD_TIME_WINDOW_MS}ms window`
    );
  }

  // ── Check trigger threshold ──
  if (count >= KEYWORD_TRIGGER_COUNT) {
    // TRIGGER SOS
    state.detections = []; // Clear detections
    state.lastTriggerTimestamp = now;
    state.isInCooldown = true;

    if (__DEV__) {
      console.log('[KeywordCounter] 🚨 SOS TRIGGERED by voice detection!');
    }

    return {
      triggered: true,
      keyword,
      detectionCount: count,
      timestamp: now,
    };
  }

  return {
    triggered: false,
    keyword,
    detectionCount: count,
    timestamp: now,
  };
}

/**
 * Get the current counter state (for UI display)
 */
export function getCounterState(): Readonly<KeywordCounterState> {
  // Prune before returning
  const now = Date.now();
  const windowStart = now - KEYWORD_TIME_WINDOW_MS;
  state.detections = state.detections.filter((d) => d.timestamp >= windowStart);
  return { ...state, detections: [...state.detections] };
}

/**
 * Get current detection count within the active time window
 */
export function getCurrentDetectionCount(): number {
  const now = Date.now();
  const windowStart = now - KEYWORD_TIME_WINDOW_MS;
  state.detections = state.detections.filter((d) => d.timestamp >= windowStart);
  return state.detections.length;
}

/**
 * Check if currently in cooldown period
 */
export function isInCooldown(): boolean {
  if (!state.isInCooldown || state.lastTriggerTimestamp === null) return false;
  const elapsed = Date.now() - state.lastTriggerTimestamp;
  if (elapsed >= SOS_COOLDOWN_MS) {
    state.isInCooldown = false;
    state.lastTriggerTimestamp = null;
    return false;
  }
  return true;
}

/**
 * Reset all counter state (e.g. when user manually stops SOS)
 */
export function resetCounter(): void {
  state = {
    detections: [],
    lastTriggerTimestamp: null,
    isInCooldown: false,
  };
  if (__DEV__) {
    console.log('[KeywordCounter] Counter reset.');
  }
}

/**
 * Force enter cooldown (e.g. after manual SOS to prevent voice re-trigger)
 */
export function enterCooldown(): void {
  state.isInCooldown = true;
  state.lastTriggerTimestamp = Date.now();
  state.detections = [];
}
