/**
 * Priority Routing Service (Simplified)
 * Builds emergency alert packages without API dependencies
 * 
 * PRIORITY ORDER:
 * ═══════════════════════════════════════════════════════
 *   Priority 1 → User's pre-saved trusted contacts
 *   Priority 2 → India emergency numbers (100, 1091, 112)
 *   Priority 3 → Google Maps deep links for nearby help
 * ═══════════════════════════════════════════════════════
 * 
 * WHY this order?
 * - Personal contacts respond fastest (pre-alerted, care about user)
 * - Emergency numbers always work (no GPS needed)
 * - Maps deep links for finding nearby physical help
 */

// Import dependencies
import { getEmergencyContacts } from '@/services/contacts/contactsService';
import { generateMapsLink, reverseGeocode } from '@/services/location/locationService';
import { findNearestPoliceStationsOffline, PoliceStation } from '@/services/nearby/offlineNearbyService';
import { EmergencyContact } from '@/types/contact.types';
import { LocationData, SOSMessage } from '@/types/emergency.types';

/**
 * Emergency alert package (simplified - no nearby results needed)
 */
export interface EmergencyAlertPackage {
  /** Pre-formatted help message with all details */
  message: string;
  /** Google Maps link of user's current location */
  userLocationLink: string;
  /** Timestamp of SOS activation */
  timestamp: number;
  /** Reverse-geocoded address if available */
  address: string | null;
  /** User's personal emergency contacts */
  personalContacts: EmergencyContact[];
  /** Nearest detected offline police station */
  nearestPoliceStation: PoliceStation | null;
  /** Whether the package is fully prepared and ready to send */
  isReady: boolean;
}

/**
 * Build the complete emergency alert package
 * Called after SOS activation + location acquisition
 * 
 * @param location  User's current GPS location
 * @returns Complete alert package ready for user confirmation
 */
export async function buildAlertPackage(
  location: LocationData | null
): Promise<EmergencyAlertPackage> {
  // ── 1. Build Maps Link ──
  const userLocationLink = location ? generateMapsLink(location) : '';

  // ── 2. Reverse Geocode Address ──
  let address: string | null = null;
  if (location) {
    try {
      const geoResult = await reverseGeocode(location);
      if (geoResult.success) {
        address = geoResult.data;
      }
    } catch {
      // Non-critical, continue without address
    }
  }

  // ── 3. Get Personal Contacts ──
  let personalContacts: EmergencyContact[] = [];
  try {
    const result = await getEmergencyContacts();
    if (result.success && result.data.length > 0) {
      // Sort: primary first, then others
      personalContacts = [
        ...result.data.filter((c: EmergencyContact) => c.isPrimary),
        ...result.data.filter((c: EmergencyContact) => !c.isPrimary),
      ];
    }
  } catch (error) {
    console.warn('Failed to load personal contacts:', error);
  }

  // ── 4. Find Nearest Police Station (OFFLINE) ──
  let nearestPoliceStation: PoliceStation | null = null;
  if (location) {
    const nearby = findNearestPoliceStationsOffline(location, 1);
    if (nearby.length > 0) {
      nearestPoliceStation = nearby[0];
    }
  }

  // ── 5. Build Alert Message ──
  const timestamp = Date.now();
  const message = buildEmergencyMessage(location, address, userLocationLink, timestamp, nearestPoliceStation);

  return {
    message,
    userLocationLink,
    timestamp,
    address,
    personalContacts,
    nearestPoliceStation,
    isReady: true,
  };
}

import { getStoredIMEI } from '@/services/sos/sosOrchestrator';

/**
 * Build the emergency message text
 * This is the pre-drafted message sent via SMS/WhatsApp/Email
 */
function buildEmergencyMessage(
  location: LocationData | null,
  address: string | null,
  mapsLink: string,
  timestamp: number,
  nearestPolice?: PoliceStation | null
): string {
  const time = new Date(timestamp).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  // GSM-7 Encoding limits us to 160 characters per SMS credit.
  // Using \n (newlines) is clean and only costs 1 character.
  // NO emojis — it drops the limit to 70 chars and triggers India DLT spam filters!
  
  let msg = 'I AM IN DANGER. HELP ME. SHOW THIS MESSAGE TO POLICE.\n';

  if (location) {
    msg += `Lat: ${location.latitude.toFixed(5)}, Lng: ${location.longitude.toFixed(5)}\n`;
    msg += `Map: https://maps.google.com/?q=${location.latitude},${location.longitude}\n`;
  } else {
    msg += 'Location: Unavailable\n';
  }

  const imei = getStoredIMEI();
  if (imei) {
    msg += `IMEI: ${imei}\n`;
  }

  if (nearestPolice) {
    msg += `Nearest PS: ${nearestPolice.name}\n`;
    msg += `PS Phone: ${nearestPolice.phone}\n`;
  }

  msg += 'Sent from Abhaya App';

  return msg;
}

/**
 * Convert EmergencyAlertPackage message to SOSMessage format
 * WHY: The existing alertService expects SOSMessage type
 */
export function packageToSOSMessage(
  pkg: EmergencyAlertPackage,
  location: LocationData | null
): SOSMessage {
  return {
    text: pkg.message,
    location,
    timestamp: pkg.timestamp,
    mapsLink: pkg.userLocationLink || null,
  };
}
