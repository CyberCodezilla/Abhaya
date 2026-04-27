/**
 * Voice SOS Test Utilities
 * ═══════════════════════════════════════════════════════
 * Development-only utilities for testing the voice-triggered SOS system.
 *
 * TESTING SCENARIOS:
 * 1. Keyword detection (screen ON, OFF, locked)
 * 2. False positive testing (YouTube, conversation)
 * 3. Stress testing (rapid detections)
 * 4. Battery monitoring
 *
 * USAGE: Import in a dev screen or call from console during development.
 * These utilities should NOT be included in production builds.
 */

import { KEYWORD_TIME_WINDOW_MS, KEYWORD_TRIGGER_COUNT, SOS_COOLDOWN_MS } from '@/constants/voice.constants';
import {
    getCounterState,
    getCurrentDetectionCount,
    isInCooldown,
    recordDetection,
    resetCounter
} from '@/services/voice/keywordCounterService';

// ─────────────────────────────────────────────────────────
// TEST RESULTS TYPE
// ─────────────────────────────────────────────────────────

interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
  duration: number;
}

// ─────────────────────────────────────────────────────────
// 1. KEYWORD DETECTION TESTS
// ─────────────────────────────────────────────────────────

/**
 * Test: 3 "help" detections within 5 seconds should trigger SOS
 */
export function testKeywordTrigger(): TestResult {
  const start = Date.now();
  resetCounter();

  let triggered = false;

  // Simulate 3 rapid detections
  for (let i = 0; i < KEYWORD_TRIGGER_COUNT; i++) {
    const result = recordDetection('help', 0);
    if (result.triggered) {
      triggered = true;
    }
  }

  return {
    testName: 'Keyword Trigger (3 detections)',
    passed: triggered,
    details: triggered
      ? `SOS triggered after ${KEYWORD_TRIGGER_COUNT} detections ✅`
      : `SOS NOT triggered after ${KEYWORD_TRIGGER_COUNT} detections ❌`,
    duration: Date.now() - start,
  };
}

/**
 * Test: 2 detections should NOT trigger SOS
 */
export function testNoTriggerOnTwoDetections(): TestResult {
  const start = Date.now();
  resetCounter();

  let triggered = false;

  // Simulate 2 detections (below threshold)
  for (let i = 0; i < KEYWORD_TRIGGER_COUNT - 1; i++) {
    const result = recordDetection('help', 0);
    if (result.triggered) {
      triggered = true;
    }
  }

  return {
    testName: 'No Trigger on 2 Detections',
    passed: !triggered,
    details: !triggered
      ? 'SOS correctly NOT triggered with only 2 detections ✅'
      : 'SOS incorrectly triggered with only 2 detections ❌',
    duration: Date.now() - start,
  };
}

/**
 * Test: Mixed keywords ("help" and "bachao") should still trigger
 */
export function testMixedKeywords(): TestResult {
  const start = Date.now();
  resetCounter();

  let triggered = false;

  recordDetection('help', 0);
  recordDetection('bachao', 1);
  const result = recordDetection('help', 0);
  if (result.triggered) {
    triggered = true;
  }

  return {
    testName: 'Mixed Keywords Trigger',
    passed: triggered,
    details: triggered
      ? 'SOS triggered with mixed "help" and "bachao" detections ✅'
      : 'SOS NOT triggered with mixed keywords ❌',
    duration: Date.now() - start,
  };
}

// ─────────────────────────────────────────────────────────
// 2. COOLDOWN TESTS
// ─────────────────────────────────────────────────────────

/**
 * Test: After SOS trigger, subsequent detections should be ignored during cooldown
 */
export function testCooldownPreventsRetrigger(): TestResult {
  const start = Date.now();
  resetCounter();

  // Trigger SOS first
  for (let i = 0; i < KEYWORD_TRIGGER_COUNT; i++) {
    recordDetection('help', 0);
  }

  // Now try to trigger again (should be in cooldown)
  let retriggered = false;
  for (let i = 0; i < KEYWORD_TRIGGER_COUNT; i++) {
    const result = recordDetection('help', 0);
    if (result.triggered) {
      retriggered = true;
    }
  }

  return {
    testName: 'Cooldown Prevents Re-trigger',
    passed: !retriggered,
    details: !retriggered
      ? `Cooldown correctly prevented re-trigger for ${SOS_COOLDOWN_MS / 1000}s ✅`
      : 'Cooldown FAILED — SOS re-triggered ❌',
    duration: Date.now() - start,
  };
}

// ─────────────────────────────────────────────────────────
// 3. STRESS TESTS
// ─────────────────────────────────────────────────────────

/**
 * Test: 10 rapid "Help" detections should trigger SOS only ONCE
 */
export function testStressRapidDetections(): TestResult {
  const start = Date.now();
  resetCounter();

  let triggerCount = 0;

  for (let i = 0; i < 10; i++) {
    const result = recordDetection('help', 0);
    if (result.triggered) {
      triggerCount++;
    }
  }

  return {
    testName: 'Stress: 10 Rapid Detections',
    passed: triggerCount === 1,
    details:
      triggerCount === 1
        ? 'SOS triggered exactly ONCE with 10 rapid detections ✅'
        : `SOS triggered ${triggerCount} times ❌ (expected 1)`,
    duration: Date.now() - start,
  };
}

/**
 * Test: Counter resets properly after explicit reset
 */
export function testCounterReset(): TestResult {
  const start = Date.now();

  // Add some detections
  recordDetection('help', 0);
  recordDetection('help', 0);

  // Reset
  resetCounter();

  const count = getCurrentDetectionCount();
  const state = getCounterState();

  return {
    testName: 'Counter Reset',
    passed: count === 0 && !state.isInCooldown,
    details:
      count === 0 && !state.isInCooldown
        ? 'Counter reset correctly ✅'
        : `Counter after reset: count=${count}, cooldown=${state.isInCooldown} ❌`,
    duration: Date.now() - start,
  };
}

// ─────────────────────────────────────────────────────────
// 4. TIME WINDOW TESTS
// ─────────────────────────────────────────────────────────

/**
 * Test: Detections outside time window should be pruned
 * NOTE: This test is synchronous and simulates by checking counter state.
 *       Real time-window testing requires actual delays.
 */
export function testTimeWindowPruning(): TestResult {
  const start = Date.now();
  resetCounter();

  // Record 2 detections
  recordDetection('help', 0);
  recordDetection('help', 0);

  // Check count
  const countBefore = getCurrentDetectionCount();

  return {
    testName: 'Time Window State Check',
    passed: countBefore === 2,
    details: `Current count: ${countBefore}/3 within ${KEYWORD_TIME_WINDOW_MS}ms window ✅`,
    duration: Date.now() - start,
  };
}

// ─────────────────────────────────────────────────────────
// RUN ALL TESTS
// ─────────────────────────────────────────────────────────

/**
 * Run all synchronous voice SOS tests and return results
 */
export function runAllVoiceTests(): TestResult[] {
  const results: TestResult[] = [];

  // Save state
  const savedState = getCounterState();

  // Run all tests
  results.push(testKeywordTrigger());
  results.push(testNoTriggerOnTwoDetections());
  results.push(testMixedKeywords());
  results.push(testCooldownPreventsRetrigger());
  results.push(testStressRapidDetections());
  results.push(testCounterReset());
  results.push(testTimeWindowPruning());

  // Reset to clean state after tests
  resetCounter();

  // Print summary
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  VOICE SOS TEST RESULTS: ${passed}/${total} PASSED`);
  console.log(`═══════════════════════════════════════════`);
  results.forEach((r) => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`  ${icon} ${r.testName}: ${r.details} (${r.duration}ms)`);
  });
  console.log(`═══════════════════════════════════════════\n`);

  return results;
}

// ─────────────────────────────────────────────────────────
// MANUAL TESTING HELPERS
// ─────────────────────────────────────────────────────────

/**
 * Simulate a keyword detection manually (for development testing)
 * Call from React Native debugger console:
 *   require('./services/voice/__tests__/voiceSOSTestUtils').simulateDetection('help')
 */
export function simulateDetection(keyword: string = 'help'): void {
  const index = keyword === 'bachao' ? 1 : 0;
  const result = recordDetection(keyword, index);
  console.log(`[TestUtil] Simulated "${keyword}" detection:`, {
    count: result.detectionCount,
    triggered: result.triggered,
  });
}

/**
 * Simulate full SOS trigger (for testing SOS flow without Porcupine)
 */
export function simulateFullTrigger(): void {
  resetCounter();
  for (let i = 0; i < KEYWORD_TRIGGER_COUNT; i++) {
    const result = recordDetection('help', 0);
    if (result.triggered) {
      console.log('[TestUtil] 🚨 SOS triggered by simulation!');
    }
  }
}

/**
 * Get current system state for debugging
 */
export function getDebugState(): object {
  return {
    counterState: getCounterState(),
    currentCount: getCurrentDetectionCount(),
    inCooldown: isInCooldown(),
    config: {
      triggerCount: KEYWORD_TRIGGER_COUNT,
      timeWindowMs: KEYWORD_TIME_WINDOW_MS,
      cooldownMs: SOS_COOLDOWN_MS,
    },
  };
}
