/**
 * VoiceProtectionToggle
 * ═══════════════════════════════════════════════════════
 * UI component for enabling/disabling voice protection.
 * Shows status, detection count, and provides toggle control.
 *
 * Used in Settings screen.
 */

import { COLORS } from '@/constants/config';
import {
    checkAudioPermission,
    requestAudioPermission,
    requestDisableBatteryOptimization,
} from '@/services/permissions/permissionService';
import {
    getVoiceProtectionState,
    startVoiceDetection,
    stopVoiceDetection
} from '@/services/voice/voiceDetectionEngine';
import { useEmergency } from '@/context/EmergencyContext';
import { VoiceProtectionState } from '@/types/voice.types';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import VoiceProtectionConsent from './VoiceProtectionConsent';

export default function VoiceProtectionToggle() {
  const [state, setState] = useState<VoiceProtectionState>(
    getVoiceProtectionState()
  );
  const [loading, setLoading] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const { startSOSCountdown } = useEmergency();

  // Refresh state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setState(getVoiceProtectionState());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = useCallback(async () => {
    if (state.isListening) {
      // Disable
      setLoading(true);
      try {
        await stopVoiceDetection();
        setState(getVoiceProtectionState());
      } catch (error) {
        Alert.alert('Error', 'Failed to stop voice protection');
      }
      setLoading(false);
    } else {
      // Show consent first
      setShowConsent(true);
    }
  }, [state.isListening]);

  const handleConsentAccept = useCallback(async () => {
    setShowConsent(false);
    setLoading(true);

    try {
      // Check/request audio permission
      const hasAudio = await checkAudioPermission();
      if (!hasAudio) {
        const result = await requestAudioPermission();
        if (!result.granted) {
          Alert.alert(
            'Permission Required',
            'Microphone access is required for voice protection. Please enable it in app settings.'
          );
          setLoading(false);
          return;
        }
      }

      // Start voice detection
      await startVoiceDetection(async (triggerResult) => {
        // This callback fires when SOS is triggered by voice
        console.log('🚨 Voice SOS triggered!', triggerResult);
        
        // This hooks directly into the Global UI exactly like Shake detection does!
        startSOSCountdown();
      });

      setState(getVoiceProtectionState());

      // Suggest disabling battery optimization
      requestDisableBatteryOptimization();
    } catch (error) {
      Alert.alert(
        'Failed to Start',
        `Voice protection could not be started: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    setLoading(false);
  }, []);

  const handleConsentDecline = useCallback(() => {
    setShowConsent(false);
  }, []);

  const getStatusColor = () => {
    switch (state.status) {
      case 'listening':
        return COLORS.SUCCESS;
      case 'error':
        return COLORS.PRIMARY;
      case 'initializing':
        return COLORS.WARNING;
      default:
        return COLORS.TEXT_MUTED;
    }
  };

  const getStatusText = () => {
    switch (state.status) {
      case 'listening':
        return 'Active — Listening for keywords';
      case 'error':
        return state.errorMessage || 'Error occurred';
      case 'initializing':
        return 'Starting up...';
      case 'stopped':
        return 'Disabled';
      default:
        return 'Not started';
    }
  };

  return (
    <>
      <View style={styles.container}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.titleArea}>
            <Text style={styles.icon}>🎤</Text>
            <View>
              <Text style={styles.title}>Voice Protection</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor() },
                  ]}
                />
                <Text
                  style={[styles.statusText, { color: getStatusColor() }]}
                >
                  {getStatusText()}
                </Text>
              </View>
            </View>
          </View>

          {/* Toggle Button */}
          <Pressable
            style={[
              styles.toggleButton,
              state.isListening
                ? styles.toggleActive
                : styles.toggleInactive,
              loading && styles.toggleDisabled,
            ]}
            onPress={handleToggle}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.toggleText}>
                {state.isListening ? 'ON' : 'OFF'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Detection Info (when active) */}
        {state.isListening && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              Detects: <Text style={styles.infoBold}>"Porcupine"</Text> (Built-in keyword)
            </Text>
            <Text style={styles.infoDetail}>
              Just say it ONCE to trigger automatic SOS
            </Text>
            {state.lastDetectedKeyword && (
              <Text style={styles.lastDetection}>
                Last: "{state.lastDetectedKeyword}" (
                {state.currentDetectionCount}/3)
              </Text>
            )}
          </View>
        )}

        {/* Info when inactive */}
        {!state.isListening && !loading && (
          <Text style={styles.inactiveInfo}>
            Enable to automatically trigger SOS when emergency keywords are
            detected, even with screen off.
          </Text>
        )}
      </View>

      {/* Consent Modal */}
      <Modal
        visible={showConsent}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <VoiceProtectionConsent
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 28,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  toggleButton: {
    width: 56,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: COLORS.SUCCESS,
  },
  toggleInactive: {
    backgroundColor: COLORS.BACKGROUND_LIGHT,
  },
  toggleDisabled: {
    opacity: 0.6,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
  },
  infoBold: {
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  infoDetail: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 4,
  },
  lastDetection: {
    fontSize: 12,
    color: COLORS.WARNING,
    marginTop: 6,
    fontWeight: '600',
  },
  inactiveInfo: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginTop: 10,
    lineHeight: 18,
  },
});
