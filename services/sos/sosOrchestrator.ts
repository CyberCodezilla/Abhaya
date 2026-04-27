/**
 * SOS Orchestrator
 * ═══════════════════════════════════════════════════════
 * The single source of truth for all SOS activations.
 *
 * Wires together ALL triggers:
 *   - Manual button press
 *   - Shake detection (> 2.5g)
 *   - Voice detection ("Help Help Help")
 *
 * On trigger, executes the full SOS pipeline:
 *   1. Get current GPS location (high accuracy)
 *   2. Get battery status
 *   3. Get stored IMEI
 *   4. Format SOS message
 *   5. Start stealth evidence recording
 *   6. Send SMS to all contacts (backend → native fallback)
 *   7. Trigger fake police call (deception defense)
 *   8. Log activation
 *
 * Usage:
 *   import { initSOS, triggerSOS, cleanupSOS } from '@/services/sos/sosOrchestrator';
 *
 *   // In your root component (App.tsx / _layout.tsx):
 *   useEffect(() => {
 *     initSOS();
 *     return () => cleanupSOS();
 *   }, []);
 */

import { playRingtone, stopFakeCall } from '@/services/defense/fakeCallService';
import { startEvidenceRecording, stopEvidenceRecording } from '@/services/evidence/evidenceService';
import { startShakeDetection, stopShakeDetection } from '@/services/shake/shakeDetectionService';
import { sendSOSToAllContacts } from '@/services/sms/smsService';
import { formatSOSMessage, logSOSActivation } from '@/services/sos/sosService';
import { restartIfPreviouslyEnabled } from '@/services/voice/voiceDetectionEngine';
import { LocationData } from '@/types/emergency.types';
import * as Location from 'expo-location';
import { Vibration } from 'react-native';
import { createMMKV } from 'react-native-mmkv';

// ─── MMKV Storage ─────────────────────────────────────────────────────────────

const sosStorage = createMMKV({ id: 'sos-orchestrator' });
const IMEI_KEY = 'user_imei';

// ─── State ────────────────────────────────────────────────────────────────────

export type SOSTriggerSource = 'button' | 'shake' | 'voice';

export interface SOSActivation {
    triggeredAt: number;
    source: SOSTriggerSource;
    location: LocationData | null;
}

let isSOSActive = false;
let lastActivationAt = 0;
const SOS_COOLDOWN_MS = 60_000; // 1 minute between activations

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialize all SOS triggers.
 * Call this once in your root layout component.
 *
 * @param onSOSActivated - Optional UI callback to update the screen when SOS fires.
 */
export async function initSOS(
    onSOSActivated?: (activation: SOSActivation) => void
): Promise<void> {
    console.log('[SOSOrchestrator] Initializing...');

    // 1. Start shake detection
    startShakeDetection(() => {
        handleTrigger('shake', onSOSActivated);
    });

    // 2. Restart voice detection if it was previously enabled
    await restartIfPreviouslyEnabled((result) => {
        console.log(`[SOSOrchestrator] Voice trigger: "${result.keyword}"`);
        handleTrigger('voice', onSOSActivated);
    });

    console.log('[SOSOrchestrator] ✅ All triggers active (shake + voice)');
}

/**
 * Manually trigger SOS (from the UI button).
 * @param onSOSActivated - Optional UI callback.
 */
export async function triggerSOS(
    onSOSActivated?: (activation: SOSActivation) => void
): Promise<void> {
    await handleTrigger('button', onSOSActivated);
}

/**
 * Stop all SOS triggers and evidence recording.
 * Call this on app unmount or when user cancels SOS.
 */
export async function cleanupSOS(): Promise<void> {
    stopShakeDetection();
    await stopEvidenceRecording();
    await stopFakeCall();
    isSOSActive = false;
    console.log('[SOSOrchestrator] Cleaned up.');
}

/**
 * Cancel an active SOS (user pressed cancel during countdown).
 */
export async function cancelSOS(): Promise<void> {
    if (!isSOSActive) return;
    await stopEvidenceRecording();
    await stopFakeCall();
    isSOSActive = false;
    Vibration.cancel();
    console.log('[SOSOrchestrator] SOS cancelled by user.');
}

/**
 * Store user's IMEI for inclusion in SOS messages.
 */
export function saveIMEI(imei: string): void {
    sosStorage.set(IMEI_KEY, imei.trim());
}

/**
 * Get stored IMEI (returns null if not set).
 */
export function getStoredIMEI(): string | null {
    return sosStorage.getString(IMEI_KEY) ?? null;
}

// ─── Private: Core Pipeline ───────────────────────────────────────────────────

async function handleTrigger(
    source: SOSTriggerSource,
    onSOSActivated?: (activation: SOSActivation) => void
): Promise<void> {
    const now = Date.now();

    // Cooldown check — prevent double-triggers
    if (isSOSActive || now - lastActivationAt < SOS_COOLDOWN_MS) {
        console.warn(`[SOSOrchestrator] Trigger ignored — cooldown active (source: ${source})`);
        return;
    }

    isSOSActive = true;
    lastActivationAt = now;

    console.log(`\n🚨 [SOSOrchestrator] SOS TRIGGERED — Source: ${source.toUpperCase()}`);

    // Haptic feedback — 3 short pulses to confirm trigger
    // On iOS, Vibration.vibrate pattern is ignored, so we use Haptics alongside it for guaranteed feedback.
    try {
        Vibration.vibrate([0, 300, 100, 300, 100, 300]);
        
        // Also fire haptics for robust iOS support
        import('expo-haptics').then((Haptics) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), 400);
            setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), 800);
        }).catch(() => {});
    } catch (e) {
        console.warn('Vibration failed', e);
    }

    // Step 1: Get GPS location (high accuracy, 8 second timeout)
    let location: LocationData | null = null;
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
            });
            location = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                speed: pos.coords.speed,
                timestamp: pos.timestamp,
            };
            console.log(`[SOSOrchestrator] 📍 Location: ${location.latitude}, ${location.longitude}`);
        }
    } catch (err) {
        console.warn('[SOSOrchestrator] Location unavailable:', err);
    }

    // Notify UI immediately (don't wait for SMS)
    const activation: SOSActivation = { triggeredAt: now, source, location };
    onSOSActivated?.(activation);

    // Step 2: Get IMEI
    const imei = getStoredIMEI();

    // Step 3: Format SOS message (includes battery + GPS + IMEI)
    const sosMessage = await formatSOSMessage(location, undefined, imei);
    console.log('[SOSOrchestrator] 📝 Message formatted');

    // Step 4: Start stealth evidence recording (non-blocking)
    startEvidenceRecording().catch((err) => {
        console.warn('[SOSOrchestrator] Evidence recording failed to start:', err);
    });

    // Step 5: Send SMS to all contacts (non-blocking — don't await)
    sendSOSToAllContacts(sosMessage.text)
        .then((result) => {
            console.log(
                `[SOSOrchestrator] SMS result: ${result.sent} sent via ${result.method}, ${result.failed} failed`
            );
        })
        .catch((err) => {
            console.error('[SOSOrchestrator] SMS send error:', err);
        });

    // Step 6: Trigger fake call after 15 seconds (deception defense)
    setTimeout(() => {
        playRingtone('ios'); // Default to iOS for automated trigger
    }, 15_000);

    // Step 7: Log activation
    logSOSActivation(location, source === 'button' ? 'button' : source === 'voice' ? 'voice' : 'shake');

    console.log('[SOSOrchestrator] ✅ SOS pipeline complete');
}
