/**
 * SMS Service
 *
 * Sends SOS alerts to emergency contacts via two layers:
 *
 * Layer 1 (Online): POST to Abhaya backend → Twilio API
 *   - Reliable, works in background, no user interaction needed.
 *
 * Layer 2 (Offline Fallback): expo-sms
 *   - Opens native SMS app with pre-filled message.
 *   - Requires user to press Send (Android limitation).
 *   - Used when internet is unavailable.
 */

import { getEmergencyContacts } from '@/services/contacts/contactsService';
import * as SMS from 'expo-sms';

// ─── Config ───────────────────────────────────────────────────────────────────

// Your backend server URL.
const BACKEND_URL = 'http://192.168.37.98:3001';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SMSSendResult {
    success: boolean;
    sent: number;
    failed: number;
    method: 'backend' | 'native' | 'none';
    error?: string;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends SOS SMS to all emergency contacts.
 */
export async function sendSOSToAllContacts(message: string): Promise<SMSSendResult> {
    const contactsResult = await getEmergencyContacts();
    if (!contactsResult.success || contactsResult.data.length === 0) {
        console.warn('[SMS] No emergency contacts found.');
        return { success: false, sent: 0, failed: 0, method: 'none', error: 'No contacts saved' };
    }

    const smsContacts = contactsResult.data.filter(
        (c) => c.alertMethods.includes('sms')
    );

    if (smsContacts.length === 0) {
        console.warn('[SMS] No contacts with SMS alert method.');
        return { success: false, sent: 0, failed: 0, method: 'none', error: 'No SMS contacts' };
    }

    const phoneNumbers = smsContacts.map((c) => c.phoneNumber);

    try {
        const result = await sendViaBackend(message, phoneNumbers);
        if (result.success) {
            return { ...result, method: 'backend' };
        }
        return result;
    } catch (error) {
        console.error('[SMS] Backend unreachable. Falling back to native SMS.', error);
        // Automatic fallback to native SMS if backend fails
        return await sendViaNativeSMS(message, phoneNumbers);
    }
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Sends SOS via the Abhaya backend (Twilio).
 */
async function sendViaBackend(
    message: string,
    contacts: string[]
): Promise<SMSSendResult> {
    
    // THE SYSTEM IS NOW LIVE. TWILIO SHIELD REMOVED.
    const response = await fetch(`${BACKEND_URL}/api/sos/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, contacts }),
    });

    if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    console.log(`[SMS] Backend result: ${data.sent} sent, ${data.failed} failed`);

    return {
        success: data.success,
        sent: data.sent,
        failed: data.failed,
        method: 'backend',
    };
}

/**
 * Sends SOS via the device's native SMS app as offline fallback.
 */
async function sendViaNativeSMS(
    message: string,
    contacts: string[]
): Promise<SMSSendResult> {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
        return { success: false, sent: 0, failed: contacts.length, method: 'native', error: 'SMS not available' };
    }

    try {
        const { result } = await SMS.sendSMSAsync(contacts, message);
        const success = result === 'sent' || result === 'unknown';

        return {
            success,
            sent: success ? contacts.length : 0,
            failed: success ? 0 : contacts.length,
            method: 'native',
        };
    } catch (error) {
        return {
            success: false,
            sent: 0,
            failed: contacts.length,
            method: 'native',
            error: String(error),
        };
    }
}

export function getBackendUrl(): string {
    return BACKEND_URL;
}
