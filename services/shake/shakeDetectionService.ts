/**
 * Shake Detection Service
 *
 * Listens to the device Accelerometer and triggers an SOS callback
 * when a violent shake (> 2.5g) is detected.
 *
 * Features:
 *  - Configurable G-force threshold (default: 2.5g)
 *  - Cooldown timer to prevent repeated false triggers
 *  - Clean start/stop lifecycle
 */

import type { ShakeConfig, ShakeState } from '@/types/shake.types';
import { Accelerometer } from 'expo-sensors';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ShakeConfig = {
    threshold: 2.5,    // G-force (1g = normal gravity). 2.5g = violent shake.
    cooldownMs: 3000,  // 3 seconds between triggers to prevent spam.
};

const UPDATE_INTERVAL_MS = 100; // Poll accelerometer every 100ms.

// ─── State ────────────────────────────────────────────────────────────────────

let subscription: ReturnType<typeof Accelerometer.addListener> | null = null;
let state: ShakeState = {
    status: 'idle',
    isListening: false,
    lastTriggeredAt: null,
};
let config: ShakeConfig = { ...DEFAULT_CONFIG };
let onSOSCallback: (() => void) | null = null;

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * Calculates the total G-force from X, Y, Z accelerometer axes.
 * We subtract 1g from Z to remove the constant gravitational pull.
 */
function calculateGForce(x: number, y: number, z: number): number {
    // z axis normally reads ~1g due to gravity when phone is flat.
    // We subtract 1 to get the "net" force from movement only.
    const netZ = z - 1;
    return Math.sqrt(x * x + y * y + netZ * netZ);
}

function handleAccelerometerData({ x, y, z }: { x: number; y: number; z: number }): void {
    if (!state.isListening) return;

    const gForce = calculateGForce(x, y, z);

    if (gForce >= config.threshold) {
        const now = Date.now();
        const lastTriggered = state.lastTriggeredAt ?? 0;

        // Enforce cooldown to prevent multiple triggers from one shake event.
        if (now - lastTriggered < config.cooldownMs) return;

        console.log(`[ShakeDetection] Shake detected! G-Force: ${gForce.toFixed(2)}g`);

        state = {
            ...state,
            status: 'triggered',
            lastTriggeredAt: now,
        };

        onSOSCallback?.();
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Starts listening for shake events.
 * @param onSOS - Callback invoked when a shake is detected.
 * @param customConfig - Optional config to override threshold/cooldown.
 */
export function startShakeDetection(
    onSOS: () => void,
    customConfig?: Partial<ShakeConfig>
): void {
    if (state.isListening) {
        console.warn('[ShakeDetection] Already listening. Call stopShakeDetection first.');
        return;
    }

    config = { ...DEFAULT_CONFIG, ...customConfig };
    onSOSCallback = onSOS;

    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);

    subscription = Accelerometer.addListener(handleAccelerometerData);

    state = {
        status: 'listening',
        isListening: true,
        lastTriggeredAt: null,
    };

    console.log(
        `[ShakeDetection] Started. Threshold: ${config.threshold}g, Cooldown: ${config.cooldownMs}ms`
    );
}

/**
 * Stops listening for shake events and cleans up the subscription.
 */
export function stopShakeDetection(): void {
    if (!state.isListening) return;

    subscription?.remove();
    subscription = null;
    onSOSCallback = null;

    state = {
        status: 'idle',
        isListening: false,
        lastTriggeredAt: null,
    };

    console.log('[ShakeDetection] Stopped.');
}

/**
 * Returns the current state of the shake detection service.
 */
export function getShakeStatus(): ShakeState {
    return { ...state };
}
