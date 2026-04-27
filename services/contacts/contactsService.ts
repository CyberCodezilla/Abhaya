/**
 * Contact Service
 * Manages emergency contacts in persistent storage
 * CRUD operations for emergency contacts
 */

import { MAX_EMERGENCY_CONTACTS } from '@/constants/alert.constants';
import { STORAGE_KEYS } from '@/constants/config';
import { validatePhoneNumber } from '@/services/sos/sosService';
import { ContactValidation, EmergencyContact } from '@/types/contact.types';
import { ServiceResult } from '@/types/emergency.types';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Generate unique ID for contacts
 * WHY: Simple UUID alternative without external dependencies
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate email format
 * WHY: Ensure email is valid before saving
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate contact data
 * WHY: Prevent invalid data from being saved
 */
export function validateContact(contact: Partial<EmergencyContact>): ContactValidation {
  const errors: ContactValidation['errors'] = {};

  // Validate name
  if (!contact.name || contact.name.trim().length === 0) {
    errors.name = 'Name is required';
  } else if (contact.name.length > 50) {
    errors.name = 'Name must be less than 50 characters';
  }

  // Validate phone number
  if (!contact.phoneNumber || contact.phoneNumber.trim().length === 0) {
    errors.phoneNumber = 'Phone number is required';
  } else {
    const phoneValidation = validatePhoneNumber(contact.phoneNumber);
    if (!phoneValidation.success) {
      errors.phoneNumber = phoneValidation.error;
    }
  }

  // Validate email (if provided)
  if (contact.email && contact.email.trim().length > 0) {
    if (!validateEmail(contact.email)) {
      errors.email = 'Invalid email format';
    }
  }

  // Validate alert methods
  if (!contact.alertMethods || contact.alertMethods.length === 0) {
    errors.alertMethods = 'At least one alert method is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Get all emergency contacts from storage
 * WHY: Load contacts to display in UI
 */
export async function getEmergencyContacts(): Promise<ServiceResult<EmergencyContact[]>> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS);
    
    if (!stored) {
      return { success: true, data: [] };
    }

    const contacts: EmergencyContact[] = JSON.parse(stored);
    
    // Sort by primary first, then by creation date
    contacts.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return b.createdAt - a.createdAt;
    });

    return { success: true, data: contacts };
  } catch (error) {
    return {
      success: false,
      error: `Failed to load contacts: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Add new emergency contact
 * WHY: Allow users to register trusted contacts
 */
export async function addEmergencyContact(
  contactData: Omit<EmergencyContact, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ServiceResult<EmergencyContact>> {
  try {
    // Validate contact data
    const validation = validateContact(contactData);
    if (!validation.isValid) {
      return {
        success: false,
        error: Object.values(validation.errors).join(', '),
      };
    }

    // Check maximum contacts limit
    const existingResult = await getEmergencyContacts();
    if (!existingResult.success) {
      return existingResult as ServiceResult<EmergencyContact>;
    }

    if (existingResult.data.length >= MAX_EMERGENCY_CONTACTS) {
      return {
        success: false,
        error: `Maximum ${MAX_EMERGENCY_CONTACTS} contacts allowed`,
      };
    }

    // Normalize phone number
    const phoneValidation = validatePhoneNumber(contactData.phoneNumber);
    if (!phoneValidation.success) {
      return {
        success: false,
        error: phoneValidation.error,
      };
    }

    // Check for duplicate phone number
    const isDuplicate = existingResult.data.some(
      c => c.phoneNumber === phoneValidation.data
    );
    if (isDuplicate) {
      return {
        success: false,
        error: 'Contact with this phone number already exists',
      };
    }

    // If this is set as primary, demote other primary contacts
    let contacts = existingResult.data;
    if (contactData.isPrimary) {
      contacts = contacts.map(c => ({ ...c, isPrimary: false }));
    }

    // Create new contact
    const now = Date.now();
    const newContact: EmergencyContact = {
      id: generateId(),
      name: contactData.name.trim(),
      phoneNumber: phoneValidation.data,
      email: contactData.email?.trim(),
      alertMethods: contactData.alertMethods,
      isPrimary: contactData.isPrimary,
      relationship: contactData.relationship,
      createdAt: now,
      updatedAt: now,
    };

    // Add to list and save
    contacts.push(newContact);
    await AsyncStorage.setItem(
      STORAGE_KEYS.EMERGENCY_CONTACTS,
      JSON.stringify(contacts)
    );

    return { success: true, data: newContact };
  } catch (error) {
    return {
      success: false,
      error: `Failed to add contact: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Update existing emergency contact
 * WHY: Allow users to modify contact details
 */
export async function updateEmergencyContact(
  contactId: string,
  updates: Partial<Omit<EmergencyContact, 'id' | 'createdAt'>>
): Promise<ServiceResult<EmergencyContact>> {
  try {
    const result = await getEmergencyContacts();
    if (!result.success) {
      return result as ServiceResult<EmergencyContact>;
    }

    let contacts = result.data;
    const index = contacts.findIndex(c => c.id === contactId);

    if (index === -1) {
      return { success: false, error: 'Contact not found' };
    }

    // Merge updates with existing contact
    const updatedContact = {
      ...contacts[index],
      ...updates,
      updatedAt: Date.now(),
    };

    // Validate updated contact
    const validation = validateContact(updatedContact);
    if (!validation.isValid) {
      return {
        success: false,
        error: Object.values(validation.errors).join(', '),
      };
    }

    // If updating phone number, check for duplicates
    if (updates.phoneNumber) {
      const phoneValidation = validatePhoneNumber(updates.phoneNumber);
      if (!phoneValidation.success) {
        return { success: false, error: phoneValidation.error };
      }

      const isDuplicate = contacts.some(
        c => c.id !== contactId && c.phoneNumber === phoneValidation.data
      );
      if (isDuplicate) {
        return {
          success: false,
          error: 'Another contact with this phone number exists',
        };
      }

      updatedContact.phoneNumber = phoneValidation.data;
    }

    // If setting as primary, demote others
    if (updates.isPrimary) {
      contacts = contacts.map(c => 
        c.id === contactId ? c : { ...c, isPrimary: false }
      );
    }

    // Update contact in array
    contacts[index] = updatedContact;

    // Save to storage
    await AsyncStorage.setItem(
      STORAGE_KEYS.EMERGENCY_CONTACTS,
      JSON.stringify(contacts)
    );

    return { success: true, data: updatedContact };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update contact: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Delete emergency contact
 * WHY: Allow users to remove contacts
 */
export async function deleteEmergencyContact(contactId: string): Promise<ServiceResult<void>> {
  try {
    const result = await getEmergencyContacts();
    if (!result.success) {
      return result as ServiceResult<void>;
    }

    const contacts = result.data.filter(c => c.id !== contactId);

    // If deleted contact was primary and others exist, make first one primary
    if (contacts.length > 0 && !contacts.some(c => c.isPrimary)) {
      contacts[0].isPrimary = true;
    }

    await AsyncStorage.setItem(
      STORAGE_KEYS.EMERGENCY_CONTACTS,
      JSON.stringify(contacts)
    );

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete contact: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get primary contact (first to be alerted)
 * WHY: Quick access to most important contact
 */
export async function getPrimaryContact(): Promise<ServiceResult<EmergencyContact | null>> {
  const result = await getEmergencyContacts();
  if (!result.success) {
    return result as ServiceResult<EmergencyContact | null>;
  }

  const primary = result.data.find(c => c.isPrimary) || result.data[0] || null;
  return { success: true, data: primary };
}

/**
 * Count total contacts
 * WHY: Quick check without loading all data
 */
export async function getContactCount(): Promise<number> {
  const result = await getEmergencyContacts();
  return result.success ? result.data.length : 0;
}
