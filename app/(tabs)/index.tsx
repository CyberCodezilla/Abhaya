/**
 * Home Screen — Primary SOS Interface (v4 - Clean Professional UI)
 */

import { COLORS } from '@/constants/config';
import { ProgressStages } from '@/components/emergency';
import { useEmergency } from '@/context/EmergencyContext';
import {
  dialEmergencyNumber,
} from '@/services/nearby/nearbyService';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const SOS_BUTTON_SIZE = width * 0.55;

export default function HomeScreen() {
  const {
    sosState,
    startSOSCountdown,
    cancelSOS,
    deactivateSOS,
    isLocationPermissionGranted,
    requestLocationAccess,
    isSetupComplete,
    checkSetupStatus,
    alertSummary,
    emergencyStage,
    alertPackage,
    nearestPoliceStation,
    triggerManualFakeCall,
  } = useEmergency();

  const pulseAnim = useState(() => new Animated.Value(1))[0];

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    const setupComplete = await checkSetupStatus();
    if (!setupComplete) {
      router.replace('/setup' as any);
    }
  };

  useEffect(() => {
    if (sosState.status === 'countdown') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [sosState.status]);

  const requestPermissionWithPrompt = async () => {
    Alert.alert(
      'Location Access Required',
      'ABHAYA needs your location to send accurate emergency alerts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Allow',
          onPress: async () => {
            const granted = await requestLocationAccess();
            if (!granted) {
              Alert.alert('Permission Denied', 'Location access is required for SOS safety features.');
            }
          },
        },
      ]
    );
  };

  const handleSOSPress = () => {
    if (sosState.status === 'inactive') {
      startSOSCountdown();
    }
  };

  const handleCancelPress = () => {
    Alert.alert('Cancel SOS?', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', onPress: cancelSOS, style: 'destructive' },
    ]);
  };

  const handleStopSOS = () => {
    Alert.alert('Stop Emergency?', 'This will end the active SOS mode.', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Stop', onPress: deactivateSOS },
    ]);
  };

  if (sosState.status === 'countdown') {
    return (
      <View style={[styles.container, styles.countdownContainer]}>
        <StatusBar barStyle="light-content" />
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={[styles.sosButton, styles.sosButtonCountdown]}>
            <Text style={styles.countdownNumber}>{sosState.countdownSeconds}</Text>
            <Text style={styles.sosLabel}>SOS</Text>
          </View>
        </Animated.View>
        <Text style={styles.countdownStatus}>Activating Emergency Mode</Text>
        <Pressable style={styles.cancelButton} onPress={handleCancelPress}>
          <Text style={styles.cancelButtonText}>CANCEL</Text>
        </Pressable>
      </View>
    );
  }

  if (sosState.status === 'active') {
    return (
      <View style={[styles.container, styles.activeContainer]}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.activeScrollContent}>
          <ProgressStages currentStage={emergencyStage} />

          {nearestPoliceStation && (
            <View style={styles.policeCard}>
              <Text style={styles.policeCardLabel}>NEAREST POLICE STATION</Text>
              <Text style={styles.policeName}>{nearestPoliceStation.name}</Text>
              <Text style={styles.policeDistance}>Distance: ~{nearestPoliceStation.distanceKm?.toFixed(1)} km</Text>
              <Pressable 
                style={styles.inlineCallButton}
                onPress={() => dialEmergencyNumber(nearestPoliceStation.phone)}
              >
                <Text style={styles.inlineCallText}>Call Station: {nearestPoliceStation.phone}</Text>
              </Pressable>
            </View>
          )}

          {alertSummary && (
            <View style={styles.sentSummary}>
              <Text style={styles.sentTitle}>{alertSummary.successfulAlerts > 0 ? "Alerts Sent Successfully" : "Connection Error"}</Text>
              <Text style={styles.sentDetail}>
                {alertSummary.successfulAlerts > 0 
                  ? "Your location and status have been shared with your emergency contacts."
                  : "Could not reach the alert server. Please call emergency services directly."}
              </Text>
            </View>
          )}

          <View style={styles.quickCallContainer}>
             <Pressable style={styles.quickCallBtn} onPress={() => dialEmergencyNumber('112')}>
                <Text style={styles.quickCallNum}>112</Text>
                <Text style={styles.quickCallSub}>SOS</Text>
             </Pressable>
             <Pressable style={styles.quickCallBtn} onPress={() => dialEmergencyNumber('100')}>
                <Text style={styles.quickCallNum}>100</Text>
                <Text style={styles.quickCallSub}>Police</Text>
             </Pressable>
             <Pressable style={styles.quickCallBtn} onPress={() => dialEmergencyNumber('1091')}>
                <Text style={styles.quickCallNum}>1091</Text>
                <Text style={styles.quickCallSub}>Women</Text>
             </Pressable>
          </View>

          <Pressable style={styles.stopButton} onPress={handleStopSOS}>
            <Text style={styles.stopButtonText}>STOP SOS</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.inactiveContainer]}>
      <StatusBar barStyle="light-content" />
      
      {/* Floating Edit Button */}
      {isSetupComplete && (
        <Pressable
          style={styles.floatingEdit}
          onPress={() => router.push('/settings' as any)}
        >
          <Text style={styles.floatingEditText}>Manage Contacts</Text>
        </Pressable>
      )}
      <Text style={styles.mainTitle}>ABHAYA</Text>
      <Text style={styles.mainSubtitle}>Women Safety Application</Text>

      <Pressable style={styles.sosButton} onPress={handleSOSPress}>
        <Text style={styles.sosMainText}>SOS</Text>
        <Text style={styles.sosSubText}>EMERGENCY</Text>
      </Pressable>

      <Text style={styles.instructionText}>Tap to notify your loved ones</Text>
      <Text style={styles.voiceTriggerText}>Say "Porcupine" 1 time for Voice SOS</Text>

      <View style={styles.fakeCallSection}>
        <Text style={styles.fakeCallHeader}>STEALTH DECEPTION</Text>
        <View style={styles.fakeCallGrid}>
          <Pressable style={styles.deceptionBtn} onPress={() => triggerManualFakeCall('ios')}>
            <Text style={styles.deceptionBtnText}>iOS Style</Text>
          </Pressable>
          <Pressable style={styles.deceptionBtn} onPress={() => triggerManualFakeCall('samsung')}>
            <Text style={styles.deceptionBtnText}>Samsung Style</Text>
          </Pressable>
          <Pressable style={styles.deceptionBtn} onPress={() => triggerManualFakeCall('realme')}>
            <Text style={styles.deceptionBtnText}>Realme Style</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.helplineSection}>
        <Text style={styles.helplineHeader}>India Helplines</Text>
        <View style={styles.helplineRow}>
           {['112', '100', '1091', '1098'].map(num => (
             <Pressable key={num} style={styles.helplineChip} onPress={() => dialEmergencyNumber(num)}>
               <Text style={styles.chipText}>{num}</Text>
             </Pressable>
           ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
  inactiveContainer: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  countdownContainer: { alignItems: 'center', justifyContent: 'center' },
  activeContainer: { backgroundColor: '#0A0E12' },
  activeScrollContent: { padding: 20, alignItems: 'center' },

  mainTitle: { fontSize: 40, fontWeight: '900', color: COLORS.PRIMARY, letterSpacing: 5 },
  mainSubtitle: { fontSize: 13, color: COLORS.TEXT_SECONDARY, marginBottom: 40 },

  sosButton: {
    width: SOS_BUTTON_SIZE,
    height: SOS_BUTTON_SIZE,
    borderRadius: SOS_BUTTON_SIZE / 2,
    backgroundColor: COLORS.DANGER,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sosButtonCountdown: { backgroundColor: COLORS.WARNING },
  sosMainText: { fontSize: 44, fontWeight: '900', color: '#FFF', letterSpacing: 2 },
  sosSubText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  sosLabel: { fontSize: 16, color: '#FFF', fontWeight: 'bold' },
  
  instructionText: { fontSize: 14, color: COLORS.TEXT_SECONDARY, marginTop: 20, fontWeight: '600' },
  voiceTriggerText: { fontSize: 13, color: COLORS.PRIMARY, marginTop: 4, fontWeight: '700' },

  fakeCallSection: { marginTop: 40, width: '100%', alignItems: 'center' },
  fakeCallHeader: { fontSize: 10, fontWeight: '800', color: COLORS.TEXT_SECONDARY, letterSpacing: 2, marginBottom: 16 },
  fakeCallGrid: { flexDirection: 'row', gap: 10 },
  deceptionBtn: { 
    backgroundColor: '#2D3748', 
    paddingVertical: 12, 
    paddingHorizontal: 15, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  deceptionBtnText: { color: '#E2E8F0', fontSize: 10, fontWeight: 'bold' },

  helplineSection: { marginTop: 40, width: '100%', alignItems: 'center' },
  helplineHeader: { fontSize: 10, color: COLORS.TEXT_SECONDARY, marginBottom: 12, textTransform: 'uppercase' },
  helplineRow: { flexDirection: 'row', gap: 8 },
  helplineChip: { backgroundColor: '#1A202C', padding: 10, borderRadius: 8, minWidth: 60, alignItems: 'center' },
  chipText: { color: '#FFF', fontWeight: 'bold' },

  countdownNumber: { fontSize: 80, fontWeight: '900', color: '#FFF' },
  countdownStatus: { fontSize: 18, color: COLORS.WARNING, marginTop: 30, fontWeight: 'bold' },
  cancelButton: { marginTop: 40, padding: 15, backgroundColor: '#334155', borderRadius: 10 },
  cancelButtonText: { color: '#FFF', fontWeight: 'bold' },

  policeCard: { backgroundColor: '#1A202C', padding: 15, borderRadius: 15, width: '100%', marginBottom: 20, borderLeftWidth: 4, borderLeftColor: COLORS.PRIMARY },
  policeCardLabel: { fontSize: 9, color: COLORS.TEXT_SECONDARY, fontWeight: 'bold', marginBottom: 5 },
  policeName: { fontSize: 18, color: '#FFF', fontWeight: 'bold' },
  policeDistance: { fontSize: 12, color: COLORS.SUCCESS, marginTop: 4 },
  inlineCallButton: { backgroundColor: COLORS.PRIMARY, padding: 10, borderRadius: 10, marginTop: 12, alignItems: 'center' },
  inlineCallText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  sentSummary: { backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 15, borderRadius: 12, width: '100%', marginBottom: 20 },
  sentTitle: { color: COLORS.SUCCESS, fontSize: 16, fontWeight: 'bold' },
  sentDetail: { color: COLORS.TEXT_SECONDARY, fontSize: 12, marginTop: 4 },

  quickCallContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickCallBtn: { backgroundColor: '#2D3748', padding: 12, borderRadius: 12, alignItems: 'center', minWidth: 80 },
  quickCallNum: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  quickCallSub: { color: COLORS.TEXT_SECONDARY, fontSize: 9 },

  stopButton: { backgroundColor: '#334155', padding: 15, borderRadius: 12, width: '100%', alignItems: 'center' },
  stopButtonText: { color: '#FFF', fontWeight: 'bold' },

  floatingEdit: { position: 'absolute', top: 50, right: 20, backgroundColor: '#2D3748', padding: 10, borderRadius: 20 },
  floatingEditText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
});
