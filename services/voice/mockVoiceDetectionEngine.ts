/**
 * Mock Voice Detection Engine
 * ═══════════════════════════════════════════════════════
 * Development-only mock for testing voice SOS without Picovoice.
 * Uses manual keyword simulation via button presses.
 *
 * USAGE: Set USE_MOCK_ENGINE = true in voice.constants.ts
 */

import { STORAGE_KEYS } from '@/constants/config';
import { getCurrentDetectionCount, recordDetection, resetCounter } from '@/services/voice/keywordCounterService';
import { VoiceEngineStatus, VoiceProtectionState, VoiceSOSTriggerResult } from '@/types/voice.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

// ─────────────────────────────────────────────────────────
// MODULE STATE
// ─────────────────────────────────────────────────────────

let engineStatus: VoiceEngineStatus = 'idle';
let onSOSTriggerCallback: ((result: VoiceSOSTriggerResult) => void) | null = null;
let lastDetectedKeyword: string | null = null;
let isUserEnabled: boolean = false;

const AbhayaForegroundService = NativeModules.AbhayaForegroundService;

// ─────────────────────────────────────────────────────────
// MOCK ENGINE API
// ─────────────────────────────────────────────────────────

/**
 * Start mock voice detection (just starts foreground service)
 */
export async function startMockVoiceDetection(
  onSOSTrigger: (result: VoiceSOSTriggerResult) => void
): Promise<void> {
  if (Platform.OS !== 'android') {
    console.warn('[MockVoiceEngine] Voice detection only supported on Android');
    return;
  }

  if (engineStatus === 'listening') {
    console.log('[MockVoiceEngine] Already listening');
    return;
  }

  onSOSTriggerCallback = onSOSTrigger;
  engineStatus = 'initializing';

  try {
    // Start the native foreground service (notification will show)
    if (AbhayaForegroundService) {
      await AbhayaForegroundService.startService();
      if (__DEV__) console.log('[MockVoiceEngine] Foreground service started');
    }

    engineStatus = 'listening';
    isUserEnabled = true;

    await AsyncStorage.setItem(STORAGE_KEYS.VOICE_TRIGGER_ENABLED, 'true');

    console.log('[MockVoiceEngine] ✅ Mock voice detection started (use simulateDetection() to test)');
  } catch (error) {
    engineStatus = 'error';
    console.error('[MockVoiceEngine] Failed to start:', error);
    throw error;
  }
}

/**
 * Stop mock voice detection
 */
export async function stopMockVoiceDetection(): Promise<void> {
  try {
    if (AbhayaForegroundService) {
      await AbhayaForegroundService.stopService();
    }

    engineStatus = 'stopped';
    isUserEnabled = false;
    lastDetectedKeyword = null;
    resetCounter();

    await AsyncStorage.setItem(STORAGE_KEYS.VOICE_TRIGGER_ENABLED, 'false');

    console.log('[MockVoiceEngine] Mock voice detection stopped');
  } catch (error) {
    console.error('[MockVoiceEngine] Error stopping:', error);
    engineStatus = 'error';
  }
}

/**
 * Get current state
 */
export function getMockVoiceProtectionState(): VoiceProtectionState {
  return {
    status: engineStatus,
    isListening: engineStatus === 'listening',
    isEnabled: isUserEnabled,
    errorMessage: engineStatus === 'error' ? 'Mock engine encountered an error' : null,
    lastDetectedKeyword,
    currentDetectionCount: getCurrentDetectionCount(),
  };
}

/**
 * Check if enabled
 */
export async function wasMockVoiceDetectionEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_TRIGGER_ENABLED);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Restart if previously enabled
 */
export async function restartMockIfPreviouslyEnabled(
  onSOSTrigger: (result: VoiceSOSTriggerResult) => void
): Promise<void> {
  const wasEnabled = await wasMockVoiceDetectionEnabled();
  if (wasEnabled) {
    console.log('[MockVoiceEngine] Restarting — was previously enabled');
    await startMockVoiceDetection(onSOSTrigger);
  }
}

/**
 * TESTING: Manually simulate a keyword detection
 * Call this from anywhere in your app to test SOS trigger
 */
export function simulateDetection(keyword: string = 'help'): void {
  if (!isUserEnabled) {
    console.warn('[MockVoiceEngine] Not enabled. Start voice protection first.');
    return;
  }

  const keywordIndex = keyword === 'bachao' ? 1 : 0;
  lastDetectedKeyword = keyword;

  console.log(`[MockVoiceEngine] 🎤 Simulated detection: "${keyword}"`);

  const result = recordDetection(keyword, keywordIndex);

  if (result.triggered && onSOSTriggerCallback) {
    console.log('[MockVoiceEngine] 🚨 SOS TRIGGERED by simulation!');
    onSOSTriggerCallback(result);
  }
}

/**
 * TESTING: Trigger SOS immediately (3 rapid detections)
 */
export function triggerMockSOS(): void {
  console.log('[MockVoiceEngine] Triggering mock SOS...');
  simulateDetection('help');
  simulateDetection('help');
  simulateDetection('help');
}
