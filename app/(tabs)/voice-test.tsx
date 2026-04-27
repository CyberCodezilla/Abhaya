/**
 * Voice Testing Screen (Development Only)
 * ═══════════════════════════════════════════════════════
 * Add this route to test voice SOS without Picovoice
 *
 * HOW TO USE:
 * 1. Create app/(tabs)/voice-test.tsx and paste this file
 * 2. Add to tab navigator in app/(tabs)/_layout.tsx
 * 3. Enable voice protection in Settings
 * 4. Come to this screen and tap "Simulate Detection" 3 times
 * 5. SOS should trigger!
 */

import { COLORS } from '@/constants/config';
import { useEmergency } from '@/context/EmergencyContext';
import {
  getCounterState,
  getCurrentDetectionCount,
  isInCooldown,
  recordDetection,
  resetCounter,
  simulateDetection,
  triggerMockSOS,
} from '@/services/voice';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// Inline test utilities (avoids __tests__ directory which Metro excludes)
interface TestResult { name: string; passed: boolean; message: string; }
function runAllVoiceTests(): TestResult[] {
  const results: TestResult[] = [];
  resetCounter();
  const initial = getCounterState();
  results.push({ name: 'Counter starts at 0', passed: initial.detections.length === 0, message: `detections=${initial.detections.length}` });
  recordDetection('help', 0); recordDetection('help', 0); recordDetection('help', 0);
  results.push({ name: '3 detections trigger SOS', passed: isInCooldown(), message: isInCooldown() ? 'triggered ✅' : 'not triggered ❌' });
  resetCounter();
  results.push({ name: 'Reset clears counter', passed: getCurrentDetectionCount() === 0, message: `count=${getCurrentDetectionCount()}` });
  resetCounter();
  return results;
}


export default function VoiceTestScreen() {
  const { voiceProtection } = useEmergency();
  const [counterState, setCounterState] = useState(getCounterState());

  const refreshCounterState = () => {
    setCounterState(getCounterState());
  };

  const handleSimulateHelp = () => {
    if (!voiceProtection.isListening) {
      Alert.alert('Not Active', 'Enable voice protection in Settings first!');
      return;
    }
    simulateDetection('help');
    setTimeout(refreshCounterState, 100);
  };

  const handleSimulateBachao = () => {
    if (!voiceProtection.isListening) {
      Alert.alert('Not Active', 'Enable voice protection in Settings first!');
      return;
    }
    simulateDetection('bachao');
    setTimeout(refreshCounterState, 100);
  };

  const handleTriggerSOS = () => {
    if (!voiceProtection.isListening) {
      Alert.alert('Not Active', 'Enable voice protection in Settings first!');
      return;
    }
    Alert.alert(
      'Trigger SOS?',
      'This will simulate 3 rapid "help" detections and trigger an actual SOS alert.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Trigger SOS',
          style: 'destructive',
          onPress: () => {
            triggerMockSOS();
            setTimeout(refreshCounterState, 100);
          },
        },
      ]
    );
  };

  const handleResetCounter = () => {
    resetCounter();
    refreshCounterState();
  };

  const handleRunTests = () => {
    const results = runAllVoiceTests();
    const passed = results.filter((r) => r.passed).length;
    Alert.alert('Test Results', `${passed}/${results.length} tests passed. Check console for details.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🧪 Voice SOS Testing</Text>
      <Text style={styles.subtitle}>Mock Engine Test Interface</Text>

      {/* Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Engine:</Text>
          <Text style={[styles.value, { color: voiceProtection.isListening ? COLORS.SUCCESS : COLORS.TEXT_MUTED }]}>
            {voiceProtection.status}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Last Keyword:</Text>
          <Text style={styles.value}>{voiceProtection.lastDetectedKeyword || 'None'}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Detection Count:</Text>
          <Text style={[styles.value, styles.bold]}>
            {voiceProtection.currentDetectionCount}/3
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.label}>In Cooldown:</Text>
          <Text style={styles.value}>{counterState.isInCooldown ? 'Yes' : 'No'}</Text>
        </View>
      </View>

      {/* Instructions */}
      <View style={[styles.card, styles.infoCard]}>
        <Text style={styles.cardTitle}>📋 How to Test</Text>
        <Text style={styles.instruction}>1. Enable Voice Protection in Settings tab</Text>
        <Text style={styles.instruction}>2. Tap "Simulate Help" 3 times within 5 seconds</Text>
        <Text style={styles.instruction}>3. SOS will trigger automatically</Text>
        <Text style={styles.instruction}>4. Or use "Trigger SOS Now" for instant test</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonsGroup}>
        <Text style={styles.groupTitle}>Simulate Detections</Text>
        
        <Pressable
          style={[styles.button, styles.buttonHelp]}
          onPress={handleSimulateHelp}
        >
          <Text style={styles.buttonText}>🎤 Simulate "Help"</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonBachao]}
          onPress={handleSimulateBachao}
        >
          <Text style={styles.buttonText}>🎤 Simulate "Bachao"</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonTrigger]}
          onPress={handleTriggerSOS}
        >
          <Text style={styles.buttonText}>🚨 Trigger SOS Now (3×)</Text>
        </Pressable>
      </View>

      {/* Utility Buttons */}
      <View style={styles.buttonsGroup}>
        <Text style={styles.groupTitle}>Utilities</Text>
        
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleResetCounter}
        >
          <Text style={styles.buttonTextSecondary}>Reset Counter</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleRunTests}
        >
          <Text style={styles.buttonTextSecondary}>Run Automated Tests</Text>
        </Pressable>
      </View>

      {/* Warning */}
      <View style={styles.warningCard}>
        <Text style={styles.warningText}>
          ⚠️ "Trigger SOS Now" will send REAL emergency alerts to your contacts.
          Only use for testing when you've informed them.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 24,
  },
  card: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: COLORS.SECONDARY,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  value: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
  },
  bold: {
    fontWeight: '700',
  },
  instruction: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 6,
    lineHeight: 20,
  },
  buttonsGroup: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonHelp: {
    backgroundColor: COLORS.SUCCESS,
  },
  buttonBachao: {
    backgroundColor: COLORS.SECONDARY,
  },
  buttonTrigger: {
    backgroundColor: COLORS.PRIMARY,
  },
  buttonSecondary: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  warningCard: {
    backgroundColor: COLORS.WARNING + '20',
    borderWidth: 1,
    borderColor: COLORS.WARNING,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  warningText: {
    fontSize: 13,
    color: COLORS.WARNING,
    lineHeight: 19,
  },
});
