/**
 * Location Service
 * Handles all GPS and location-related operations
 * Pure functions that return ServiceResult for predictable error handling
 */

import { LOCATION_TIMEOUT } from '@/constants/emergency.constants';
import { LocationData, ServiceResult } from '@/types/emergency.types';
import { LocationOptions, LocationPermissionStatus } from '@/types/location.types';
import * as Location from 'expo-location';

/**
 * Request location permissions from user
 * WHY: Must request foreground permission before accessing GPS
 * Android: Prompts user if not already granted
 */
export async function requestLocationPermission(): Promise<ServiceResult<LocationPermissionStatus>> {
  try {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    
    return {
      success: true,
      data: {
        granted: status === 'granted',
        canAskAgain,
        message: status === 'granted' 
          ? 'Location permission granted' 
          : 'Location permission denied. Please enable in settings.',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to request location permission: ${error}`,
    };
  }
}

/**
 * Check if location permissions are already granted
 * WHY: Avoid unnecessary permission prompts
 */
export async function checkLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Get current GPS location with timeout
 * WHY: GPS can be slow, especially indoors. Timeout prevents infinite waiting.
 * RETURNS: LocationData or error
 */
export async function getCurrentLocation(
  options: LocationOptions = { accuracy: 'high', timeout: LOCATION_TIMEOUT }
): Promise<ServiceResult<LocationData>> {
  try {
    // Check permission first
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      return {
        success: false,
        error: 'Location permission not granted',
      };
    }

    // Map accuracy level to Expo's accuracy enum
    const accuracyMap = {
      low: Location.Accuracy.Low,
      balanced: Location.Accuracy.Balanced,
      high: Location.Accuracy.High,
      highest: Location.Accuracy.Highest,
    };

    // Get current position with timeout
    const location = await Location.getCurrentPositionAsync({
      accuracy: accuracyMap[options.accuracy],
      timeInterval: options.timeout || LOCATION_TIMEOUT,
      mayShowUserSettingsDialog: false, // Don't interrupt user
    });

    const locationData: LocationData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
    };

    return {
      success: true,
      data: locationData,
    };
  } catch (error) {
    return {
      success: false,
      error: `Unable to get location: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Generate Google Maps link from coordinates
 * WHY: Easy to share location via SMS/messages
 * FORMAT: https://maps.google.com/?q=lat,lng
 */
export function generateMapsLink(location: LocationData): string {
  return `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
}

/**
 * Get human-readable address from coordinates (reverse geocoding)
 * WHY: More helpful than coordinates for emergency contacts
 * NOTE: Requires internet connection, may fail
 */
export async function reverseGeocode(location: LocationData): Promise<ServiceResult<string>> {
  try {
    const addresses = await Location.reverseGeocodeAsync({
      latitude: location.latitude,
      longitude: location.longitude,
    });

    if (addresses.length > 0) {
      const address = addresses[0];
      // Format: Street, City, State, Postal Code
      const parts = [
        address.street,
        address.city,
        address.region,
        address.postalCode,
      ].filter(Boolean); // Remove null/undefined values

      return {
        success: true,
        data: parts.join(', ') || 'Address not available',
      };
    }

    return {
      success: false,
      error: 'No address found for location',
    };
  } catch (error) {
    return {
      success: false,
      error: `Geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Format location for display
 * WHY: Consistent formatting across app
 */
export function formatLocationForDisplay(location: LocationData): string {
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
}

/**
 * Check if device has location services enabled
 * WHY: Provide helpful error message before trying to get location
 */
export async function isLocationEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}
