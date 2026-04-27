/**
 * Voice Services barrel export
 */

export { enterCooldown, getCounterState, getCurrentDetectionCount, isInCooldown, recordDetection, resetCounter } from './keywordCounterService';
export { getVoiceProtectionState, restartIfPreviouslyEnabled, startVoiceDetection, stopVoiceDetection, wasVoiceDetectionEnabled } from './voiceDetectionEngine';
export { cacheLocation, executeVoiceSOS } from './voiceSOSService';
export type { VoiceSOSResult } from './voiceSOSService';

// Mock engine exports for testing
export { simulateDetection, triggerMockSOS } from './mockVoiceDetectionEngine';
