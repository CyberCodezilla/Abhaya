/**
 * Settings & Contacts Screen
 * Manage emergency contacts and app settings
 */

import { VoiceProtectionToggle } from '@/components/voice';
import { COLORS } from '@/constants/config';
import { useEmergency } from '@/context/EmergencyContext';
import {
    deleteEmergencyContact,
    getEmergencyContacts,
} from '@/services/contacts/contactsService';
import { EmergencyContact } from '@/types/contact.types';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    Linking,
} from 'react-native';
import { getStoredIMEI, saveIMEI } from '@/services/sos/sosOrchestrator';

export default function SettingsScreen() {
  const { checkSetupStatus } = useEmergency();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imeiNumber, setImeiNumber] = useState('');

  useEffect(() => {
    loadContacts();
    const storedImei = getStoredIMEI();
    if (storedImei) {
      setImeiNumber(storedImei);
    }
  }, []);

  const handleSaveImei = () => {
    saveIMEI(imeiNumber);
    Alert.alert('Saved', 'IMEI number saved successfully.');
  };



  /**
   * Load emergency contacts from storage
   */
  const loadContacts = async () => {
    setLoading(true);
    const result = await getEmergencyContacts();
    
    if (result.success) {
      setContacts(result.data);
    } else {
      Alert.alert('Error', result.error);
    }
    
    setLoading(false);
  };

  /**
   * Refresh contacts
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  }, []);

  /**
   * Delete contact with confirmation
   */
  const handleDeleteContact = (contact: EmergencyContact) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to remove ${contact.name} from your emergency contacts?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteEmergencyContact(contact.id);
            if (result.success) {
              await loadContacts();
              await checkSetupStatus();
              Alert.alert('Success', `${contact.name} has been removed`);
            } else {
              Alert.alert('Error', result.error);
            }
          },
        },
      ]
    );
  };

  /**
   * Add new contact
   */
  const handleAddContact = () => {
    router.push('/setup' as any);
  };

  /**
   * Render single contact card
   */
  const renderContact = (contact: EmergencyContact) => (
    <View key={contact.id} style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <Text style={styles.contactName}>{contact.name}</Text>
        {contact.isPrimary && (
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryBadgeText}>PRIMARY</Text>
          </View>
        )}
      </View>

      <Text style={styles.contactPhone}>📱 {contact.phoneNumber}</Text>
      
      {contact.email && (
        <Text style={styles.contactEmail}>📧 {contact.email}</Text>
      )}

      {contact.relationship && (
        <Text style={styles.contactRelation}>👤 {contact.relationship}</Text>
      )}

      <View style={styles.methodsContainer}>
        <Text style={styles.methodsLabel}>Alert Methods:</Text>
        <View style={styles.methods}>
          {contact.alertMethods.map(method => (
            <View key={method} style={styles.methodBadge}>
              <Text style={styles.methodBadgeText}>
                {method === 'sms' && '📱 SMS'}
                {method === 'whatsapp' && '💬 WhatsApp'}
                {method === 'email' && '📧 Email'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Pressable
        style={styles.deleteButton}
        onPress={() => handleDeleteContact(contact)}
      >
        <Text style={styles.deleteButtonText}>🗑️ Remove</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Emergency Contacts</Text>
        <Text style={styles.subtitle}>
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''} configured
        </Text>
      </View>

      {/* Contacts List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Voice Protection Toggle */}
        <VoiceProtectionToggle />

        {/* IMEI Input for SMS */}
        <View style={styles.imeiContainer}>
          <Text style={styles.imeiLabel}>Device IMEI Number</Text>
          <Text style={styles.imeiDesc}>Included in SOS SMS for tracking</Text>
          <View style={styles.imeiInputContainer}>
            <TextInput
              style={styles.imeiInput}
              placeholder="Enter your device IMEI"
              placeholderTextColor="#9CA3AF"
              value={imeiNumber}
              onChangeText={setImeiNumber}
              keyboardType="number-pad"
              maxLength={16}
            />
            <Pressable style={styles.saveImeiBtn} onPress={handleSaveImei}>
              <Text style={styles.saveImeiBtnText}>Save</Text>
            </Pressable>
          </View>
          
          {/* Unmissable Instructions inside UI */}
          <View style={styles.imeiNoticeBox}>
            <Text style={styles.imeiNoticeTitle}>🚨 Why You MUST Save Your IMEI</Text>
            <Text style={styles.imeiNoticeText}>
              If an attacker steals your phone and throws your SIM card away, Police can STILL track you using your hardware IMEI.
            </Text>
            <Text style={styles.imeiNoticeHighlight}>
              Click below to open your dialer. You must manually type *#06# strictly (do not copy-paste). Write down the 15-digit number and save it above!
            </Text>
            <Pressable 
              style={styles.findImeiBtn} 
              onPress={() => Linking.openURL('tel:').catch(() => Alert.alert('Error', 'Could not open dialer.'))}
            >
              <Text style={styles.findImeiBtnText}>📞 Open Dialer Now</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading contacts...</Text>
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Contacts Added</Text>
            <Text style={styles.emptyText}>
              Add emergency contacts to receive alerts during SOS
            </Text>
          </View>
        ) : (
          contacts.map(contact => renderContact(contact))
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Important</Text>
          <Text style={styles.infoText}>
            • Contacts will receive your location during SOS
          </Text>
          <Text style={styles.infoText}>
            • Primary contact receives alerts first
          </Text>
          <Text style={styles.infoText}>
            • Test alerts before emergencies
          </Text>
          <Text style={styles.infoText}>
            • Keep contact information updated
          </Text>
        </View>
      </ScrollView>

      {/* Add Contact Button */}
      <View style={styles.footer}>
        <Pressable style={styles.addButton} onPress={handleAddContact}>
          <Text style={styles.addButtonText}>+ Add New Contact</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: COLORS.PRIMARY,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  primaryBadge: {
    backgroundColor: COLORS.SUCCESS,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  contactPhone: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  contactRelation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  methodsContainer: {
    marginBottom: 12,
  },
  methodsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  methods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodBadge: {
    backgroundColor: COLORS.BACKGROUND_GRAY,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  methodBadgeText: {
    fontSize: 12,
    color: '#374151',
  },
  deleteButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.DANGER,
  },
  deleteButtonText: {
    fontSize: 14,
    color: COLORS.DANGER,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  infoBox: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  addButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  imeiContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imeiLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  imeiDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  imeiInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  imeiInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
  },
  saveImeiBtn: {
    backgroundColor: COLORS.SUCCESS,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveImeiBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  imeiNoticeBox: {
    marginTop: 16,
    backgroundColor: '#FFF0F2',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.PRIMARY,
  },
  imeiNoticeTitle: {
    color: COLORS.PRIMARY_DARKER,
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 6,
  },
  imeiNoticeText: {
    color: COLORS.PRIMARY_DARK,
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },
  imeiNoticeHighlight: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 18,
    marginBottom: 12,
  },
  findImeiBtn: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  findImeiBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
