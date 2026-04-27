/**
 * Emergency Context (v3 - Simplified)
 * Global state management for SOS without API dependencies
 * 
 * SOS STATE MACHINE:
 * ═══════════════════════════════════════════════════════
 *   inactive → countdown → active (locating → preparing → 
 *   ready) → sending → active (tracking)
 * ═══════════════════════════════════════════════════════
 * 
 * CHANGES in v3:
 * - Removed nearby API search (uses Maps deep linking instead)
 * - Simpler 3-stage flow: locating → preparing → ready
 * - No waiting for API responses
 * - Faster SOS activation
 */

import { LOCATION_UPDATE_INTERVAL, SOS_COUNTDOWN_DURATION } from '@/constants/emergency.constants';
import { sendSOSAlerts } from '@/services/alerts/alertService';
import { startEvidenceRecording, stopEvidenceRecording } from '@/services/evidence/evidenceService';
import {
  getCurrentLocation,
  isLocationEnabled,
  requestLocationPermission,
} from '@/services/location/locationService';
import {
  buildAlertPackage,
  EmergencyAlertPackage,
  packageToSOSMessage,
} from '@/services/priority/priorityService';
import { findNearestPoliceStationsOffline, PoliceStation } from '@/services/nearby/offlineNearbyService';
import { startShakeDetection, stopShakeDetection } from '@/services/shake/shakeDetectionService';
import { sendSOSToAllContacts } from '@/services/sms/smsService';
import { logSOSActivation } from '@/services/sos/sosService';
import {
  getVoiceProtectionState,
  restartIfPreviouslyEnabled,
  startVoiceDetection,
  stopVoiceDetection,
} from '@/services/voice/voiceDetectionEngine';
import { AlertSummary } from '@/types/contact.types';
import { LocationData, SOSState } from '@/types/emergency.types';
import { VoiceProtectionState, VoiceSOSTriggerResult } from '@/types/voice.types';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// Simple stage tracking (no API calls)
export type EmergencyStage = 'locating' | 'preparing' | 'ready' | 'sending';

import { FakeCallUI, CallTheme } from '@/components/defense/FakeCallUI';
import { 
  stopFakeCall, 
  playRingtone, 
  playPoliceVoice 
} from '@/services/defense/fakeCallService';

interface EmergencyContextType {
  // Core SOS state
  sosState: SOSState;
  startSOSCountdown: () => void;
  cancelSOS: () => void;
  deactivateSOS: () => void;

  // Location permission
  isLocationPermissionGranted: boolean;
  requestLocationAccess: () => Promise<boolean>;

  // Alert results
  alertSummary: AlertSummary | null;

  // Setup
  isSetupComplete: boolean;
  checkSetupStatus: () => Promise<boolean>;

  // Emergency staging & alert package
  emergencyStage: EmergencyStage;
  alertPackage: EmergencyAlertPackage | null;
  nearestPoliceStation: PoliceStation | null;
  confirmSendAlerts: () => void;

  // Voice protection
  voiceProtection: VoiceProtectionState;
  startVoiceProtection: () => Promise<void>;
  stopVoiceProtection: () => Promise<void>;
  voiceSOSTriggered: boolean;

  // Fake Call
  isFakeCallUIActive: boolean;
  triggerManualFakeCall: (theme?: CallTheme) => void;
  acceptManualFakeCall: () => void;
  stopManualFakeCall: () => void;
}

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────
// INITIAL STATES
// ─────────────────────────────────────────────────────────

const INITIAL_SOS_STATE: SOSState = {
  status: 'inactive',
  activatedAt: null,
  location: null,
  countdownSeconds: SOS_COUNTDOWN_DURATION,
  lastLocationUpdate: null,
};

// ─────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────

export function EmergencyProvider({ children }: { children: React.ReactNode }) {
  // Core SOS state
  const [sosState, setSOSState] = useState<SOSState>(INITIAL_SOS_STATE);
  const [isLocationPermissionGranted, setIsLocationPermissionGranted] = useState(false);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  // Staging state (simplified)
  const [emergencyStage, setEmergencyStage] = useState<EmergencyStage>('locating');
  const [alertPackage, setAlertPackage] = useState<EmergencyAlertPackage | null>(null);
  const [nearestPoliceStation, setNearestPoliceStation] = useState<PoliceStation | null>(null);

  // Voice protection state
  const [voiceProtection, setVoiceProtection] = useState<VoiceProtectionState>(
    getVoiceProtectionState()
  );
  const [voiceSOSTriggered, setVoiceSOSTriggered] = useState(false);

  const [isFakeCallUIActive, setIsFakeCallUIActive] = useState(false);
  const [activeCallTheme, setActiveCallTheme] = useState<CallTheme>('stock');

  // Triggered when manual fake call button is pressed
  const triggerManualFakeCall = useCallback(async (theme: CallTheme = 'stock') => {
    setActiveCallTheme(theme);
    setIsFakeCallUIActive(true);
    await playRingtone(theme); // Start ringing immediately for manual trigger
  }, []);

  const acceptManualFakeCall = useCallback(async () => {
    await playPoliceVoice();
  }, []);

  const stopManualFakeCall = useCallback(async () => {
    setIsFakeCallUIActive(false);
    await stopFakeCall();
  }, []);

  // Timer refs (typed as number for React Native compat)
  const countdownTimerRef = useRef<number | null>(null);
  const locationTrackingRef = useRef<number | null>(null);
  const voiceStateIntervalRef = useRef<number | null>(null);
  const fakeCallTimerRef = useRef<number | null>(null);

  // ── Lifecycle ──

  useEffect(() => {
    checkInitialPermissions();
    checkSetupStatus();
    // Auto-restart voice detection if it was previously enabled
    restartIfPreviouslyEnabled(handleVoiceSOSTrigger);
    // Start shake detection — triggers SOS countdown on violent shake
    startShakeDetection(() => {
      console.log('[EmergencyContext] 📳 Shake detected — triggering SOS countdown');
      startSOSCountdown();
    });
    // Periodically refresh voice state for UI
    voiceStateIntervalRef.current = setInterval(() => {
      setVoiceProtection(getVoiceProtectionState());
    }, 3000) as any as number;

    return () => {
      stopShakeDetection();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current !== null) clearInterval(countdownTimerRef.current);
      if (locationTrackingRef.current !== null) clearInterval(locationTrackingRef.current);
      if (voiceStateIntervalRef.current !== null) clearInterval(voiceStateIntervalRef.current);
      if (fakeCallTimerRef.current !== null) clearTimeout(fakeCallTimerRef.current);
    };
  }, []);

  // ── Permission Checks ──

  const checkInitialPermissions = async () => {
    try {
      const { default: Location } = await import('expo-location');
      const { status } = await Location.getForegroundPermissionsAsync();
      setIsLocationPermissionGranted(status === 'granted');
    } catch {
      setIsLocationPermissionGranted(false);
    }
  };

  const checkSetupStatus = async (): Promise<boolean> => {
    try {
      const { getEmergencyContacts } = await import('@/services/contacts/contactsService');
      const result = await getEmergencyContacts();
      if (result.success && result.data.length > 0) {
        setIsSetupComplete(true);
        return true;
      }
      setIsSetupComplete(false);
      return false;
    } catch (error) {
      console.warn('Failed to check setup status:', error);
      setIsSetupComplete(false);
      return false;
    }
  };

  const requestLocationAccess = useCallback(async (): Promise<boolean> => {
    const enabled = await isLocationEnabled();
    if (!enabled) {
      console.warn('Location services are disabled on device');
      return false;
    }
    const result = await requestLocationPermission();
    if (result.success && result.data.granted) {
      setIsLocationPermissionGranted(true);
      return true;
    }
    setIsLocationPermissionGranted(false);
    return false;
  }, []);

  // ── Location Fetch ──

  const fetchCurrentLocation = async (): Promise<LocationData | null> => {
    const result = await getCurrentLocation();
    if (result.success) return result.data;
    console.warn('Failed to get location:', result.error);
    return null;
  };

  // ── SOS Countdown ──

  const startSOSCountdown = useCallback(() => {
    if (sosState.status !== 'inactive') return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Reset state
    setAlertPackage(null);
    setAlertSummary(null);
    setEmergencyStage('locating');

    setSOSState(prev => ({
      ...prev,
      status: 'countdown',
      countdownSeconds: SOS_COUNTDOWN_DURATION,
    }));

    startCountdownTimer();
  }, [sosState.status]);

  const startCountdownTimer = () => {
    let secondsLeft = SOS_COUNTDOWN_DURATION;
    const timerId = setInterval(() => {
      secondsLeft -= 1;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSOSState(prev => ({ ...prev, countdownSeconds: secondsLeft }));

      if (secondsLeft <= 0) {
        if (countdownTimerRef.current !== null) {
          clearInterval(countdownTimerRef.current);
        }
        activateSOS();
      }
    }, 1000);
    countdownTimerRef.current = timerId as any as number;
  };

  // ── Cancel Countdown ──

  const cancelSOS = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (fakeCallTimerRef.current !== null) {
      clearTimeout(fakeCallTimerRef.current);
      fakeCallTimerRef.current = null;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSOSState(INITIAL_SOS_STATE);
    setAlertSummary(null);
    setAlertPackage(null);
    setEmergencyStage('locating');
    setIsFakeCallUIActive(false);
    stopFakeCall();
  }, []);

  // ── SOS Activation (Simplified 3-stage flow) ──

  const activateSOS = useCallback(async () => {
    // Strong haptic confirmation
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Keep screen awake
    try {
      await activateKeepAwakeAsync();
    } catch (error) {
      console.warn('Failed to keep screen awake:', error);
    }

    // ── STAGE 1: LOCATING ──
    setEmergencyStage('locating');
    const location = await fetchCurrentLocation();

    // ── Update Offline Police Station ──
    let localNearest: PoliceStation | null = null;
    if (location) {
      const nearby = findNearestPoliceStationsOffline(location, 1);
      if (nearby.length > 0) {
        localNearest = nearby[0];
        setNearestPoliceStation(localNearest);
      }
    }

    const now = Date.now();
    setSOSState({
      status: 'active',
      activatedAt: now,
      location,
      countdownSeconds: 0,
      lastLocationUpdate: location ? now : null,
    });

    logSOSActivation(location, 'button');

    // ── STAGE 2: PREPARING ALERT ──
    setEmergencyStage('preparing');

    let pkg: EmergencyAlertPackage | null = null;
    try {
      pkg = await buildAlertPackage(location);
      // Ensure we keep our freshly found nearest PS
      if (pkg) pkg.nearestPoliceStation = localNearest;
      setAlertPackage(pkg);
    } catch (error) {
      console.warn('Failed to build alert package:', error);
      // Create minimal package so user can still send
      setAlertPackage({
        message: '🚨 EMERGENCY SOS — ABHAYA 🚨\nI am in danger and need IMMEDIATE HELP!',
        userLocationLink: location
          ? `https://maps.google.com/?q=${location.latitude},${location.longitude}`
          : '',
        timestamp: now,
        address: null,
        personalContacts: [],
        nearestPoliceStation: null,
        isReady: true,
      });
    }

    // ── STAGE 3: READY ──
    setEmergencyStage('ready');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Start background location tracking
    startLocationTracking();

    // ── STAGE 4: AUTOMATIC FIRE (Silent Backend SMS) ──
    // Automatically trigger the alert sending immediately.
    // We avoid standard React state dependency delays by calling a localized execute function.
    try {
      const sosMessage = packageToSOSMessage(pkg || {
        message: '🚨 EMERGENCY SOS — ABHAYA 🚨\nI am in danger and need IMMEDIATE HELP!',
        userLocationLink: location ? `https://maps.google.com/?q=${location.latitude},${location.longitude}` : '',
        timestamp: now,
        address: null,
        personalContacts: [],
        nearestPoliceStation: null,
        isReady: true,
      }, location);

      setEmergencyStage('sending');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      const [alertResult] = await Promise.allSettled([
        sendSOSToAllContacts(sosMessage.text),
        startEvidenceRecording(),
      ]);

      if (alertResult.status === 'fulfilled' && alertResult.value.success) {
        setAlertSummary({
          totalContacts: 1,
          successfulAlerts: alertResult.value.sent,
          failedAlerts: alertResult.value.failed,
          results: [],
          sosActivatedAt: sosMessage.timestamp
        });

        // 📞 AUTO-OPEN PHONE DIALER (PRIORITY: NEAREST POLICE STATION)
        try {
          const { Linking } = require('react-native');
          
          // Use the nearest offline police station number found during the locating phase
          if (localNearest && localNearest.phone) {
            console.log(`[EmergencyContext] Auto-dialing Nearest Police Station: ${localNearest.name} (${localNearest.phone})`);
            Linking.openURL(`tel:${localNearest.phone}`);
          } else {
            // Fallback to Pan-India Emergency Number
            console.log('[EmergencyContext] Nearest Police Phone unavailable. Auto-dialing 112 fallback.');
            Linking.openURL('tel:112');
          }
        } catch (err) {
          console.warn('[EmergencyContext] Failed to auto-dial nearest police station', err);
        }

        // 📞 AUTO-TRIGGER FAKE CALL AFTER 15 SECONDS (DECEPTION DEFENSE)
        fakeCallTimerRef.current = setTimeout(() => {
          console.log('[EmergencyContext] 🚔 Triggering automatic deception fake call...');
          triggerManualFakeCall('ios');
        }, 15_000) as any as number;

      } else {
        console.error('[EmergencyContext] Backend SMS failed or none sent:', alertResult);
        setAlertSummary({
          totalContacts: 1,
          successfulAlerts: 0,
          failedAlerts: 1,
          results: [],
          sosActivatedAt: sosMessage.timestamp
        });
      }
    } catch (err) {
      console.error('[EmergencyContext] Automatic alert sending failed:', err);
    }
  }, []);

  // ── User Confirms Send (Manual Backup) ──

  const confirmSendAlerts = useCallback(async () => {
    if (!alertPackage) return;

    setEmergencyStage('sending');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      // Convert package to SOSMessage format
      const sosMessage = packageToSOSMessage(alertPackage, sosState.location);

      // Run automatic background tasks ONLY (no native app popups):
      // 1. New Twilio SMS via backend (silent & automatic)
      // 2. Start stealth evidence recording
      const [alertResult] = await Promise.allSettled([
        sendSOSToAllContacts(sosMessage.text),
        startEvidenceRecording(),
      ]);

      if (alertResult.status === 'fulfilled' && alertResult.value.success) {
        setAlertSummary({
          totalContacts: 1, // Placeholder summary, as exact count depends on backend
          successfulAlerts: alertResult.value.sent,
          failedAlerts: alertResult.value.failed,
          results: [],
          sosActivatedAt: sosMessage.timestamp
        });
        console.log('[EmergencyContext] Backend SMS sent:', alertResult.value);
      } else {
        console.error('[EmergencyContext] Backend SMS failed');
      }
    } catch (error) {
      console.error('Error sending backend alerts:', error);
    }
  }, [alertPackage, sosState.location]);

  // ── Location Tracking ──

  const startLocationTracking = () => {
    const timerId = setInterval(async () => {
      const location = await fetchCurrentLocation();
      if (location) {
        setSOSState(prev => ({
          ...prev,
          location,
          lastLocationUpdate: Date.now(),
        }));
      }
    }, LOCATION_UPDATE_INTERVAL);
    locationTrackingRef.current = timerId as any as number;
  };

  // ── Deactivate SOS ──

  const deactivateSOS = useCallback(() => {
    if (locationTrackingRef.current !== null) {
      clearInterval(locationTrackingRef.current);
      locationTrackingRef.current = null;
    }

    try {
      deactivateKeepAwake();
    } catch (error) {
      console.warn('Failed to deactivate keep awake:', error);
    }

    if (fakeCallTimerRef.current !== null) {
      clearTimeout(fakeCallTimerRef.current);
      fakeCallTimerRef.current = null;
    }

    // Stop evidence recording when SOS ends
    stopEvidenceRecording().catch(() => { });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Reset all state
    setSOSState(INITIAL_SOS_STATE);
    setAlertSummary(null);
    setAlertPackage(null);
    setEmergencyStage('locating');
    setVoiceSOSTriggered(false);

    if (__DEV__) {
      console.log('SOS deactivated by user');
    }
  }, []);

  // ── Voice Protection ──

  /**
   * Handle voice SOS trigger from Porcupine engine
   * Called when keyword counter reaches threshold
   */
  const handleVoiceSOSTrigger = useCallback(async (result: VoiceSOSTriggerResult) => {
    if (__DEV__) {
      console.log('🎤 Voice SOS trigger received — unifying with countdown workflow');
    }

    setVoiceSOSTriggered(true);

    // UNIFIED WORKFLOW: 
    // Trigger the same countdown and SOS cycle as the Shake detection
    startSOSCountdown();
    
    // Vibrate to confirm detection
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [startSOSCountdown]);

  /**
   * Start voice protection (called from UI after consent)
   */
  const startVoiceProtection = useCallback(async () => {
    try {
      await startVoiceDetection(handleVoiceSOSTrigger);
      setVoiceProtection(getVoiceProtectionState());
    } catch (error) {
      console.error('Failed to start voice protection:', error);
      setVoiceProtection(getVoiceProtectionState());
      throw error;
    }
  }, [handleVoiceSOSTrigger]);

  /**
   * Stop voice protection
   */
  const stopVoiceProtection = useCallback(async () => {
    try {
      await stopVoiceDetection();
      setVoiceProtection(getVoiceProtectionState());
    } catch (error) {
      console.error('Failed to stop voice protection:', error);
      setVoiceProtection(getVoiceProtectionState());
    }
  }, []);

  // ── Context Value ──

  const value: EmergencyContextType = {
    sosState,
    startSOSCountdown,
    cancelSOS,
    deactivateSOS,
    isLocationPermissionGranted,
    requestLocationAccess,
    alertSummary,
    isSetupComplete,
    checkSetupStatus,
    emergencyStage,
    alertPackage,
    nearestPoliceStation,
    confirmSendAlerts,
    voiceProtection,
    startVoiceProtection,
    stopVoiceProtection,
    voiceSOSTriggered,
    isFakeCallUIActive,
    triggerManualFakeCall,
    acceptManualFakeCall,
    stopManualFakeCall,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
        <FakeCallUI
          isVisible={isFakeCallUIActive}
          callerName="Papa"
          callerNumber="+91 98765 43210"
          theme={activeCallTheme}
          onAccept={acceptManualFakeCall}
          onDecline={stopManualFakeCall}
        />
    </EmergencyContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────

export function useEmergency() {
  const context = useContext(EmergencyContext);
  if (context === undefined) {
    throw new Error('useEmergency must be used within EmergencyProvider');
  }
  return context;
}
