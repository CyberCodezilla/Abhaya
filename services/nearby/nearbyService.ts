/**
 * Nearby Help Service
 * Google Maps deep linking for finding nearby help
 * 
 * STRATEGY:
 * ═══════════════════════════════════════════════════════
 * 1. NO API CALLS - Zero billing, zero quotas, zero Play Store risks
 * 2. Use Google Maps search intents via Linking.openURL()
 * 3. Maps handles search, navigation, real-time data
 * 4. Hardcoded India emergency numbers always available
 * 
 * BENEFITS:
 * - No Google Cloud account needed
 * - No API key management
 * - No billing surprises
 * - Always works (Maps is pre-installed on Android)
 * - Better UX: user sees live map with navigation
 * ═══════════════════════════════════════════════════════
 */

import { INDIA_EMERGENCY_NUMBERS } from '@/constants/nearby.constants';
import { LocationData } from '@/types/emergency.types';
import * as Linking from 'expo-linking';

// ─────────────────────────────────────────────────────────
// GOOGLE MAPS DEEP LINKING
// ─────────────────────────────────────────────────────────

/**
 * Open Google Maps to search for nearby police stations
 * Maps handles the search, shows results, provides navigation
 * 
 * @param location User's current GPS location (optional, Maps uses device location if null)
 */
export async function openNearbyPoliceInMaps(location: LocationData | null = null): Promise<void> {
  try {
    let url: string;

    if (location) {
      // Search near specific coordinates
      const query = encodeURIComponent('police station');
      url = `https://www.google.com/maps/search/${query}/@${location.latitude},${location.longitude},15z`;
    } else {
      // Search near device's current location (Maps handles GPS)
      url = 'https://www.google.com/maps/search/police+station+near+me';
    }

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      console.warn('Cannot open Google Maps');
    }
  } catch (error) {
    console.error('Failed to open Maps for police search:', error);
  }
}

/**
 * Open Google Maps to search for nearby women helplines / NGOs
 * 
 * @param location User's current GPS location (optional)
 */
export async function openNearbyWomenHelplineInMaps(location: LocationData | null = null): Promise<void> {
  try {
    let url: string;

    if (location) {
      const query = encodeURIComponent('women helpline');
      url = `https://www.google.com/maps/search/${query}/@${location.latitude},${location.longitude},15z`;
    } else {
      url = 'https://www.google.com/maps/search/women+helpline+near+me';
    }

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      console.warn('Cannot open Google Maps');
    }
  } catch (error) {
    console.error('Failed to open Maps for women helpline search:', error);
  }
}

/**
 * Open Google Maps to search for nearby hospitals
 * (Useful for medical emergencies)
 * 
 * @param location User's current GPS location (optional)
 */
export async function openNearbyHospitalInMaps(location: LocationData | null = null): Promise<void> {
  try {
    let url: string;

    if (location) {
      const query = encodeURIComponent('hospital emergency');
      url = `https://www.google.com/maps/search/${query}/@${location.latitude},${location.longitude},15z`;
    } else {
      url = 'https://www.google.com/maps/search/hospital+emergency+near+me';
    }

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      console.warn('Cannot open Google Maps');
    }
  } catch (error) {
    console.error('Failed to open Maps for hospital search:', error);
  }
}

/**
 * Open Google Maps with navigation to user's shared location
 * (For emergency contacts to navigate to user)
 * 
 * @param location Target location coordinates
 */
export async function openNavigationToLocation(location: LocationData): Promise<void> {
  try {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
    
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      console.warn('Cannot open Google Maps navigation');
    }
  } catch (error) {
    console.error('Failed to open Maps navigation:', error);
  }
}

// ─────────────────────────────────────────────────────────
// INDIA EMERGENCY NUMBERS (Always Available Offline)
// ─────────────────────────────────────────────────────────

/**
 * Get all hardcoded India emergency numbers
 * These are always available, no internet/GPS needed
 * 
 * WHY: Guaranteed fallback when Maps/internet unavailable
 */
export function getIndiaEmergencyNumbers() {
  return Object.values(INDIA_EMERGENCY_NUMBERS);
}

/**
 * Dial an emergency number directly
 * Opens phone dialer with number pre-filled
 * 
 * @param number Phone number to dial (e.g., "100", "1091")
 */
export async function dialEmergencyNumber(number: string): Promise<void> {
  try {
    const url = `tel:${number}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      console.warn('Cannot open phone dialer');
    }
  } catch (error) {
    console.error('Failed to dial emergency number:', error);
  }
}

/**
 * Get user-friendly label for emergency number type
 */
export function getEmergencyNumberLabel(number: string): string {
  switch (number) {
    case '100':
      return 'Police Emergency';
    case '112':
      return 'Unified Emergency (SOS)';
    case '1091':
      return 'Women in Distress';
    case '7827170170':
      return 'NCW Women Helpline';
    case '1098':
      return 'Child Helpline';
    default:
      return 'Emergency';
  }
}

/**
 * Check if Google Maps is installed
 * (Almost always true on Android, but good to verify)
 */
export async function isGoogleMapsAvailable(): Promise<boolean> {
  try {
    const url = 'https://www.google.com/maps/search/test';
    return await Linking.canOpenURL(url);
  } catch {
    return false;
  }
}
