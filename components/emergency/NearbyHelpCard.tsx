/**
 * NearbyHelpCard Component (v3 - Deprecated)
 * 
 * NOTE: This component is no longer used in the Maps deep linking approach.
 * Previously displayed API-fetched nearby help centers.
 * Now we use direct Maps deep linking instead.
 * 
 * Kept for backward compatibility only.
 */

import { COLORS } from '@/constants/config';
import React from 'react';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface NearbyHelpCardProps {
  helpCenter: any;  // Placeholder - no longer strongly typed
  isFallback?: boolean;
}

/**
 * @deprecated Use Maps deep linking buttons instead
 */
export default function NearbyHelpCard({ helpCenter, isFallback }: NearbyHelpCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.deprecatedText}>
        ⚠️ This component is deprecated. Use Maps deep linking instead.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
  },
  deprecatedText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
