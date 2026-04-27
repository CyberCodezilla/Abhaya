# ABHAYA — Voice-Triggered SOS: Build & Deployment Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Setup Steps](#setup-steps)
4. [Picovoice Configuration](#picovoice-configuration)
5. [Development Build](#development-build)
6. [Production Build](#production-build)
7. [Testing Strategy](#testing-strategy)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    ABHAYA APP (Expo)                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Layer 4: Fail-Safe Handling                             │
│  ├── SMS retry logic                                     │
│  ├── Permission denial handling                          │
│  ├── Error logging                                       │
│  └── Crash loop prevention                               │
│                                                          │
│  Layer 3: SOS Engine (voiceSOSService.ts)                │
│  ├── GPS location (+ last known fallback)                │
│  ├── Google Maps link formatting                         │
│  ├── SMS to all emergency contacts                       │
│  ├── Phone call to primary contact                       │
│  ├── WhatsApp deep link                                  │
│  └── Email alert                                         │
│                                                          │
│  Layer 2: Keyword Counter (keywordCounterService.ts)     │
│  ├── Rolling detection counter                           │
│  ├── 5-second time window                                │
│  ├── 3-detection threshold                               │
│  └── 60-second cooldown                                  │
│                                                          │
│  Layer 1: Audio Engine (voiceDetectionEngine.ts)         │
│  ├── Porcupine wake-word initialization                  │
│  ├── "Help" + "Bachao" keyword models                    │
│  └── Android Foreground Service (native)                 │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  Native Android Layer                                    │
│  ├── AbhayaForegroundService.java (persistent service)   │
│  ├── AbhayaForegroundServiceModule.java (RN bridge)      │
│  ├── AbhayaForegroundServicePackage.java (registration)  │
│  └── BootReceiver.java (restart on reboot)               │
└──────────────────────────────────────────────────────────┘
```

---

## Prerequisites

1. **Node.js** ≥ 18
2. **Expo CLI**: `npm install -g expo-cli`
3. **EAS CLI**: `npm install -g eas-cli`
4. **Android Studio** with SDK 33+ (for local builds)
5. **Picovoice Account**: https://console.picovoice.ai/ (free tier available)
6. **Java JDK 17** (for Android builds)

---

## Setup Steps

### 1. Install Dependencies

```bash
cd abhaya
npm install
```

New dependencies added:
- `expo-dev-client` — Development builds with native modules
- `expo-task-manager` — Background task registration
- `@picovoice/porcupine-react-native` — Offline wake-word detection
- `@picovoice/react-native-voice-processor` — Audio capture for Porcupine

### 2. Get Picovoice Access Key

1. Go to https://console.picovoice.ai/
2. Sign up (free tier: 3 months, unlimited devices)
3. Copy your **Access Key**
4. Open `constants/voice.constants.ts`
5. Replace `YOUR_PICOVOICE_ACCESS_KEY_HERE` with your actual key

### 3. Train Custom Wake Words

1. In Picovoice Console, go to **Porcupine** → **Custom Keywords**
2. Train these keywords:
   - **help** (English)
   - **bachao** (Hindi)
3. Download the `.ppn` files for **Android**
4. Place them in: `android/app/src/main/assets/porcupine/`
   - `help_android.ppn`
   - `bachao_android.ppn`
5. Update `voiceDetectionEngine.ts` to use `fromKeywordPaths()` instead of `fromBuiltInKeywords()`

### 4. EAS Configuration

Create `eas.json` if not exists:

```json
{
  "cli": {
    "version": ">= 13.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

---

## Picovoice Configuration

### Using Built-in Keywords (Development)

The current code uses `fromBuiltInKeywords()` with Porcupine built-in keywords for testing. These won't respond to "help" or "bachao" — they use Porcupine's own keywords like "porcupine" and "picovoice".

### Switching to Custom Keywords (Production)

In `services/voice/voiceDetectionEngine.ts`, replace the `fromBuiltInKeywords()` call:

```typescript
// DEVELOPMENT (current):
porcupineManager = await PorcupineManager.fromBuiltInKeywords(
  PICOVOICE_ACCESS_KEY,
  ['picovoice', 'porcupine'],
  (keywordIndex) => handleKeywordDetection(keywordIndex),
  (error) => console.error(error),
  [PORCUPINE_SENSITIVITY, PORCUPINE_SENSITIVITY]
);

// PRODUCTION (switch to this):
import RNFS from 'react-native-fs';

const helpPath = `${RNFS.MainBundlePath}/porcupine/help_android.ppn`;
const bachaoPath = `${RNFS.MainBundlePath}/porcupine/bachao_android.ppn`;

porcupineManager = await PorcupineManager.fromKeywordPaths(
  PICOVOICE_ACCESS_KEY,
  [helpPath, bachaoPath],
  (keywordIndex) => handleKeywordDetection(keywordIndex),
  (error) => console.error(error),
  [PORCUPINE_SENSITIVITY, PORCUPINE_SENSITIVITY]
);
```

---

## Development Build

### Option A: Local Development Build

```bash
# 1. Prebuild native projects
npx expo prebuild --platform android --clean

# 2. Build development APK
npx expo run:android

# 3. Start the Metro bundler (separate terminal)
npx expo start --dev-client
```

### Option B: EAS Development Build

```bash
# 1. Login to EAS
eas login

# 2. Build development APK
eas build --profile development --platform android

# 3. Download and install APK on device

# 4. Start Metro bundler
npx expo start --dev-client
```

### Testing Voice Detection in Dev

```bash
# In the React Native debugger console:
const tests = require('./services/voice/__tests__/voiceSOSTestUtils');
tests.runAllVoiceTests();

# Simulate a detection:
tests.simulateDetection('help');

# Simulate full trigger:
tests.simulateFullTrigger();
```

---

## Production Build

### Build APK/AAB

```bash
# Preview APK (for internal testing)
eas build --profile preview --platform android

# Production AAB (for Play Store)
eas build --profile production --platform android
```

### Play Store Submission

```bash
eas submit --platform android --profile production
```

### Before Submission Checklist

- [ ] Replace `PICOVOICE_ACCESS_KEY` with production key
- [ ] Train and include custom `.ppn` files for "help" and "bachao"
- [ ] Switch from `fromBuiltInKeywords()` to `fromKeywordPaths()`
- [ ] Add privacy policy URL to Play Store listing
- [ ] Declare foreground service usage in Play Store console
- [ ] Declare microphone usage in Data Safety section
- [ ] Test on at least 3 different Android devices
- [ ] Verify background detection works with screen off
- [ ] Test battery consumption over 30+ minutes

---

## Testing Strategy

### 1. Keyword Detection Tests

| Scenario | How to Test | Expected |
|----------|-------------|----------|
| Screen ON | Say "Help" 3x within 5s | SOS triggers |
| Screen OFF | Lock phone, say "Help" 3x | SOS triggers |
| Device Locked | Lock + say keywords | SOS triggers |
| Single detection | Say "Help" once | No trigger |
| Two detections | Say "Help" twice | No trigger |
| Mixed keywords | Say "Help", "Bachao", "Help" | SOS triggers |

### 2. False Positive Tests

| Scenario | How to Test | Expected |
|----------|-------------|----------|
| YouTube audio | Play YouTube with random audio | No trigger |
| Normal conversation | Have a casual conversation | No trigger |
| TV/Radio | Play news/music in background | No trigger |
| Single accidental "help" | Say "help" once naturally | No trigger |

### 3. Stress Tests

| Scenario | How to Test | Expected |
|----------|-------------|----------|
| 10 rapid detections | Trigger 10 quick detections | Exactly 1 SOS |
| Rapid enable/disable | Toggle protection 10x | No crash |
| Cooldown test | Trigger SOS, immediately try again | Blocked for 60s |

### 4. Battery Tests

| Scenario | Duration | Expected |
|----------|----------|----------|
| Background listening | 30 minutes | < 3% battery drain |
| Background listening | 2 hours | < 10% battery drain |
| Active SOS + tracking | 10 minutes | Location updates every 30s |

### Running Automated Tests

```typescript
// In development console or test screen:
import { runAllVoiceTests } from '@/services/voice/__tests__/voiceSOSTestUtils';
const results = runAllVoiceTests();
// Check console for detailed results
```

---

## Troubleshooting

### "Porcupine failed to initialize"
- Verify your Picovoice access key is valid
- Check that `.ppn` files are in the correct assets directory
- Ensure RECORD_AUDIO permission is granted

### "Foreground service not starting"
- Check AndroidManifest.xml has `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MICROPHONE`
- Verify the service is declared in the manifest
- On Android 13+, user must grant notification permission

### "Voice detection stops after a few minutes"
- Disable battery optimization for ABHAYA in device settings
- Some OEMs (Xiaomi, Huawei, Samsung) have aggressive battery management
- Guide users to whitelist the app: https://dontkillmyapp.com/

### "SOS not triggered when screen is off"
- Verify wake lock is acquired (check logs)
- Ensure foreground service notification is visible
- On some devices, microphone access in background requires special OEM settings

### "Build fails with Porcupine errors"
- Ensure `@picovoice/porcupine-react-native` version matches your Expo SDK
- Run `npx expo prebuild --clean` to regenerate native projects
- Check that Java 17 is installed and `JAVA_HOME` is set

### Permission Issues
- Android 13+: POST_NOTIFICATIONS permission needed for foreground service notification
- Android 12+: Exact alarm permission may be needed for boot receiver
- Test permission flow on Android 10, 12, 13, and 14 separately

---

## File Structure Summary

```
abhaya/
├── plugins/
│   └── withAbhayaForegroundService.js       # Expo config plugin
├── services/
│   ├── voice/
│   │   ├── index.ts                          # Barrel exports
│   │   ├── voiceDetectionEngine.ts           # Layer 1: Porcupine engine
│   │   ├── keywordCounterService.ts          # Layer 2: Detection counter
│   │   ├── voiceSOSService.ts                # Layer 3: SOS execution
│   │   └── __tests__/
│   │       └── voiceSOSTestUtils.ts          # Test utilities
│   └── permissions/
│       └── permissionService.ts              # Runtime permissions
├── components/
│   └── voice/
│       ├── index.ts                          # Barrel exports
│       ├── VoiceProtectionConsent.tsx         # Consent screen
│       └── VoiceProtectionToggle.tsx          # Settings toggle
├── constants/
│   └── voice.constants.ts                    # Voice config constants
├── types/
│   └── voice.types.ts                        # Voice type definitions
├── android/app/src/main/java/com/abhaya/womensafety/
│   ├── AbhayaForegroundService.java          # Native foreground service
│   ├── AbhayaForegroundServiceModule.java    # RN native module bridge
│   ├── AbhayaForegroundServicePackage.java   # Package registration
│   └── BootReceiver.java                     # Boot restart receiver
└── docs/
    └── VOICE_SOS_BUILD_GUIDE.md              # This file
```

---

## Important Limitations

1. **Does NOT work when device is powered off** — requires powered-on device
2. **WhatsApp messages cannot be sent silently** — opens app with pre-filled message
3. **SMS requires user confirmation on some devices** — Android security limitation
4. **Custom wake words require Picovoice training** — built-in keywords are for dev only
5. **Battery optimization varies by OEM** — Xiaomi, Huawei, Samsung need manual whitelisting
6. **Android only** — no iOS support in this implementation
