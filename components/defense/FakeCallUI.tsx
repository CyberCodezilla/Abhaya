import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  SafeAreaView,
  Platform,
  Animated,
  StatusBar,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

/**
 * Supported UI Themes for Fake Calling
 */
export type CallTheme = 'ios' | 'samsung' | 'realme' | 'stock';

interface FakeCallUIProps {
  callerName: string;
  callerNumber: string;
  theme: CallTheme;
  onAccept: () => void;
  onDecline: () => void;
  isVisible: boolean;
}

/**
 * High-precision Incoming Call Simulator (v3 - Modal Fullscreen)
 */
export const FakeCallUI: React.FC<FakeCallUIProps> = ({
  callerName,
  callerNumber,
  theme,
  onAccept,
  onDecline,
  isVisible,
}) => {
  const [callStatus, setCallStatus] = useState<'incoming' | 'active'>('incoming');
  const [seconds, setSeconds] = useState(0);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Pulsing animation for Accept button
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();

      // Shaking animation for incoming call feel
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 5, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -5, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
          Animated.delay(1000),
        ])
      ).start();
    }
  }, [isVisible]);

  useEffect(() => {
    let interval: any;
    if (callStatus === 'active' && isVisible) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus, isVisible]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAccept = () => {
    setCallStatus('active');
    onAccept();
  };

  const handleDecline = () => {
    setCallStatus('incoming');
    setSeconds(0);
    onDecline();
  };

  // ─── RENDER BUTTONS ───

  const renderButtons = () => {
    if (callStatus === 'incoming') {
      return (
        <View style={styles.buttonContainer}>
          {/* Decline Button */}
          <View style={styles.buttonWrapper}>
            <Pressable
              style={[styles.callButton, styles.declineButton]}
              onPress={handleDecline}
            >
              <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
            </Pressable>
            <Text style={styles.btnLabel}>Decline</Text>
          </View>

          {/* Accept Button */}
          <View style={styles.buttonWrapper}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Pressable
                style={[styles.callButton, styles.acceptButton]}
                onPress={handleAccept}
              >
                <Ionicons name="call" size={32} color="white" />
              </Pressable>
            </Animated.View>
            <Text style={styles.btnLabel}>Accept</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.activeContainer}>
        <View style={styles.activeControlGrid}>
           {[
             { n: 'mic-off', l: 'mute' }, { n: 'keypad', l: 'keypad' }, { n: 'volume-high', l: 'speaker' },
             { n: 'add', l: 'add call' }, { n: 'videocam', l: 'FaceTime' }, { n: 'person', l: 'contacts' }
           ].map((item, idx) => (
             <View key={idx} style={styles.gridItem}>
                <View style={styles.gridIconCircle}>
                   <Ionicons name={item.n as any} size={24} color="white" />
                </View>
                <Text style={styles.gridLabel}>{item.l}</Text>
             </View>
           ))}
        </View>
        <Pressable
          style={[styles.callButton, styles.declineButton, styles.hangupPos]}
          onPress={handleDecline}
        >
          <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
        </Pressable>
      </View>
    );
  };

  const renderContent = () => {
    if (theme === 'ios') {
      return (
        <View style={[styles.fullScreen, { backgroundColor: '#1c1c1e' }]}>
          {Platform.OS === 'ios' ? (
             <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
             <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(28,28,30,0.95)' }]} />
          )}
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.iosHeader}>
               <Text style={styles.iosCallerName}>{callerName}</Text>
               <Text style={styles.iosStatusText}>
                  {callStatus === 'active' ? formatTime(seconds) : 'mobile'}
               </Text>
            </View>
            {renderButtons()}
          </SafeAreaView>
        </View>
      );
    }

    if (theme === 'samsung') {
      return (
        <View style={[styles.fullScreen, { backgroundColor: '#0F2027' }]}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.samsungHeader}>
                    <Text style={styles.samsungCallerName}>{callerName}</Text>
                    <Text style={styles.samsungNumber}>{callerNumber}</Text>
                    <Text style={styles.samsungStatus}>
                        {callStatus === 'active' ? formatTime(seconds) : 'Incoming call'}
                    </Text>
                </View>
                <View style={styles.samsungAvatar}>
                    <Ionicons name="person" size={50} color="rgba(255,255,255,0.3)" />
                </View>
                {renderButtons()}
            </SafeAreaView>
        </View>
      );
    }

    return (
      <View style={[styles.fullScreen, { backgroundColor: '#000000' }]}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stockHeader}>
            <Animated.View style={{ transform: [{ translateY: callStatus === 'incoming' ? shakeAnim : 0 }] }}>
               <View style={styles.stockAvatar}>
                  <Ionicons name="person" size={40} color="white" />
               </View>
            </Animated.View>
            <Text style={styles.stockCallerName}>{callerName}</Text>
            <Text style={styles.stockStatus}>
              {callStatus === 'active' ? formatTime(seconds) : 'Incoming call'}
            </Text>
          </View>
          {renderButtons()}
        </SafeAreaView>
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <StatusBar hidden />
      {renderContent()}
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreen: { height: height + 100, width, position: 'absolute', top: 0, left: 0 },
  safeArea: { flex: 1, justifyContent: 'space-between', paddingVertical: 60 },

  // iOS Specifics
  iosHeader: { alignItems: 'center', marginTop: 40 },
  iosCallerName: { fontSize: 34, color: '#FFFFFF', fontWeight: '300', marginBottom: 5 },
  iosStatusText: { fontSize: 18, color: 'rgba(255,255,255,0.5)', fontWeight: '400' },

  // Samsung Specifics
  samsungHeader: { alignItems: 'center', marginTop: 20 },
  samsungCallerName: { fontSize: 30, color: '#FFFFFF', fontWeight: '800' },
  samsungNumber: { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  samsungStatus: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 20 },
  samsungAvatar: { 
      alignSelf: 'center', width: 140, height: 140, borderRadius: 70, 
      backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
      marginTop: 40
  },

  // Stock/Realme Specifics
  stockHeader: { alignItems: 'center', marginTop: 40 },
  stockAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1E3A8A', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  stockCallerName: { fontSize: 26, color: '#FFFFFF', fontWeight: 'bold' },
  stockStatus: { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginTop: 8 },

  // Shared Buttons
  buttonContainer: { 
      flexDirection: 'row', 
      justifyContent: 'space-around', 
      paddingHorizontal: 40,
      marginBottom: 60 
  },
  buttonWrapper: { alignItems: 'center' },
  callButton: { 
      width: 76, height: 76, borderRadius: 38, 
      justifyContent: 'center', alignItems: 'center', marginBottom: 12
  },
  acceptButton: { backgroundColor: '#4CD964' },
  declineButton: { backgroundColor: '#FF3B30' },
  btnLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },

  // Active Call Content
  activeContainer: { paddingHorizontal: 40, flex: 1, justifyContent: 'space-between', paddingBottom: 60 },
  activeControlGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 100 },
  gridItem: { width: '30%', alignItems: 'center', marginBottom: 30 },
  gridIconCircle: { 
      width: 64, height: 64, borderRadius: 32, 
      backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
      marginBottom: 10
  },
  gridLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '400' },
  hangupPos: { alignSelf: 'center' },
});
