/**
 * Type definitions for Emergency Stages (Simplified)
 * No API dependencies - just progress tracking
 */

import { EmergencyContact } from './contact.types';

/**
 * Progress stages shown during SOS activation
 * Simplified 3-stage flow without API calls
 */
export type EmergencyStage =
  | 'locating'          // "Getting your location..."
  | 'preparing'         // "Preparing emergency alert..."
  | 'ready'             // "Ready to send"
  | 'sending';          // "Sending alerts..."

/**
 * Emergency alert package (simplified - no nearby results needed)
 * Re-exported from priorityService for backward compatibility
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
  /** Whether the package is fully prepared and ready to send */
  isReady: boolean;
}
