/**
 * Voice SOS Service (Layer 3 — SOS Engine)
 * ═══════════════════════════════════════════════════════
 * Orchestrates the full SOS flow when triggered by voice detection.
 *
 * EXECUTION ORDER (parallel where possible):
 * 1. Get GPS location (or last known)
 * 2. Format Google Maps link
 * 3. Send SMS to all emergency contacts (with retry)
 * 4. Initiate phone call to primary contact
 * 5. Open WhatsApp with emergency message
 * 6. Send email alert
 *
 * FAIL-SAFE:
 * - Retry SMS once on failure
 * - Fall back to last known location if GPS fails
 * - Log all errors without crashing
 * - Cooldown prevents re-trigger for 60s
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as MailComposer from 'expo-mail-composer';
import * as SMS from 'expo-sms';
import { Linking } from 'react-native';

import { WHATSAPP_URL_SCHEME } from '@/constants/alert.constants';
import { getEmergencyContacts } from '@/services/contacts/contactsService';
import { generateMapsLink } from '@/services/location/locationService';
import { logSOSActivation } from '@/services/sos/sosService';
import { enterCooldown } from '@/services/voice/keywordCounterService';
import { sendSOSToAllContacts } from '@/services/sms/smsService';
import { PoliceStation } from '@/services/nearby/offlineNearbyService';
import { EmergencyContact } from '@/types/contact.types';
import { LocationData } from '@/types/emergency.types';
import { VoiceSOSTriggerResult } from '@/types/voice.types';

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

export interface VoiceSOSResult {
  success: boolean;
  location: LocationData | null;
  mapsLink: string | null;
  smsSent: boolean;
  smsError: string | null;
  callInitiated: boolean;
  whatsappOpened: boolean;
  emailSent: boolean;
  errors: string[];
}

// ─────────────────────────────────────────────────────────
// LAST KNOWN LOCATION CACHE
// ─────────────────────────────────────────────────────────

const LAST_LOCATION_KEY = '@abhaya:last_known_location';

/**
 * Cache location for fallback usage
 */
export async function cacheLocation(location: LocationData): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(location));
  } catch {
    // Non-critical
  }
}

/**
 * Get cached last known location
 */
async function getLastKnownLocation(): Promise<LocationData | null> {
  try {
    const stored = await AsyncStorage.getItem(LAST_LOCATION_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Non-critical
  }
  return null;
}

// ─────────────────────────────────────────────────────────
// MAIN SOS TRIGGER
// ─────────────────────────────────────────────────────────

/**
 * Execute the full SOS flow triggered by voice detection.
 * This runs when the keyword counter reaches threshold.
 *
 * @param triggerResult  The trigger result from keywordCounterService
 * @returns VoiceSOSResult with status of each action
 */
export async function executeVoiceSOS(
  triggerResult: VoiceSOSTriggerResult,
  nearestPolice: PoliceStation | null = null
): Promise<VoiceSOSResult> {
  const errors: string[] = [];
  let location: LocationData | null = null;
  let mapsLink: string | null = null;
  let smsSent = false;
  let smsError: string | null = null;
  let callInitiated = false;
  let whatsappOpened = false;
  let emailSent = false;

  // Enter cooldown immediately
  enterCooldown();

  // Log SOS activation
  logSOSActivation(null, 'voice');

  if (__DEV__) {
    console.log('[VoiceSOS] 🚨 Executing voice-triggered SOS...');
  }

  // ── Step 1: Get GPS Location ──
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 8000,
    });
    location = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      timestamp: loc.timestamp,
    };
    // Cache for future fallback
    await cacheLocation(location);
  } catch (error) {
    console.warn('[VoiceSOS] GPS failed, trying last known location');
    errors.push(`GPS failed: ${error instanceof Error ? error.message : 'Unknown'}`);

    // Fallback: last known
    try {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        location = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          accuracy: lastKnown.coords.accuracy,
          timestamp: lastKnown.timestamp,
        };
      }
    } catch {
      // Try cached
      location = await getLastKnownLocation();
    }
  }

  // ── Step 2: Format Maps Link ──
  if (location) {
    mapsLink = generateMapsLink(location);
  }

  // ── Step 3: Build SOS Message ──
  const sosMessage = buildVoiceSOSMessage(location, mapsLink, triggerResult);

  // ── Step 4: Get Emergency Contacts ──
  let contacts: EmergencyContact[] = [];
  try {
    const result = await getEmergencyContacts();
    if (result.success && result.data.length > 0) {
      contacts = [
        ...result.data.filter((c) => c.isPrimary),
        ...result.data.filter((c) => !c.isPrimary),
      ];
    }
  } catch (error) {
    errors.push(`Failed to load contacts: ${error}`);
  }

  if (contacts.length === 0) {
    errors.push('No emergency contacts configured');
    return {
      success: false,
      location,
      mapsLink,
      smsSent: false,
      smsError: 'No contacts',
      callInitiated: false,
      whatsappOpened: false,
      emailSent: false,
      errors,
    };
  }

  // ── Step 5: Send SMS (with retry) ──
  const smsResult = await sendSOSSms(contacts, sosMessage);
  smsSent = smsResult.sent;
  smsError = smsResult.error;
  if (smsResult.error) errors.push(smsResult.error);

  // ── Step 6: Initiate Phone Call (Priority: Police Station, Fallback: Primary Contact) ──
  const dialNumber = nearestPolice?.phone || contacts[0].phoneNumber || '112';
  
  if (__DEV__) {
    console.log(`[VoiceSOS] 📞 Initiating emergency call to: ${dialNumber}`);
  }
  
  callInitiated = await initiateEmergencyCall(dialNumber);
  if (!callInitiated) {
    errors.push('Failed to initiate emergency call');
  }

  const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];

  // ── Step 7: Open WhatsApp ──
  whatsappOpened = await openWhatsAppSOS(primaryContact.phoneNumber, sosMessage);
  if (!whatsappOpened) {
    errors.push('Failed to open WhatsApp');
  }

  // ── Step 8: Send Email ──
  const emailContacts = contacts.filter((c) => c.email);
  if (emailContacts.length > 0) {
    emailSent = await sendSOSEmail(emailContacts, sosMessage);
    if (!emailSent) {
      errors.push('Failed to send email');
    }
  }

  const result: VoiceSOSResult = {
    success: smsSent || callInitiated || whatsappOpened || emailSent,
    location,
    mapsLink,
    smsSent,
    smsError,
    callInitiated,
    whatsappOpened,
    emailSent,
    errors,
  };

  if (__DEV__) {
    console.log('[VoiceSOS] SOS execution result:', result);
  }

  return result;
}

// ─────────────────────────────────────────────────────────
// SOS MESSAGE BUILDER
// ─────────────────────────────────────────────────────────

function buildVoiceSOSMessage(
  location: LocationData | null,
  mapsLink: string | null,
  trigger: VoiceSOSTriggerResult
): string {
  const time = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  let msg = '🚨 EMERGENCY SOS — ABHAYA (VOICE TRIGGERED) 🚨\n\n';
  msg += 'I may be in danger! This alert was triggered automatically by voice detection.\n';
  msg += `Detected keyword: "${trigger.keyword}" (${trigger.detectionCount} times)\n\n`;

  if (location) {
    msg += `📍 My Location:\n`;
    msg += `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}\n`;
    if (mapsLink) {
      msg += `\n🗺️ View on Map:\n${mapsLink}\n`;
    }
  } else {
    msg += '📍 Location: Could not determine — GPS unavailable\n';
  }

  msg += `\n🕒 Time: ${time}\n`;
  msg += `\n📱 Sent via ABHAYA — Women Safety App\n`;
  msg += 'Please respond IMMEDIATELY or call emergency services.';

  return msg;
}

// ─────────────────────────────────────────────────────────
// SMS (with retry)
// ─────────────────────────────────────────────────────────

async function sendSOSSms(
  contacts: EmergencyContact[],
  message: string
): Promise<{ sent: boolean; error: string | null }> {
  try {
    // USE OUR SMS SERVICE WHICH HANDLES TWILIO (DIRECT BACKGROUND SENDING)
    const result = await sendSOSToAllContacts(message);
    
    if (result.success) {
      return { sent: true, error: null };
    }
    
    return { sent: false, error: result.error || 'Failed to send direct SMS' };
  } catch (error) {
    return {
      sent: false,
      error: `SMS service error: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

// ─────────────────────────────────────────────────────────
// PHONE CALL
// ─────────────────────────────────────────────────────────

async function initiateEmergencyCall(phoneNumber: string): Promise<boolean> {
  try {
    const url = `tel:${phoneNumber}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[VoiceSOS] Call failed:', error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────
// WHATSAPP
// ─────────────────────────────────────────────────────────

async function openWhatsAppSOS(
  phoneNumber: string,
  message: string
): Promise<boolean> {
  try {
    const cleanNumber = phoneNumber.replace('+', '');
    const encodedMessage = encodeURIComponent(message);
    const url = `${WHATSAPP_URL_SCHEME}?phone=${cleanNumber}&text=${encodedMessage}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[VoiceSOS] WhatsApp failed:', error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────
// EMAIL
// ─────────────────────────────────────────────────────────

async function sendSOSEmail(
  contacts: EmergencyContact[],
  message: string
): Promise<boolean> {
  try {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) return false;

    const recipients = contacts
      .filter((c) => c.email)
      .map((c) => c.email as string);

    if (recipients.length === 0) return false;

    const result = await MailComposer.composeAsync({
      recipients,
      subject: '🚨 EMERGENCY SOS — ABHAYA (Voice Triggered)',
      body: message,
    });

    return result.status === 'sent';
  } catch (error) {
    console.error('[VoiceSOS] Email failed:', error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
