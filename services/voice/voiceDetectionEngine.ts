/**
 * Voice Detection Engine
 * ═══════════════════════════════════════════════════════
 * Wraps @picovoice/porcupine-react-native for offline wake-word detection.
 *
 * ARCHITECTURE:
 * - Initializes Porcupine with custom keyword model ("Help Help Help")
 * - Runs via Android Foreground Service (AbhayaForegroundService.kt)
 * - Detections feed into KeywordCounterService (Layer 2)
 * - When counter triggers SOS → calls the registered callback + vibrates
 *
 * KEYWORD FILE:
 * - android/app/src/main/assets/porcupine/help_android.ppn
 * - Trained phrase: "Help Help Help" (3x repetition reduces false positives)
 * - Until .ppn file is available, set USE_MOCK_ENGINE = true in voice.constants.ts
 *
 * STATE PERSISTENCE:
 * - Uses MMKV (synchronous) instead of AsyncStorage for crash-proof state.
 */

import { STORAGE_KEYS } from '@/constants/config';
import {
  PICOVOICE_ACCESS_KEY,
  PORCUPINE_SENSITIVITY,
  USE_MOCK_ENGINE,
} from '@/constants/voice.constants';
import {
  getCurrentDetectionCount,
  recordDetection,
  resetCounter,
} from '@/services/voice/keywordCounterService';
import { VoiceEngineStatus, VoiceProtectionState, VoiceSOSTriggerResult } from '@/types/voice.types';
import { NativeModules, Platform, Vibration } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import * as MockEngine from './mockVoiceDetectionEngine';

// ─── MMKV Storage (Synchronous) ───────────────────────────────────────────────

const voiceStorage = createMMKV({ id: 'voice-engine' });

// ─── Module State ─────────────────────────────────────────────────────────────

let engineStatus: VoiceEngineStatus = 'idle';
let porcupineManager: any = null;
let onSOSTriggerCallback: ((result: VoiceSOSTriggerResult) => void) | null = null;
let lastDetectedKeyword: string | null = null;
let isUserEnabled: boolean = false;

// Keyword labels — must match the ORDER of keyword files passed to Porcupine
// Trained phrase: "Porcupine"
const KEYWORD_LABELS = ['Porcupine'];

// ─── Native Module Bridge ─────────────────────────────────────────────────────

const AbhayaForegroundService = NativeModules.AbhayaForegroundService;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves the path to a .ppn keyword file in the Android assets folder.
 * Porcupine on Android reads from the assets directory directly.
 */
function getKeywordAssetPath(filename: string): string {
  // On Android, assets are accessed via the asset path directly.
  // PorcupineManager.fromKeywordPaths() accepts asset-relative paths.
  return `porcupine/${filename}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialize and start the Porcupine wake-word detection engine.
 * Also starts the Android foreground service to keep mic alive.
 *
 * @param onSOSTrigger  Callback invoked when keyword counter triggers SOS
 */
export async function startVoiceDetection(
  onSOSTrigger: (result: VoiceSOSTriggerResult) => void
): Promise<void> {
  // Use mock engine in development (no Picovoice key needed)
  if (USE_MOCK_ENGINE) {
    console.log('[VoiceEngine] 🧪 Using MOCK engine');
    await MockEngine.startMockVoiceDetection(onSOSTrigger);
    return;
  }

  if (Platform.OS !== 'android') {
    console.warn('[VoiceEngine] Voice detection only supported on Android');
    return;
  }

  if (engineStatus === 'listening') {
    console.log('[VoiceEngine] Already listening');
    return;
  }

  onSOSTriggerCallback = onSOSTrigger;
  engineStatus = 'initializing';

  try {
    // Step 1: Start the native foreground service (keeps mic alive in background)
    if (AbhayaForegroundService?.startService) {
      await AbhayaForegroundService.startService();
      console.log('[VoiceEngine] ✅ Foreground service started');
    } else {
      console.warn('[VoiceEngine] ⚠️ AbhayaForegroundService native module not found. ' +
        'Run `eas build` to compile native modules.');
    }

    // Step 2: Initialize Porcupine with pre-compiled Built-In keywords
    const { PorcupineManager, BuiltInKeywords } = require('@picovoice/porcupine-react-native');

    // We use the BuiltIn 'PORCUPINE' keyword because it's pre-compiled in the SDK. 
    // This beautifully bypasses the need for custom .ppn file training and EAS 45-minute Cloud Builds!
    porcupineManager = await PorcupineManager.fromBuiltInKeywords(
      PICOVOICE_ACCESS_KEY,
      [BuiltInKeywords.PORCUPINE],
      (keywordIndex: number) => {
        handleKeywordDetection(keywordIndex);
      },
      (error: any) => {
        console.error('[VoiceEngine] Processing error:', error);
        engineStatus = 'error';
      },
      undefined,               // modelPath — use default
      [PORCUPINE_SENSITIVITY]  // sensitivities
    );

    // Step 3: Start audio processing
    await porcupineManager.start();
    engineStatus = 'listening';
    isUserEnabled = true;

    // Persist enabled state synchronously (MMKV — crash-proof)
    voiceStorage.set(STORAGE_KEYS.VOICE_TRIGGER_ENABLED, 'true');

    console.log('[VoiceEngine] ✅ REAL Native Voice detection started — listening for "Porcupine"');
  } catch (error: any) {
    engineStatus = 'error';
    const msg = error?.message || String(error);

    // Provide actionable error messages
    if (msg.includes('ppn') || msg.includes('keyword')) {
      console.error(
        '[VoiceEngine] ❌ Keyword file not found!\n' +
        'ACTION REQUIRED:\n' +
        '  1. Ensure help_android.ppn is in: android/app/src/main/assets/porcupine/\n' +
        '  2. Run `eas build` to rebuild\n' +
        'OR set USE_MOCK_ENGINE = true in voice.constants.ts for development.'
      );
    } else if (msg.includes('AccessKey') || msg.includes('access_key')) {
      console.error(
        '[VoiceEngine] ❌ Invalid Picovoice Access Key!\n' +
        'ACTION REQUIRED:\n' +
        '  1. Go to https://console.picovoice.ai/\n' +
        '  2. Copy your AccessKey\n' +
        '  3. Paste it in constants/voice.constants.ts → PICOVOICE_ACCESS_KEY'
      );
    } else {
      console.error('[VoiceEngine] Failed to start:', msg);
    }

    throw error;
  }
}

/**
 * Stop the voice detection engine and foreground service.
 */
export async function stopVoiceDetection(): Promise<void> {
  if (USE_MOCK_ENGINE) {
    await MockEngine.stopMockVoiceDetection();
    return;
  }

  try {
    if (porcupineManager) {
      await porcupineManager.stop();
      await porcupineManager.delete();
      porcupineManager = null;
    }

    if (AbhayaForegroundService?.stopService) {
      await AbhayaForegroundService.stopService();
    }

    engineStatus = 'stopped';
    isUserEnabled = false;
    lastDetectedKeyword = null;
    resetCounter();

    // Persist state synchronously
    voiceStorage.set(STORAGE_KEYS.VOICE_TRIGGER_ENABLED, 'false');

    console.log('[VoiceEngine] Voice detection stopped');
  } catch (error) {
    console.error('[VoiceEngine] Error stopping:', error);
    engineStatus = 'error';
  }
}

/**
 * Get current voice protection state for UI display.
 */
export function getVoiceProtectionState(): VoiceProtectionState {
  if (USE_MOCK_ENGINE) {
    return MockEngine.getMockVoiceProtectionState();
  }

  return {
    status: engineStatus,
    isListening: engineStatus === 'listening',
    isEnabled: isUserEnabled,
    errorMessage: engineStatus === 'error' ? 'Voice detection encountered an error' : null,
    lastDetectedKeyword,
    currentDetectionCount: getCurrentDetectionCount(),
  };
}

/**
 * Check if voice detection was previously enabled.
 * Used to auto-restart on app launch (reads from MMKV synchronously).
 */
export function wasVoiceDetectionEnabled(): boolean {
  if (USE_MOCK_ENGINE) return false;
  return voiceStorage.getString(STORAGE_KEYS.VOICE_TRIGGER_ENABLED) === 'true';
}

/**
 * Restart engine if it was previously running (e.g., after app restart or boot).
 */
export async function restartIfPreviouslyEnabled(
  onSOSTrigger: (result: VoiceSOSTriggerResult) => void
): Promise<void> {
  if (USE_MOCK_ENGINE) {
    await MockEngine.restartMockIfPreviouslyEnabled(onSOSTrigger);
    return;
  }

  if (wasVoiceDetectionEnabled()) {
    console.log('[VoiceEngine] Restarting — was previously enabled');
    await startVoiceDetection(onSOSTrigger);
  }
}

// ─── Private ──────────────────────────────────────────────────────────────────

/**
 * Handle a keyword detection event from Porcupine.
 * Feeds into the counter service. If threshold is met → trigger SOS + vibrate.
 */
function handleKeywordDetection(keywordIndex: number): void {
  const keyword = KEYWORD_LABELS[keywordIndex] ?? `keyword_${keywordIndex}`;
  lastDetectedKeyword = keyword;

  console.log(`[VoiceEngine] 🎤 Detected: "${keyword}"`);

  // Force a tiny 100ms vibrate so user knows it's detected
  Vibration.vibrate(100);

  // Feed into keyword counter (requires N detections within time window)
  const result = recordDetection(keyword, keywordIndex);

  if (result.triggered && onSOSTriggerCallback) {
    console.log('[VoiceEngine] 🚨 SOS TRIGGERED by voice!');

    // Vibrate for 10 seconds as haptic confirmation
    Vibration.vibrate(10000);

    onSOSTriggerCallback(result);
  }
}
