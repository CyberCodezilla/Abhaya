# 🎓 Student Quick Start Guide - Voice SOS Testing (Mock Mode)

## ✅ You Don't Need Picovoice to Start!

Good news! You can develop and test the entire voice SOS system **without a Picovoice account** using the mock engine.

---

## 🚀 Quick Start (5 Steps)

### 1. Install Dependencies
```bash
npm install
```

### 2. Prebuild Android Native Code
```bash
npx expo prebuild --platform android --clean
```

### 3. Build Development APK
Choose one:
```bash
# Option A: Build on local machine (faster)
npx expo run:android

# Option B: Build with EAS (cloud build)
npx eas build --profile development --platform android
```

### 4. Install on Physical Android Device
- Transfer the APK to your phone
- Enable "Install from Unknown Sources" in Android settings
- Install the APK
- **Important:** Must use a physical device, not an emulator!

### 5. Test Voice SOS
1. Open the app
2. Go to **Settings** tab
3. Enable **Voice Protection** (grant all permissions)
4. Go to **Test** tab (new tab with beaker icon 🧪)
5. Tap **"Simulate Help"** button 3 times within 5 seconds
6. ✅ SOS should trigger!

---

## 🧪 Using the Test Screen

The **Test** tab provides a visual interface for testing:

### Status Card
- **Engine**: Shows if voice protection is active
- **Last Keyword**: Last detected keyword
- **Detection Count**: Current count (resets after 5 seconds)
- **In Cooldown**: Whether system is in 60-second cooldown after SOS

### Test Buttons

1. **🎤 Simulate "Help"**
   - Manually adds 1 detection for keyword "help"
   - Tap 3 times within 5 seconds to trigger SOS

2. **🎤 Simulate "Bachao"**
   - Manually adds 1 detection for keyword "bachao"
   - Tap 3 times within 5 seconds to trigger SOS

3. **🚨 Trigger SOS Now (3×)**
   - Instantly simulates 3 rapid detections
   - **Sends REAL emergency alerts** (SMS, calls, WhatsApp, email)
   - Only use when you've informed test contacts!

4. **Reset Counter**
   - Clears detection count and cooldown
   - Useful for re-testing

5. **Run Automated Tests**
   - Runs 7 unit tests
   - Check console for results

---

## 🔧 Mock Mode vs. Real Mode

### Current Setup (Mock Mode)
**File:** `constants/voice.constants.ts`
```typescript
export const USE_MOCK_ENGINE = true; // ← Mock mode enabled
```

**What it does:**
- ✅ Foreground service runs (you see persistent notification)
- ✅ All permissions work (microphone, location, SMS, etc.)
- ✅ SOS flow works (GPS → SMS → Call → WhatsApp → Email)
- ❌ No actual voice detection from microphone
- ✅ Manual simulation via buttons instead

### Switching to Real Mode (Later)

When ready for production:

1. **Sign up for Picovoice** (free tier):
   - Go to https://console.picovoice.ai
   - Use personal/Gmail/university email (**company email NOT required!**)
   - Get Access Key from console

2. **Update constants:**
   ```typescript
   // constants/voice.constants.ts
   export const USE_MOCK_ENGINE = false; // ← Switch to real mode
   export const PICOVOICE_ACCESS_KEY = 'your-key-here';
   ```

3. **Train custom keywords** (optional but recommended):
   - Picovoice Console → Porcupine → Train Custom Wake Word
   - Train for "help" and "bachao" (Hindi)
   - Download `.ppn` model files
   - Place in `assets/voice-models/`
   - Update `voiceDetectionEngine.ts` to use `fromKeywordPaths`

4. **Rebuild:**
   ```bash
   npx expo prebuild --platform android --clean
   npx expo run:android
   ```

---

## 📱 What Happens When SOS Triggers?

The system executes these actions **in parallel**:

1. **📍 Location**: Gets current GPS coordinates (8s timeout, falls back to last known)
2. **📱 SMS**: Sends alert with location to emergency contacts
3. **📞 Phone Call**: Opens dialer to call primary contact
4. **💬 WhatsApp**: Opens WhatsApp with pre-filled SOS message
5. **📧 Email**: Opens email composer with location details

All actions happen simultaneously for fastest response time.

---

## 🛠️ Testing Checklist

Before each test session:

- [ ] Physical Android device connected (not emulator)
- [ ] Voice Protection enabled in Settings tab
- [ ] Test contact configured in app
- [ ] Test contact informed about incoming test alerts
- [ ] Notification visible ("Abhaya Voice Protection Active")
- [ ] Battery optimization disabled for app (Settings → Apps → Abhaya → Battery → Unrestricted)

---

## 🐛 Troubleshooting

### "Enable voice protection in Settings first!"
**Solution:** Go to Settings tab, toggle Voice Protection ON, grant all permissions.

### SOS triggered but no SMS/call?
**Solution:** Check permissions in Android Settings → Apps → Abhaya → Permissions. Ensure SMS, Phone, Location all granted.

### Counter resets before reaching 3?
**Solution:** Detections must occur within 5 seconds. Tap faster or use "Trigger SOS Now" button.

### App crashes on startup?
**Solution:** 
1. Run `npx expo prebuild --platform android --clean`
2. Rebuild APK
3. Uninstall old version from device
4. Install new APK

### "Plugin not found" errors in VS Code?
**Solution:** Run `npm install` first. These are expected before installation.

---

## 📚 Next Steps

1. ✅ **Test SOS flow** with mock mode
2. ✅ **Verify all permissions** work correctly
3. ✅ **Test foreground service** (lock screen, swipe away app, reboot device)
4. ✅ **Configure emergency contacts** in app
5. ✅ **Test location services** (GPS accuracy, fallback)
6. ⏱️ **Later:** Sign up for Picovoice and switch to real voice detection
7. ⏱️ **Later:** Train custom Hindi wake words for "bachao"
8. ⏱️ **Later:** Submit to Play Store (see `docs/VOICE_SOS_BUILD_GUIDE.md`)

---

## 📄 Additional Documentation

- **Full System Documentation**: `docs/VOICE_SOS_BUILD_GUIDE.md`
- **Architecture Overview**: See 4-layer system diagram in build guide
- **Test Utilities**: `services/voice/__tests__/voiceSOSTestUtils.ts`

---

## 💡 Pro Tips for Students

1. **Use Mock Mode for Development**: No need to rush Picovoice signup
2. **Test on Real Device**: Foreground services don't work properly in emulator
3. **Inform Test Contacts**: Avoid alarming people with test alerts
4. **Check Logs**: Use `npx react-native log-android` to see console output
5. **Battery Settings Matter**: Android will kill background services if battery optimization is enabled

---

## ✉️ Need Help?

- Check `docs/VOICE_SOS_BUILD_GUIDE.md` for detailed setup
- Review console logs: `npx react-native log-android`
- Run automated tests via Test screen
- Common issues are in Troubleshooting section above

**Remember:** You're using a mock engine, so everything works except actual microphone listening. Real voice detection comes later with Picovoice!

---

**Happy Testing! 🎉**
