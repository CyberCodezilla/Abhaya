/**
 * Type definitions for emergency-related functionality
 * These types ensure type safety across the SOS system
 */

export type SOSStatus = 'inactive' | 'countdown' | 'active';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
  address?: string; // Reverse geocoded address (if available)
  speed?: number | null; // Speed in m/s from GPS (multiply by 3.6 for km/h)
}

export interface SOSState {
  status: SOSStatus;
  activatedAt: number | null; // Unix timestamp
  location: LocationData | null;
  countdownSeconds: number; // For countdown UI
  lastLocationUpdate: number | null;
}

// EmergencyContact moved to contact.types.ts for better organization

export interface SOSMessage {
  text: string;
  location: LocationData | null;
  timestamp: number;
  mapsLink: string | null;
}

/**
 * Service response pattern for error handling
 * Success: { success: true, data: T }
 * Failure: { success: false, error: string }
 */
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
