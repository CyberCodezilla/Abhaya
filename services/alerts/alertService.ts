/**
 * Alert Service
 * Handles sending emergency alerts via SMS, WhatsApp, and Email
 * WHY: Centralized alert delivery with proper error handling
 * 
 * OPTIMIZED FLOW FOR RAPID SENDING:
 * ═══════════════════════════════════════════════════════════
 * 1. When SOS activates, all alert methods open SEQUENTIALLY
 * 2. Minimal delays (200-300ms) just enough for app to launch
 * 3. User workflow:
 *    - SMS opens → User taps "Send" → 200ms later
 *    - WhatsApp opens → User taps "Send" → 200ms later  
 *    - Email opens → User taps "Send" → 300ms later
 *    - Next contact's SMS opens → Repeat
 * 
 * 4. Total time for 2 contacts with SMS+WhatsApp each:
 *    - SMS1 → 200ms → WhatsApp1 → 300ms → SMS2 → 200ms → WhatsApp2
 *    - ~700ms of automation + user tap time
 * 
 * 5. Visual feedback on SOS screen shows progress
 * 
 * IMPORTANT: Due to Android security, apps CANNOT auto-send.
 * User must manually tap "Send" in each app. Our optimization
 * makes the sequential opening as fast as possible.
 */

import { CONTACT_SWITCH_DELAY, METHOD_SWITCH_DELAY, WHATSAPP_URL_SCHEME } from '@/constants/alert.constants';
import { getEmergencyContacts } from '@/services/contacts/contactsService';
import { AlertMethod, AlertResult, AlertSummary, EmergencyContact } from '@/types/contact.types';
import { SOSMessage, ServiceResult } from '@/types/emergency.types';
import * as Linking from 'expo-linking';
import * as MailComposer from 'expo-mail-composer';
import * as SMS from 'expo-sms';

/**
 * Check if SMS is available on device
 * WHY: SMS may not be available on tablets or emulators
 */
export async function isSMSAvailable(): Promise<boolean> {
  try {
    return await SMS.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Check if email composer is available
 * WHY: Email client may not be configured on device
 */
export async function isEmailAvailable(): Promise<boolean> {
  try {
    return await MailComposer.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Check if WhatsApp is installed
 * WHY: WhatsApp may not be installed on device
 */
export async function isWhatsAppAvailable(): Promise<boolean> {
  try {
    return await Linking.canOpenURL(WHATSAPP_URL_SCHEME);
  } catch {
    return false;
  }
}

/**
 * Send SMS to a single contact
 * WHY: Direct SMS delivery for emergency alerts
 * NOTE: User must confirm SMS send on Android (cannot be silent)
 */
async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<ServiceResult<void>> {
  try {
    const available = await isSMSAvailable();
    if (!available) {
      return {
        success: false,
        error: 'SMS not available on this device',
      };
    }

    // Send SMS - This opens SMS app with pre-filled message
    // User must manually press send (Android security requirement)
    const { result } = await SMS.sendSMSAsync([phoneNumber], message);

    if (result === 'sent') {
      return { success: true, data: undefined };
    }

    return {
      success: false,
      error: 'SMS was not sent. User may have cancelled.',
    };
  } catch (error) {
    return {
      success: false,
      error: `SMS failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Send WhatsApp message
 * WHY: Many users prefer WhatsApp for communication
 * NOTE: Opens WhatsApp app with pre-filled message
 */
async function sendWhatsApp(
  phoneNumber: string,
  message: string
): Promise<ServiceResult<void>> {
  try {
    const available = await isWhatsAppAvailable();
    if (!available) {
      return {
        success: false,
        error: 'WhatsApp not installed',
      };
    }

    // Remove + from phone number for WhatsApp
    const cleanNumber = phoneNumber.replace('+', '');
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // WhatsApp URL format
    const url = `${WHATSAPP_URL_SCHEME}?phone=${cleanNumber}&text=${encodedMessage}`;

    // Open WhatsApp
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return { success: true, data: undefined };
    }

    return {
      success: false,
      error: 'Failed to open WhatsApp',
    };
  } catch (error) {
    return {
      success: false,
      error: `WhatsApp failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Send email alert
 * WHY: Professional/formal way to send emergency alerts
 * NOTE: Opens email app with pre-filled content
 */
async function sendEmail(
  emailAddress: string,
  subject: string,
  message: string
): Promise<ServiceResult<void>> {
  try {
    const available = await isEmailAvailable();
    if (!available) {
      return {
        success: false,
        error: 'Email composer not available',
      };
    }

    // Open email composer
    const result = await MailComposer.composeAsync({
      recipients: [emailAddress],
      subject,
      body: message,
    });

    if (result.status === 'sent') {
      return { success: true, data: undefined };
    }

    return {
      success: false,
      error: 'Email was not sent. User may have cancelled.',
    };
  } catch (error) {
    return {
      success: false,
      error: `Email failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Send alert using specified method
 * WHY: Unified interface for all alert methods
 */
async function sendAlertViaMethod(
  contact: EmergencyContact,
  method: AlertMethod,
  sosMessage: SOSMessage
): Promise<AlertResult> {
  const startTime = Date.now();

  try {
    let result: ServiceResult<void>;

    switch (method) {
      case 'sms':
        result = await sendSMS(contact.phoneNumber, sosMessage.text);
        break;

      case 'whatsapp':
        result = await sendWhatsApp(contact.phoneNumber, sosMessage.text);
        break;

      case 'email':
        if (!contact.email) {
          result = {
            success: false,
            error: 'No email address provided for contact',
          };
        } else {
          result = await sendEmail(
            contact.email,
            '🚨 EMERGENCY ALERT - ABHAYA',
            sosMessage.text
          );
        }
        break;

      default:
        result = {
          success: false,
          error: `Unknown alert method: ${method}`,
        };
    }

    return {
      contactId: contact.id,
      contactName: contact.name,
      method,
      success: result.success,
      error: result.success ? undefined : result.error,
      sentAt: startTime,
    };
  } catch (error) {
    return {
      contactId: contact.id,
      contactName: contact.name,
      method,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      sentAt: startTime,
    };
  }
}

/**
 * Send SOS alerts to all emergency contacts
 * WHY: Main function to trigger emergency notifications
 * STRATEGY: Send to primary contact first, then others with delay
 */
export async function sendSOSAlerts(sosMessage: SOSMessage): Promise<ServiceResult<AlertSummary>> {
  try {
    // Get all contacts
    const contactsResult = await getEmergencyContacts();
    if (!contactsResult.success) {
      return {
        success: false,
        error: contactsResult.error,
      };
    }

    const contacts = contactsResult.data;

    if (contacts.length === 0) {
      return {
        success: false,
        error: 'No emergency contacts configured. Please add contacts in Settings.',
      };
    }

    // Track all alert results
    const alertResults: AlertResult[] = [];

    // OPTIMIZED STRATEGY: Send to all contacts sequentially with minimal delays
    // Primary contact first, then others - but no long waits between contacts
    // This allows rapid-fire app opening for fastest user experience

    // Sort contacts: primary first, then others
    const sortedContacts = [
      ...contacts.filter(c => c.isPrimary),
      ...contacts.filter(c => !c.isPrimary),
    ];

    // Send to all contacts in sequence
    for (let i = 0; i < sortedContacts.length; i++) {
      const contact = sortedContacts[i];
      const isFirstContact = i === 0;

      // Small delay between contacts (except first one)
      if (!isFirstContact) {
        await delay(CONTACT_SWITCH_DELAY); // 300ms between contacts
      }

      // Send via all methods for this contact
      for (let j = 0; j < contact.alertMethods.length; j++) {
        const method = contact.alertMethods[j];
        const isFirstMethod = j === 0;

        // Quick delay between methods for same contact
        if (!isFirstMethod) {
          await delay(METHOD_SWITCH_DELAY); // 200ms between methods
        }

        const result = await sendAlertViaMethod(contact, method, sosMessage);
        alertResults.push(result);
      }
    }

    // Calculate summary
    const summary: AlertSummary = {
      totalContacts: contacts.length,
      successfulAlerts: alertResults.filter(r => r.success).length,
      failedAlerts: alertResults.filter(r => !r.success).length,
      results: alertResults,
      sosActivatedAt: sosMessage.timestamp,
    };

    return { success: true, data: summary };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send alerts: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Send alert to a single contact (for testing or manual send)
 * WHY: Allow user to test alert before emergency
 */
export async function sendTestAlert(
  contact: EmergencyContact,
  message: string
): Promise<ServiceResult<AlertResult[]>> {
  try {
    const testMessage: SOSMessage = {
      text: `⚠️ TEST ALERT ⚠️\n\n${message}\n\nThis is a test from ABHAYA app. No emergency.`,
      location: null,
      timestamp: Date.now(),
      mapsLink: null,
    };

    const results: AlertResult[] = [];

    for (const method of contact.alertMethods) {
      const result = await sendAlertViaMethod(contact, method, testMessage);
      results.push(result);

      // Delay between methods
      if (contact.alertMethods.length > 1) {
        await delay(500);
      }
    }

    return { success: true, data: results };
  } catch (error) {
    return {
      success: false,
      error: `Test alert failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Utility: Delay execution
 * WHY: Prevent rapid-fire app switching
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get available alert methods for device
 * WHY: Show only working methods in UI
 */
export async function getAvailableAlertMethods(): Promise<AlertMethod[]> {
  const methods: AlertMethod[] = [];

  const [smsAvailable, whatsappAvailable, emailAvailable] = await Promise.all([
    isSMSAvailable(),
    isWhatsAppAvailable(),
    isEmailAvailable(),
  ]);

  if (smsAvailable) methods.push('sms');
  if (whatsappAvailable) methods.push('whatsapp');
  if (emailAvailable) methods.push('email');

  return methods;
}
