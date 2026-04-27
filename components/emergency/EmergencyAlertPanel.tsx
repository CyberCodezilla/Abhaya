/**
 * EmergencyAlertPanel Component (v3 - Simplified)
 * Shows the prepared alert package without API-driven nearby results
 * 
 * LAYOUT:
 * ═══════════════════════════════════════════════════════
 * ┌─────────────────────────────────────────────────────┐
 * │  🚨 EMERGENCY ALERT READY                          │
 * ├─────────────────────────────────────────────────────┤
 * │  📍 Your Location: 12.9716, 77.5946                │
 * │     123 Main Rd, Bangalore, KA                     │
 * ├─────────────────────────────────────────────────────┤
 * │  👥 Personal contacts: 3 ready                     │
 * └─────────────────────────────────────────────────────┘
 * 
 * WHY all info shown together?
 * - User sees what will be shared BEFORE confirming send
 * - Builds trust: no hidden actions
 * - Allows quick scan without scrolling
 */

import { COLORS } from '@/constants/config';
import { EmergencyAlertPackage } from '@/types/nearby.types';
import React from 'react';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface EmergencyAlertPanelProps {
  alertPackage: EmergencyAlertPackage;
}

export default function EmergencyAlertPanel({ alertPackage }: EmergencyAlertPanelProps) {
  const personalContactCount = alertPackage.personalContacts.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>🚨 EMERGENCY ALERT READY</Text>

      {/* Location Info */}
      <View style={styles.locationSection}>
        <Text style={styles.sectionLabel}>📍 YOUR LOCATION</Text>
        {alertPackage.address ? (
          <Text style={styles.addressText}>{alertPackage.address}</Text>
        ) : (
          <Text style={styles.coordsText}>
            {alertPackage.userLocationLink
              ? 'Location acquired — link ready to share'
              : 'Location unavailable — alerts will still be sent'}
          </Text>
        )}
      </View>

      {/* Personal Contacts Count */}
      <View style={styles.contactsSection}>
        <Text style={styles.sectionLabel}>👥 TRUSTED CONTACTS</Text>
        <Text style={styles.contactsCount}>
          {personalContactCount} contact{personalContactCount !== 1 ? 's' : ''} ready to receive alerts
        </Text>
      </View>

      {/* What will be shared disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ℹ️ Your location and emergency message will be shared with the contacts above.
          No data is sent without your confirmation.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 12,
  },
  header: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.PRIMARY,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  locationSection: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.TEXT_SECONDARY,
    letterSpacing: 1,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    lineHeight: 18,
  },
  coordsText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  contactsSection: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  contactsCount: {
    fontSize: 14,
    color: COLORS.SUCCESS,
    fontWeight: '700',
  },
  disclaimer: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)', // blue tint
  },
  disclaimerText: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 16,
    textAlign: 'center',
  },
});
