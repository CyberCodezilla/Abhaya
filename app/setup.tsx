/**
 * First-Time Setup Screen
 * User must add at least one emergency contact before using the app
 * WHY: SOS system requires contacts to send alerts
 */

import { MIN_RECOMMENDED_CONTACTS } from '@/constants/alert.constants';
import { COLORS } from '@/constants/config';
import { useEmergency } from '@/context/EmergencyContext';
import { addEmergencyContact } from '@/services/contacts/contactsService';
import { AlertMethod, EmergencyContact } from '@/types/contact.types';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function SetupScreen() {
  const { checkSetupStatus, requestLocationAccess } = useEmergency();
  
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [alertMethods, setAlertMethods] = useState<AlertMethod[]>(['sms']);
  const [isPrimary, setIsPrimary] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactsAdded, setContactsAdded] = useState(0);

  /**
   * Toggle alert method selection
   */
  const toggleAlertMethod = (method: AlertMethod) => {
    if (alertMethods.includes(method)) {
      // Don't allow removing last method
      if (alertMethods.length === 1) {
        Alert.alert('Required', 'At least one alert method must be selected');
        return;
      }
      setAlertMethods(alertMethods.filter(m => m !== method));
    } else {
      setAlertMethods([...alertMethods, method]);
    }
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter contact name');
      return false;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Required', 'Please enter phone number');
      return false;
    }

    if (alertMethods.includes('email') && !email.trim()) {
      Alert.alert('Required', 'Email is required for email alerts');
      return false;
    }

    return true;
  };

  /**
   * Add emergency contact
   */
  const handleAddContact = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    const contactData: Omit<EmergencyContact, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim() || undefined,
      relationship: relationship.trim() || undefined,
      alertMethods,
      isPrimary: contactsAdded === 0 ? true : isPrimary, // First contact is always primary
    };

    const result = await addEmergencyContact(contactData);

    if (result.success) {
      setContactsAdded(prev => prev + 1);
      
      // Clear form
      setName('');
      setPhoneNumber('');
      setEmail('');
      setRelationship('');
      setAlertMethods(['sms']);
      setIsPrimary(false);

      Alert.alert(
        'Contact Added',
        `${result.data.name} has been added as an emergency contact.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', result.error);
    }

    setIsSubmitting(false);
  };

  /**
   * Complete setup and proceed to app
   */
  const handleCompleteSetup = async () => {
    if (contactsAdded === 0) {
      Alert.alert(
        'No Contacts Added',
        'You must add at least one emergency contact to use ABHAYA.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (contactsAdded < MIN_RECOMMENDED_CONTACTS) {
      Alert.alert(
        'Add More Contacts?',
        `We recommend adding at least ${MIN_RECOMMENDED_CONTACTS} emergency contacts for better safety. Do you want to continue with ${contactsAdded} contact(s)?`,
        [
          {
            text: 'Add More',
            style: 'cancel',
          },
          {
            text: 'Continue',
            onPress: completeSetup,
          },
        ]
      );
      return;
    }

    completeSetup();
  };

  /**
   * Handle "Done this before" - bypass setup if contacts already exist
   */
  const handleBypassSetup = async () => {
    const setupComplete = await checkSetupStatus();
    
    if (setupComplete) {
      // User has contacts, proceed to home
      router.replace('/(tabs)' as any);
    } else {
      // No contacts found
      Alert.alert(
        'No Contacts Found',
        'You need to add at least one emergency contact before using ABHAYA. Please add a contact above.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Finish setup process
   */
  const completeSetup = async () => {
    // Request location permission
    const locationGranted = await requestLocationAccess();
    
    if (!locationGranted) {
      Alert.alert(
        'Location Permission',
        'Location access is important for sending your location during emergencies. You can enable it later in Settings.',
        [{ text: 'OK' }]
      );
    }

    // Update setup status
    await checkSetupStatus();

    // Navigate to home
    router.replace('/(tabs)' as any);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>ABHAYA</Text>
          <Text style={styles.title}>Welcome to ABHAYA</Text>
          <Text style={styles.subtitle}>
            Let's set up your emergency contacts
          </Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>
            📱 Add trusted contacts who will receive emergency alerts with your location during SOS.
          </Text>
          <Text style={styles.instructionText}>
            ✅ Recommended: Add at least {MIN_RECOMMENDED_CONTACTS} contacts
          </Text>
          <Text style={styles.instructionText}>
            🔒 Your data stays private and secure on your device
          </Text>
        </View>

        {/* Contacts Added Counter */}
        {contactsAdded > 0 && (
          <View style={styles.counterBox}>
            <Text style={styles.counterText}>
              ✓ {contactsAdded} contact{contactsAdded > 1 ? 's' : ''} added
            </Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>
            {contactsAdded === 0 ? 'Add Your First Contact' : 'Add Another Contact'}
          </Text>

          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Mom, John, Sister"
            placeholderTextColor={COLORS.TEXT_SECONDARY}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 9876543210"
            placeholderTextColor={COLORS.TEXT_SECONDARY}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            maxLength={15}
          />

          <Text style={styles.label}>Relationship (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Mother, Friend, Colleague"
            placeholderTextColor={COLORS.TEXT_SECONDARY}
            value={relationship}
            onChangeText={setRelationship}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., contact@email.com"
            placeholderTextColor={COLORS.TEXT_SECONDARY}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Alert Methods *</Text>
          <View style={styles.methodContainer}>
            <Pressable
              style={[
                styles.methodButton,
                alertMethods.includes('sms') && styles.methodButtonActive,
              ]}
              onPress={() => toggleAlertMethod('sms')}
            >
              <Text
                style={[
                  styles.methodButtonText,
                  alertMethods.includes('sms') && styles.methodButtonTextActive,
                ]}
              >
                📱 SMS
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.methodButton,
                alertMethods.includes('whatsapp') && styles.methodButtonActive,
              ]}
              onPress={() => toggleAlertMethod('whatsapp')}
            >
              <Text
                style={[
                  styles.methodButtonText,
                  alertMethods.includes('whatsapp') && styles.methodButtonTextActive,
                ]}
              >
                💬 WhatsApp
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.methodButton,
                alertMethods.includes('email') && styles.methodButtonActive,
              ]}
              onPress={() => toggleAlertMethod('email')}
            >
              <Text
                style={[
                  styles.methodButtonText,
                  alertMethods.includes('email') && styles.methodButtonTextActive,
                ]}
              >
                📧 Email
              </Text>
            </Pressable>
          </View>

          {contactsAdded > 0 && (
            <View style={styles.checkboxContainer}>
              <Pressable
                style={styles.checkbox}
                onPress={() => setIsPrimary(!isPrimary)}
              >
                <Text style={styles.checkboxIcon}>
                  {isPrimary ? '☑' : '☐'}
                </Text>
                <Text style={styles.checkboxLabel}>
                  Set as primary contact (receives alerts first)
                </Text>
              </Pressable>
            </View>
          )}

          {/* Add Contact Button */}
          <Pressable
            style={[styles.addButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleAddContact}
            disabled={isSubmitting}
          >
            <Text style={styles.addButtonText}>
              {isSubmitting ? 'Adding...' : '+ Add Contact'}
            </Text>
          </Pressable>

          {/* Bypass Setup Button */}
          {contactsAdded === 0 && (
            <Pressable
              style={styles.bypassButton}
              onPress={handleBypassSetup}
            >
              <Text style={styles.bypassButtonText}>
                Done this before? Skip to Home
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Complete Setup Button (Fixed at bottom) */}
      {contactsAdded > 0 && (
        <View style={styles.footer}>
          <Pressable style={styles.completeButton} onPress={handleCompleteSetup}>
            <Text style={styles.completeButtonText}>
              Complete Setup & Start Using ABHAYA
            </Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  instructionBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)', // Light blue tint for dark mode
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    lineHeight: 20,
  },
  counterBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)', // Light green tint for dark mode
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.SUCCESS,
  },
  form: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
  },
  methodContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    alignItems: 'center',
  },
  methodButtonActive: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_SECONDARY,
  },
  methodButtonTextActive: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  checkboxContainer: {
    marginTop: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxIcon: {
    fontSize: 24,
    marginRight: 8,
    color: COLORS.PRIMARY,
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
  },
  addButton: {
    backgroundColor: COLORS.SECONDARY,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bypassButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bypassButtonText: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    textDecorationLine: 'underline',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  completeButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
