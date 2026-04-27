/**
 * Fake Police Call Service (Offline Defense / Deception)
 */

import { Audio } from 'expo-av';

// ─── State ────────────────────────────────────────────────────────────────────

let fakeCallSound: Audio.Sound | null = null;
let isCallActive = false;

// ─── Asset Mapping ────────────────────────────────────────────────────────────

// NOTE: require() statements must be static for React Native's bundler.
const RINGTONES: Record<string, any> = {
    ios: require('@/assets/sounds/iphone_ringtone.mp3'),
    samsung: require('@/assets/sounds/samsung_ringtone.mp3'),
    realme: require('@/assets/sounds/realme_ringtone.mp3'),
    stock: require('@/assets/sounds/iphone_ringtone.mp3'), // use iphone as universal fallback
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Plays the ringtone specific to the selected theme (Incoming state)
 */
export async function playRingtone(theme: string = 'ios'): Promise<void> {
    isCallActive = true;
    try {
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: false,
        });

        const asset = RINGTONES[theme] || RINGTONES.stock;

        const { sound } = await Audio.Sound.createAsync(
            asset,
            { isLooping: true, volume: 1.0, shouldPlay: true }
        );
        fakeCallSound = sound;
        console.log(`[FakeCall] 📞 Ringing with ${theme} theme...`);
    } catch (error) {
        console.error('[FakeCall] Error playing ringtone:', error);
    }
}

/**
 * Stops ringtone and plays police voice (Active state)
 */
export async function playPoliceVoice(): Promise<void> {
    if (fakeCallSound) {
        try {
            await fakeCallSound.stopAsync();
            await fakeCallSound.unloadAsync();
        } catch {}
    }

    try {
        // Fallback or early return if asset is missing 
        // In a real app, this would be handled by the bundler/require error
        const { sound: voice } = await Audio.Sound.createAsync(
            require('@/assets/sounds/police_voice.mp3'),
            { isLooping: false, volume: 1.0, shouldPlay: true }
        );
        fakeCallSound = voice;
        console.log('[FakeCall] 🚔 Playing police voice message...');

        voice.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
                stopFakeCall();
            }
        });
    } catch (error) {
        console.error('[FakeCall] Error playing voice (file might be missing):', error);
        // If voice fails, we still consider the call "active" but silent, 
        // though it's better to just log and return.
    }
}

/**
 * Stops all audio
 */
export async function stopFakeCall(): Promise<void> {
    if (fakeCallSound) {
        try {
            await fakeCallSound.stopAsync();
            await fakeCallSound.unloadAsync();
        } catch { }
        fakeCallSound = null;
    }
    isCallActive = false;
    console.log('[FakeCall] Stopped.');
}
