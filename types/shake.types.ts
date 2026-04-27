/**
 * Shake Detection Types
 */

export type ShakeStatus = 'idle' | 'listening' | 'triggered' | 'error';

export interface ShakeConfig {
    /** Acceleration threshold in G-force to trigger SOS (default: 2.5g) */
    threshold: number;
    /** Minimum time between two shake triggers in ms (default: 3000ms) */
    cooldownMs: number;
}

export interface ShakeState {
    status: ShakeStatus;
    isListening: boolean;
    lastTriggeredAt: number | null;
}
