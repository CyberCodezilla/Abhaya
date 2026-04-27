/**
 * Permission Service
 * Centralized runtime permission handling for all app features.
 * Handles RECORD_AUDIO, LOCATION, CALL_PHONE, SEND_SMS, and battery optimization.
 */

import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

export interface AllPermissions {
  audio: PermissionStatus;
  locationForeground: PermissionStatus;
  locationBackground: PermissionStatus;
}

// ─────────────────────────────────────────────────────────
// AUDIO PERMISSION (RECORD_AUDIO)
// ─────────────────────────────────────────────────────────

/**
 * Request RECORD_AUDIO permission
 * Required for Porcupine wake-word detection
 * Uses react-native PermissionsAndroid
 */
export async function requestAudioPermission(): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') {
    return { granted: false, canAskAgain: false };
  }

  try {
    const { PermissionsAndroid } = require('react-native');
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Access Required',
        message:
          'ABHAYA needs microphone access to detect emergency keywords like "Help" and "Bachao" even when the screen is off. Audio is processed locally and never recorded or sent anywhere.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );

    return {
      granted: result === PermissionsAndroid.RESULTS.GRANTED,
      canAskAgain: result !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    };
  } catch (error) {
    console.error('[Permissions] Audio permission error:', error);
    return { granted: false, canAskAgain: true };
  }
}

/**
 * Check if RECORD_AUDIO is already granted
 */
export async function checkAudioPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const { PermissionsAndroid } = require('react-native');
    return await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────
// CALL_PHONE PERMISSION
// ─────────────────────────────────────────────────────────

/**
 * Request CALL_PHONE permission
 * Required for auto-initiating phone calls during SOS
 */
export async function requestCallPermission(): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') {
    return { granted: false, canAskAgain: false };
  }

  try {
    const { PermissionsAndroid } = require('react-native');
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CALL_PHONE,
      {
        title: 'Phone Call Permission',
        message:
          'ABHAYA needs permission to automatically call your emergency contact when SOS is triggered.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );

    return {
      granted: result === PermissionsAndroid.RESULTS.GRANTED,
      canAskAgain: result !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    };
  } catch (error) {
    console.error('[Permissions] Call permission error:', error);
    return { granted: false, canAskAgain: true };
  }
}

/**
 * Check if CALL_PHONE is already granted
 */
export async function checkCallPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const { PermissionsAndroid } = require('react-native');
    return await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CALL_PHONE
    );
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────
// SEND_SMS PERMISSION
// ─────────────────────────────────────────────────────────

/**
 * Request SEND_SMS permission
 * Required for sending SMS programmatically in background
 */
export async function requestSmsPermission(): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') {
    return { granted: false, canAskAgain: false };
  }

  try {
    const { PermissionsAndroid } = require('react-native');
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      {
        title: 'SMS Permission',
        message:
          'ABHAYA needs permission to send emergency SMS messages to your contacts when SOS is triggered.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );

    return {
      granted: result === PermissionsAndroid.RESULTS.GRANTED,
      canAskAgain: result !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    };
  } catch (error) {
    console.error('[Permissions] SMS permission error:', error);
    return { granted: false, canAskAgain: true };
  }
}

// ─────────────────────────────────────────────────────────
// LOCATION PERMISSIONS
// ─────────────────────────────────────────────────────────

/**
 * Request foreground location permission
 */
export async function requestForegroundLocation(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } =
      await Location.requestForegroundPermissionsAsync();
    return {
      granted: status === 'granted',
      canAskAgain,
    };
  } catch (error) {
    console.error('[Permissions] Foreground location error:', error);
    return { granted: false, canAskAgain: true };
  }
}

/**
 * Request background location permission (needed for location in foreground service)
 * NOTE: Must request foreground first, then background
 */
export async function requestBackgroundLocation(): Promise<PermissionStatus> {
  try {
    const { status, canAskAgain } =
      await Location.requestBackgroundPermissionsAsync();
    return {
      granted: status === 'granted',
      canAskAgain,
    };
  } catch (error) {
    console.error('[Permissions] Background location error:', error);
    return { granted: false, canAskAgain: true };
  }
}

// ─────────────────────────────────────────────────────────
// BATTERY OPTIMIZATION
// ─────────────────────────────────────────────────────────

/**
 * Request user to disable battery optimization for the app.
 * WHY: Android may kill foreground services if battery optimization is enabled.
 * This opens the system settings page for battery optimization.
 */
export function requestDisableBatteryOptimization(): void {
  if (Platform.OS !== 'android') return;

  Alert.alert(
    'Disable Battery Optimization',
    'For reliable background protection, please disable battery optimization for ABHAYA.\n\n' +
      'This ensures voice detection keeps running when the screen is off.',
    [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => {
          try {
            // Open battery optimization settings
            Linking.openSettings();
          } catch {
            console.warn('[Permissions] Could not open settings');
          }
        },
      },
    ]
  );
}

// ─────────────────────────────────────────────────────────
// REQUEST ALL PERMISSIONS
// ─────────────────────────────────────────────────────────

/**
 * Request all permissions needed for voice SOS in sequence.
 * Shows rationale for each permission.
 * Returns summary of what was granted.
 */
export async function requestAllVoiceSOSPermissions(): Promise<{
  audio: boolean;
  location: boolean;
  call: boolean;
  sms: boolean;
  allGranted: boolean;
}> {
  // 1. Audio (most critical for voice detection)
  const audio = await requestAudioPermission();

  // 2. Foreground location
  const fgLocation = await requestForegroundLocation();

  // 3. Background location (after foreground is granted)
  let bgLocation: PermissionStatus = { granted: false, canAskAgain: false };
  if (fgLocation.granted) {
    bgLocation = await requestBackgroundLocation();
  }

  // 4. Call permission
  const call = await requestCallPermission();

  // 5. SMS permission
  const sms = await requestSmsPermission();

  const result = {
    audio: audio.granted,
    location: fgLocation.granted,
    call: call.granted,
    sms: sms.granted,
    allGranted:
      audio.granted && fgLocation.granted && call.granted && sms.granted,
  };

  if (__DEV__) {
    console.log('[Permissions] All permissions result:', result);
  }

  return result;
}

/**
 * Check all permissions without requesting
 */
export async function checkAllPermissions(): Promise<{
  audio: boolean;
  location: boolean;
  call: boolean;
  allGranted: boolean;
}> {
  const [audio, call] = await Promise.all([
    checkAudioPermission(),
    checkCallPermission(),
  ]);

  let location = false;
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    location = status === 'granted';
  } catch {
    location = false;
  }

  return {
    audio,
    location,
    call,
    allGranted: audio && location && call,
  };
}

/**
 * Open app settings (when permission is permanently denied)
 */
export function openAppSettings(): void {
  Linking.openSettings();
}
