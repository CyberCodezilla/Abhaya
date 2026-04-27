# Audio Assets for Abhaya Defense Features

Place the following audio files in this directory:

## Required Files

### 1. `ringtone.mp3`
- **Used by**: `fakeCallService.ts`
- **Description**: A standard Android/Indian phone ringtone.
- **Duration**: 5-10 seconds.
- **Source**: Any standard ringtone MP3.

### 2. `police_voice.mp3`
- **Used by**: `fakeCallService.ts`
- **Description**: A pre-recorded voice message simulating a police officer.
- **Duration**: 10-15 seconds.
- **Suggested Script (record this in a firm voice)**:
  > "This is Police Control Room, Delhi. We have received an emergency alert
  > from your location. Your GPS coordinates have been logged. A patrol vehicle
  > is approximately 2 minutes away. Please stay calm and stay on the line."
- **How to record**: Use any voice recorder app on your phone, then transfer the file here.

## Notes
- All files must be in `.mp3` format.
- Keep file sizes small (< 500KB each) for fast loading.
- These files are bundled into the app at build time (EAS Build).
