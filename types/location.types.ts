/**
 * Type definitions for location services
 */

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  message?: string;
}

export interface LocationOptions {
  accuracy: 'low' | 'balanced' | 'high' | 'highest';
  timeout?: number; // milliseconds
  maximumAge?: number; // milliseconds - use cached location if available
}

export interface LocationTrackingOptions {
  intervalMs: number; // How often to update location
  distanceInterval?: number; // Minimum distance (meters) to trigger update
}
