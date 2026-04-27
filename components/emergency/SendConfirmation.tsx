/**
 * SendConfirmation Component
 * Big, clear, one-tap "SEND EMERGENCY ALERT" button
 * 
 * DESIGN:
 * ═══════════════════════════════════════════════════════
 * ┌─────────────────────────────────────────────────────┐
 * │                                                     │
 * │     ███████████████████████████████████████████     │
 * │     █                                         █     │
 * │     █     🚨 SEND EMERGENCY ALERT            █     │
 * │     █                                         █     │
 * │     ███████████████████████████████████████████     │
 * │                                                     │
 * │  This will open your messaging apps with emergency  │
 * │  details ready. Tap "Send" in each app.             │
 * └─────────────────────────────────────────────────────┘
 * 
 * WHY this specific design?
 * - Full-width button: no precision needed (shaking hands)
 * - Bright red on dark background: impossible to miss
 * - Clear explanation text: user knows exactly what happens
 * - Haptic feedback on press: physical confirmation
 */

import { COLORS } from '@/constants/config';
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface SendConfirmationProps {
  onSend: () => void;
  isReady: boolean;
  isSending: boolean;
  contactCount: number;
}

export default function SendConfirmation({
  onSend,
  isReady,
  isSending,
  contactCount,
}: SendConfirmationProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (!isReady || isSending) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onSend();
  };

  return (
    <View style={styles.container}>
      {/* Main Send Button */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%' }}>
        <Pressable
          style={[
            styles.sendButton,
            !isReady && styles.sendButtonDisabled,
            isSending && styles.sendButtonSending,
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!isReady || isSending}
          android_ripple={{ color: COLORS.PRIMARY_DARKER }}
        >
          {isSending ? (
            <>
              <Text style={styles.sendButtonIcon}>📡</Text>
              <Text style={styles.sendButtonText}>SENDING ALERTS...</Text>
            </>
          ) : (
            <>
              <Text style={styles.sendButtonIcon}>🚨</Text>
              <Text style={styles.sendButtonText}>SEND EMERGENCY ALERT</Text>
            </>
          )}
        </Pressable>
      </Animated.View>

      {/* Explanation text */}
      <Text style={styles.explanation}>
        {isSending
          ? `Opening messaging apps for ${contactCount} contacts...\nTap "Send" in each app as they open.`
          : isReady
          ? 'This will open your messaging apps with emergency details ready.\nTap "Send" in each app to complete.'
          : 'Preparing emergency alert package...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendButton: {
    width: '100%',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 18,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    elevation: 2,
    shadowOpacity: 0.1,
  },
  sendButtonSending: {
    backgroundColor: COLORS.WARNING,
  },
  sendButtonIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  explanation: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 18,
  },
});
