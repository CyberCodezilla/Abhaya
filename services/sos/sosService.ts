/**
 * SOS Service
 * Core emergency orchestration logic
 * Handles SOS state transitions and emergency message formatting
 */

import {
  DEFAULT_SOS_MESSAGE,
  LOCATION_LOADING_MESSAGE,
  LOCATION_UNAVAILABLE_MESSAGE
} from '@/constants/emergency.constants';
import { getBatteryStatusString } from '@/services/battery/batteryService';
import { generateMapsLink, reverseGeocode } from '@/services/location/locationService';
import { LocationData, SOSMessage, ServiceResult } from '@/types/emergency.types';

/**
 * Format SOS message with location data
 * WHY: Standardized emergency message format for SMS/sharing
 * RETURNS: Formatted message with coordinates, maps link, and timestamp
 */
export async function formatSOSMessage(
  location: LocationData | null,
  customMessage?: string,
  imei?: string | null
): Promise<SOSMessage> {
  const timestamp = Date.now();
  const baseMessage = customMessage || DEFAULT_SOS_MESSAGE;

  // Fetch battery info in parallel with geocoding
  const batteryString = await getBatteryStatusString();

  // If no location available
  if (!location) {
    return {
      text:
        `${baseMessage}\n${LOCATION_UNAVAILABLE_MESSAGE}\n` +
        `\n${batteryString}` +
        (imei ? `\n📱 Device IMEI: ${imei}` : '') +
        `\n\n🕒 Time: ${new Date(timestamp).toLocaleString()}`,
      location: null,
      timestamp,
      mapsLink: null,
    };
  }

  // Build message with location
  const mapsLink = generateMapsLink(location);
  const coordinates = `📍 Lat: ${location.latitude.toFixed(6)}, Long: ${location.longitude.toFixed(6)}`;

  // Speed (if available from GPS)
  const speedLine = location.speed != null && location.speed > 0
    ? `\n🚗 Speed: ${(location.speed * 3.6).toFixed(1)} km/h`
    : '';

  // Try to get address (may fail if no internet)
  let addressLine = '';
  const addressResult = await reverseGeocode(location);
  if (addressResult.success) {
    addressLine = `\n📍 Address: ${addressResult.data}`;
  }

  const imeiLine = imei ? `\n📱 Device IMEI: ${imei}` : '';

  const message =
    `${baseMessage}\n` +
    `${coordinates}` +
    `${addressLine}\n` +
    `${speedLine}` +
    `\n📱 View on map: ${mapsLink}\n` +
    `\n${batteryString}` +
    `${imeiLine}\n` +
    `\n🕒 Time: ${new Date(timestamp).toLocaleString()}\n` +
    `\nSent from ABHAYA - Women Safety App`;

  return {
    text: message,
    location,
    timestamp,
    mapsLink,
  };
}

/**
 * Format loading message (when getting location)
 * WHY: Provide immediate feedback to user while GPS is acquiring
 */
export function formatLoadingMessage(): string {
  return `${DEFAULT_SOS_MESSAGE}\n${LOCATION_LOADING_MESSAGE}`;
}

/**
 * Validate phone number format
 * WHY: Ensure phone numbers are valid before attempting to send SMS
 * FORMAT: Accepts Indian mobile numbers (10 digits) or international format
 */
export function validatePhoneNumber(phone: string): ServiceResult<string> {
  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Check for Indian mobile number (10 digits starting with 6-9)
  const indianPattern = /^[6-9]\d{9}$/;
  if (indianPattern.test(cleaned)) {
    return { success: true, data: `+91${cleaned}` }; // Add country code
  }

  // Check for international format (+CC followed by digits)
  const internationalPattern = /^\+\d{10,15}$/;
  if (internationalPattern.test(cleaned)) {
    return { success: true, data: cleaned };
  }

  return {
    success: false,
    error: 'Invalid phone number. Use 10-digit Indian mobile or international format with country code.',
  };
}

/**
 * Calculate distance between two coordinates (in meters)
 * WHY: Useful for location tracking (detect if user is moving)
 * USES: Haversine formula for accuracy
 */
export function calculateDistance(
  loc1: LocationData,
  loc2: LocationData
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (loc1.latitude * Math.PI) / 180;
  const φ2 = (loc2.latitude * Math.PI) / 180;
  const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Log SOS activation for analytics/debugging
 * WHY: Track SOS usage patterns (production: send to analytics)
 * DEV ONLY: Will be replaced with proper logging service
 */
export function logSOSActivation(
  location: LocationData | null,
  reason: 'button' | 'voice' | 'shake' | 'auto'
): void {
  const log = {
    timestamp: new Date().toISOString(),
    reason,
    hasLocation: location !== null,
    location: location ? {
      lat: location.latitude,
      lng: location.longitude,
      accuracy: location.accuracy,
    } : null,
  };

  // In development: console log
  if (__DEV__) {
    console.log('🚨 SOS ACTIVATED:', log);
  }

  // In production: Send to analytics service
  // TODO: Implement analytics service
}
