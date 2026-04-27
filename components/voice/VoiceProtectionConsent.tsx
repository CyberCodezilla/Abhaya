/**
 * VoiceProtectionConsent
 * ═══════════════════════════════════════════════════════
 * User consent screen required before enabling voice detection.
 *
 * PLAY STORE COMPLIANCE:
 * - Clear explanation of background microphone usage
 * - Explicit user consent required
 * - Shows what data is collected (none — audio processed locally)
 * - Link to privacy policy
 * - Option to enable/disable at any time
 */

import { COLORS } from '@/constants/config';
import React, { useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface VoiceProtectionConsentProps {
  onAccept: () => void;
  onDecline: () => void;
}

export default function VoiceProtectionConsent({
  onAccept,
  onDecline,
}: VoiceProtectionConsentProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleAccept = () => {
    if (!acknowledged) {
      Alert.alert(
        'Please Acknowledge',
        'You must check the acknowledgement box before enabling voice protection.'
      );
      return;
    }
    onAccept();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.iconLarge}>🎤</Text>
        <Text style={styles.title}>Voice Protection</Text>
        <Text style={styles.subtitle}>
          Background voice-triggered SOS system
        </Text>
      </View>

      {/* Explanation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>
            🔊 ABHAYA listens for emergency keywords like{' '}
            <Text style={styles.bold}>"Help"</Text> and{' '}
            <Text style={styles.bold}>"Bachao"</Text>
          </Text>
          <Text style={styles.bullet}>
            🔢 If detected <Text style={styles.bold}>3 times within 5 seconds</Text>,
            emergency SOS is automatically triggered
          </Text>
          <Text style={styles.bullet}>
            📍 Your location is sent to emergency contacts via SMS
          </Text>
          <Text style={styles.bullet}>
            📞 A phone call is placed to your primary emergency contact
          </Text>
          <Text style={styles.bullet}>
            🔒 Works even when screen is OFF or device is locked
          </Text>
        </View>
      </View>

      {/* Privacy Notice */}
      <View style={[styles.section, styles.privacySection]}>
        <Text style={styles.sectionTitle}>🔐 Your Privacy</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>
            ✅ All audio processing happens{' '}
            <Text style={styles.bold}>100% on your device</Text>
          </Text>
          <Text style={styles.bullet}>
            ✅ <Text style={styles.bold}>No audio is recorded</Text> or stored
          </Text>
          <Text style={styles.bullet}>
            ✅ <Text style={styles.bold}>No internet required</Text> for voice detection
          </Text>
          <Text style={styles.bullet}>
            ✅ No audio data is ever sent to any server
          </Text>
          <Text style={styles.bullet}>
            ✅ You can <Text style={styles.bold}>disable at any time</Text> from Settings
          </Text>
        </View>
      </View>

      {/* Permissions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Required Permissions</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>
            🎙️ Microphone — To detect safety keywords
          </Text>
          <Text style={styles.bullet}>
            📍 Location — To share your location during emergency
          </Text>
          <Text style={styles.bullet}>
            📱 SMS — To send emergency messages
          </Text>
          <Text style={styles.bullet}>
            📞 Phone — To call emergency contacts
          </Text>
          <Text style={styles.bullet}>
            🔋 Background — To keep protection active when screen is off
          </Text>
        </View>
      </View>

      {/* Battery Notice */}
      <View style={[styles.section, styles.batterySection]}>
        <Text style={styles.sectionTitle}>🔋 Battery Impact</Text>
        <Text style={styles.body}>
          Voice detection uses a tiny AI model that consumes minimal battery
          (less than 5% CPU). A persistent notification will appear to show
          that protection is active.
        </Text>
      </View>

      {/* Acknowledgement */}
      <Pressable
        style={styles.checkboxRow}
        onPress={() => setAcknowledged(!acknowledged)}
      >
        <View style={[styles.checkbox, acknowledged && styles.checkboxChecked]}>
          {acknowledged && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>
          I understand that ABHAYA will use my device's microphone in the
          background to detect emergency keywords. Audio is processed locally
          and never recorded or transmitted.
        </Text>
      </Pressable>

      {/* Buttons */}
      <View style={styles.buttons}>
        <Pressable
          style={[styles.button, styles.acceptButton, !acknowledged && styles.buttonDisabled]}
          onPress={handleAccept}
        >
          <Text style={styles.acceptButtonText}>Enable Voice Protection</Text>
        </Pressable>

        <Pressable style={[styles.button, styles.declineButton]} onPress={onDecline}>
          <Text style={styles.declineButtonText}>Not Now</Text>
        </Pressable>
      </View>

      {/* Privacy Policy Link */}
      <Text style={styles.privacyLink}>
        By enabling, you agree to our Privacy Policy.{'\n'}
        Voice protection can be disabled anytime in Settings.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconLarge: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  section: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  privacySection: {
    borderWidth: 1,
    borderColor: COLORS.SUCCESS,
  },
  batterySection: {
    borderWidth: 1,
    borderColor: COLORS.WARNING,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  bulletList: {
    gap: 10,
  },
  bullet: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  body: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.BORDER_LIGHT,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.SUCCESS,
    borderColor: COLORS.SUCCESS,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 19,
  },
  buttons: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: COLORS.SUCCESS,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  acceptButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  declineButton: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  privacyLink: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
