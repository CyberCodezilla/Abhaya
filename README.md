# 🛡️ ABHAYA — Women's Safety Application

> **ABHAYA** (Sanskrit: अभय — *fearlessness*) is a real-time women's safety mobile app for Android. It silently triggers an SOS pipeline via voice command, phone shake, or a manual button press — sending GPS-pinned SMS alerts to emergency contacts, starting stealth evidence recording, and simulating a fake police call to deter attackers.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🎙️ **Voice SOS** | Say *"Help"* or *"Bachao"* — Porcupine wake-word engine detects it offline, even in background |
| 📳 **Shake SOS** | Shake phone with >2.5g force to instantly trigger SOS |
| 🔴 **Manual SOS** | Big red SOS button on the home screen with 3-second countdown |
| 📍 **GPS Alerts** | Live GPS coordinates sent with every SOS message via Google Maps link |
| 📱 **SMS Alerts** | Sends alert to all emergency contacts via Twilio (backend) or native SMS (fallback) |
| 🎥 **Stealth Recording** | Silently starts camera + audio recording as evidence the moment SOS fires |
| 📞 **Fake Police Call** | Plays a realistic police ringtone 15 seconds after SOS to deter the attacker |
| 🚔 **Nearby Police** | Finds nearest police stations using preloaded offline data |
| 🔋 **Battery Info** | Battery % included in every SOS message |
| 🔕 **Background Mode** | Runs as Android Foreground Service — works even when app is minimized |

---

## 🏗️ Project Architecture

```
abhaya/
├── app/                        # Expo Router screens (file-based routing)
│   ├── (tabs)/
│   │   ├── index.tsx           # 🏠 Home screen — SOS button, status
│   │   ├── explore.tsx         # 🗺️ Nearby police stations map
│   │   ├── settings.tsx        # ⚙️ Emergency contacts, IMEI, preferences
│   │   └── voice-test.tsx      # 🎙️ Voice engine debug screen
│   └── setup.tsx               # 👋 First-launch onboarding
│
├── services/                   # Core feature services
│   ├── sos/
│   │   └── sosOrchestrator.ts  # ⚡ Master SOS pipeline (all triggers wire here)
│   ├── voice/                  # Porcupine voice engine
│   ├── shake/                  # Accelerometer shake detection
│   ├── sms/                    # SMS sending (backend → native fallback)
│   ├── evidence/               # Stealth camera + audio recording
│   ├── defense/                # Fake police call service
│   ├── location/               # GPS location service
│   ├── nearby/                 # Nearby police station finder
│   ├── contacts/               # Emergency contacts CRUD
│   └── alerts/                 # Alert formatting & logging
│
├── backend/                    # Node.js/Express SMS backend
│   ├── server.js               # Express server (Twilio SMS API)
│   └── .env.example            # 👈 Copy this to .env and fill in keys
│
├── constants/
│   ├── voice.constants.ts      # Picovoice key, wake words, sensitivity
│   └── config.ts               # Feature flags, colors, storage keys
│
├── assets/
│   └── data/
│       └── police_stations.json  # Offline police station database
│
└── android/
    └── app/src/main/assets/
        └── porcupine/          # 📁 Place .ppn wake-word model files here
```

---

## 🔄 SOS Trigger Flow

```
[Trigger]  →  shake / voice ("Help"/"Bachao") / manual button
     ↓
[Cooldown Check]  →  60s cooldown to prevent accidental double-fire
     ↓
[Step 1]  →  Get GPS coordinates (high accuracy, 8s timeout)
[Step 2]  →  Get IMEI from secure storage
[Step 3]  →  Get battery percentage
[Step 4]  →  Format SOS message (GPS link + battery + IMEI)
[Step 5]  →  Start stealth camera + audio recording (background)
[Step 6]  →  Send SMS to all contacts  →  Twilio backend
                                      ↘  Native SMS fallback (if backend down)
[Step 7]  →  After 15 seconds: Play fake police call ringtone
[Step 8]  →  Log activation to SOS history
```

---

## 🚀 Local Setup Guide

> **Tell your Copilot:** *"Set up this project exactly as described in the README. Follow each step in order. Ask me when it says '[USER INPUT REQUIRED]'."*

---

### Prerequisites

Make sure the following are installed before you start:

| Tool | Version | Download |
|---|---|---|
| Node.js | 18 or 20 (LTS) | https://nodejs.org |
| Git | Latest | https://git-scm.com |
| Android Studio | Latest | https://developer.android.com/studio |
| Java JDK | 17 | Installed with Android Studio |
| Expo CLI | Latest | `npm install -g expo-cli` |
| EAS CLI | Latest | `npm install -g eas-cli` |

> **Windows users:** Use **PowerShell** or **Git Bash** for all commands below.

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/CyberCodezilla/Abhaya.git
cd Abhaya
```

---

### Step 2 — Install Frontend Dependencies

```bash
npm install
```

> This installs all React Native, Expo, and Porcupine packages. Takes 1–3 minutes.

---

### Step 3 — Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

---

### Step 4 — Configure Backend Environment (Twilio)

```bash
cd backend
copy .env.example .env
```

Now open `backend/.env` and fill in your Twilio credentials:

```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_MESSAGING_SERVICE_SID=your_messaging_service_sid_here
TWILIO_FROM_NUMBER=+1XXXXXXXXXX
PORT=3000
```

> **[USER INPUT REQUIRED]** Get free Twilio credentials at https://www.twilio.com/try-twilio
> - `TWILIO_ACCOUNT_SID` → Found on your Twilio Console dashboard
> - `TWILIO_AUTH_TOKEN` → Found on your Twilio Console dashboard
> - `TWILIO_MESSAGING_SERVICE_SID` → Twilio Console → Messaging → Services → Create
> - `TWILIO_FROM_NUMBER` → A Twilio phone number you purchased/verified

> ⚠️ **If you don't have Twilio**, the app will automatically fall back to native device SMS. Just leave the `.env` as-is but the backend server must still run.

---

### Step 5 — Configure Voice Detection (Porcupine)

#### 5a — Get your Picovoice Access Key

1. Go to https://console.picovoice.ai/
2. Sign up (any email — free tier is enough)
3. Copy your **Access Key** from the dashboard

#### 5b — Add the key to the app

Open `constants/voice.constants.ts` and replace the placeholder:

```ts
export const PICOVOICE_ACCESS_KEY = 'YOUR_ACTUAL_KEY_HERE';
```

#### 5c — Download Wake-Word Model Files

> **[USER INPUT REQUIRED]** You must manually download these:

1. Go to https://console.picovoice.ai/ → **Wake Word** → **Train a Custom Wake Word**
2. **File 1:**
   - Keyword: `help`
   - Language: **English**
   - Platform: **Android**
   - Download → Rename to `help_android.ppn`
3. **File 2:**
   - Keyword: `bachao`
   - Language: **Hindi**
   - Platform: **Android**
   - Download → Rename to `bachao_android.ppn`
4. Place **both files** in:
   ```
   android/app/src/main/assets/porcupine/
   ```

> **🚧 Skipping voice for now?** Open `constants/voice.constants.ts` and set:
> ```ts
> export const USE_MOCK_ENGINE = true;
> ```
> This lets you test everything else (SOS button, shake, SMS) without voice detection.

---

### Step 6 — Log in to Expo & EAS

```bash
npx eas login
```

> **[USER INPUT REQUIRED]** Enter your Expo account credentials.
> Don't have one? Sign up free at https://expo.dev

---

### Step 7 — Start the Backend Server

Open a **new terminal window** and run:

```bash
cd backend
npm run dev
```

You should see:
```
🚀 Abhaya Backend running on port 3000
```

> ⚠️ **Keep this terminal open.** The backend must be running for Twilio SMS to work.

---

### Step 8 — Find your Local IP Address

The app on your phone needs to connect to your backend. Find your machine's local IP:

**Windows:**
```powershell
ipconfig
```
Look for `IPv4 Address` under your Wi-Fi adapter (e.g., `192.168.1.5`)

**Mac/Linux:**
```bash
ifconfig | grep inet
```

Now open `services/sms/smsService.ts` (or wherever the backend URL is configured) and update the IP to match your machine. Example:
```ts
const BACKEND_URL = 'http://192.168.1.5:3000';
```

> ⚠️ Your phone and your PC must be on the **same Wi-Fi network**.

---

### Step 9 — Build and Run the App

#### Option A — Build APK via EAS (Recommended for real device)

```bash
npx eas build --platform android --profile development
```

> **[USER INPUT REQUIRED]**
> - EAS will ask: *"Generate a new Android Keystore?"* → Type **`Y`** and press Enter
> - Wait 5–10 minutes for the cloud build to complete
> - Download the `.apk` from the link EAS provides
> - Transfer the APK to your Android device and install it

#### Option B — Run with Expo Go (Limited — no voice detection)

```bash
npx expo start
```

> Scan the QR code with the **Expo Go** app on your phone.
> ⚠️ Voice detection will NOT work in Expo Go — use Option A for full features.

---

### Step 10 — First Launch Setup

On first launch, the app will walk you through:

1. ✅ **Grant permissions** — Location, Microphone, Camera, SMS (tap **Allow** for all)
2. ✅ **Add emergency contacts** — Settings tab → Add at least one contact with their phone number
3. ✅ **Enter your IMEI** — Settings → Device Info (dial `*#06#` on your phone to find it)
4. ✅ **Enable voice detection** — Settings → Voice SOS → Toggle ON

---

## 🧪 Testing the App

| Test | How |
|---|---|
| **Manual SOS** | Press the red SOS button → wait 3s countdown → SOS fires |
| **Shake SOS** | Shake your phone hard 3 times rapidly |
| **Voice SOS** | Say *"Help"* clearly (or *"Bachao"* in Hindi) |
| **Cancel SOS** | Press **Cancel** within the 3-second countdown window |
| **SMS Check** | After SOS fires, check if your emergency contact received an SMS |
| **Fake Call** | Wait 15 seconds after SOS — a fake police ringtone should play |

---

## 🔑 Credentials Summary

| Key | Where to get it | Where to put it |
|---|---|---|
| Twilio Account SID | twilio.com console | `backend/.env` |
| Twilio Auth Token | twilio.com console | `backend/.env` |
| Twilio Messaging Service SID | twilio.com console | `backend/.env` |
| Twilio Phone Number | twilio.com console | `backend/.env` |
| Picovoice Access Key | console.picovoice.ai | `constants/voice.constants.ts` |
| `.ppn` model files | console.picovoice.ai | `android/app/src/main/assets/porcupine/` |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Mobile App** | React Native + Expo (SDK 54) |
| **Language** | TypeScript |
| **Navigation** | Expo Router (file-based) |
| **Storage** | MMKV (fast) + AsyncStorage |
| **Voice Detection** | Picovoice Porcupine |
| **Accelerometer** | expo-sensors |
| **SMS** | Twilio API (backend) + expo-sms (fallback) |
| **Location** | expo-location |
| **Camera/Audio** | expo-camera + expo-av |
| **Background Service** | Android Foreground Service (Kotlin) |
| **Backend** | Node.js + Express |

---

## ⚠️ Common Issues & Fixes

| Problem | Fix |
|---|---|
| `Unable to connect to backend` | Make sure backend is running and IP address in app matches your machine's local IP |
| `Voice detection not working` | Check `.ppn` files are in the right folder, or set `USE_MOCK_ENGINE = true` |
| `SMS not sending` | Check Twilio credentials in `backend/.env`; verify phone number format is `+91XXXXXXXXXX` |
| `Location permission denied` | Go to phone Settings → Apps → Abhaya → Permissions → Allow Location (Always) |
| `App crashes on open` | Run `npm install` again; check all permissions are granted |
| `Keystore error on EAS build` | Delete `android/` folder and rebuild — EAS will regenerate it |

---

## 👥 Team

Developed as a Second Year Mini Project — **OSCILATIONS '26 Winner 🏆**

---

## 📄 License

Private — Academic project. All rights reserved.
