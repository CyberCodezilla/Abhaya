/**
 * Type definitions for emergency contacts
 */

/**
 * Delivery methods for emergency alerts
 */
export type AlertMethod = 'sms' | 'whatsapp' | 'email';

/**
 * Emergency contact with preferred alert methods
 */
export interface EmergencyContact {
  id: string; // UUID
  name: string;
  phoneNumber: string; // Validated format: +91XXXXXXXXXX or international
  email?: string; // Optional email address
  alertMethods: AlertMethod[]; // Preferred ways to receive alerts
  isPrimary: boolean; // Primary contact (sent first)
  relationship?: string; // Optional: Mother, Father, Friend, etc.
  createdAt: number; // Unix timestamp
  updatedAt: number;
}

/**
 * Result of sending alert to a contact
 */
export interface AlertResult {
  contactId: string;
  contactName: string;
  method: AlertMethod;
  success: boolean;
  error?: string;
  sentAt: number;
}

/**
 * Summary of all alerts sent during SOS
 */
export interface AlertSummary {
  totalContacts: number;
  successfulAlerts: number;
  failedAlerts: number;
  results: AlertResult[];
  sosActivatedAt: number;
}

/**
 * Validation result for contact data
 */
export interface ContactValidation {
  isValid: boolean;
  errors: {
    name?: string;
    phoneNumber?: string;
    email?: string;
    alertMethods?: string;
  };
}
