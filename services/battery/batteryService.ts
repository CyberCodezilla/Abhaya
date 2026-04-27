/**
 * Battery Monitoring Service
 *
 * Provides synchronous battery level and state for SOS messages.
 * Uses expo-battery to get current battery level and charging status.
 */

import * as Battery from 'expo-battery';

export interface BatteryInfo {
    /** Battery level as a percentage string, e.g. "72%" */
    levelPercent: string;
    /** Whether the device is currently charging */
    isCharging: boolean;
    /** Raw battery level (0.0 to 1.0) */
    rawLevel: number;
}

/**
 * Gets the current battery info.
 * Returns a safe fallback if the API is unavailable.
 */
export async function getBatteryInfo(): Promise<BatteryInfo> {
    try {
        const [level, state] = await Promise.all([
            Battery.getBatteryLevelAsync(),
            Battery.getBatteryStateAsync(),
        ]);

        const isCharging =
            state === Battery.BatteryState.CHARGING ||
            state === Battery.BatteryState.FULL;

        const percent = level >= 0 ? Math.round(level * 100) : -1;

        return {
            levelPercent: percent >= 0 ? `${percent}%` : 'Unknown',
            isCharging,
            rawLevel: level,
        };
    } catch (error) {
        console.warn('[BatteryService] Failed to get battery info:', error);
        return {
            levelPercent: 'Unknown',
            isCharging: false,
            rawLevel: -1,
        };
    }
}

/**
 * Returns a formatted string for inclusion in SOS messages.
 * Example: "🔋 Battery: 23% (Low)"
 */
export async function getBatteryStatusString(): Promise<string> {
    const info = await getBatteryInfo();

    if (info.rawLevel < 0) return '🔋 Battery: Unknown';

    const level = info.rawLevel * 100;
    let label = '';
    if (info.isCharging) {
        label = 'Charging';
    } else if (level <= 15) {
        label = 'CRITICAL';
    } else if (level <= 30) {
        label = 'Low';
    } else {
        label = 'OK';
    }

    return `🔋 Battery: ${info.levelPercent} (${label})`;
}
