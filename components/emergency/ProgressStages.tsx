/**
 * ProgressStages Component
 * Shows the user exactly what's happening during SOS activation
 * 
 * VISUAL FLOW (Simplified - No API calls):
 * ─────────────────────────────────────────
 *   ✅ Getting your location...       Done
 *   ⏳ Preparing emergency alert...  Active
 *   ○  Ready to send                 Waiting
 * ─────────────────────────────────────────
 * 
 * WHY?
 * - Under panic, user needs to KNOW the app is working
 * - Each stage transition = visual proof of progress
 * - Prevents user from pressing buttons randomly out of fear
 */

import { COLORS } from '@/constants/config';
import { EmergencyStage } from '@/types/nearby.types';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface ProgressStagesProps {
  currentStage: EmergencyStage;
}

interface StageConfig {
  key: EmergencyStage;
  label: string;
  activeLabel: string;
  completedLabel: string;
}

const STAGES: StageConfig[] = [
  {
    key: 'locating',
    label: 'Get your location',
    activeLabel: 'Getting your location...',
    completedLabel: 'Location acquired',
  },
  {
    key: 'preparing',
    label: 'Prepare emergency alert',
    activeLabel: 'Preparing emergency alert...',
    completedLabel: 'Alert package ready',
  },
  {
    key: 'ready',
    label: 'Ready to send',
    activeLabel: 'Ready to send!',
    completedLabel: 'Ready to send!',
  },
];

const STAGE_ORDER: EmergencyStage[] = ['locating', 'preparing', 'ready', 'sending'];

function getStageIndex(stage: EmergencyStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export default function ProgressStages({ currentStage }: ProgressStagesProps) {
  const currentIndex = getStageIndex(currentStage);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Emergency Mode Activated</Text>
      <View style={styles.stagesList}>
        {STAGES.map((stage, index) => {
          const stageIndex = getStageIndex(stage.key);
          const isCompleted = currentIndex > stageIndex;
          const isActive = currentIndex === stageIndex;
          const isPending = currentIndex < stageIndex;

          return (
            <StageRow
              key={stage.key}
              stage={stage}
              isCompleted={isCompleted}
              isActive={isActive}
              isPending={isPending}
              isLast={index === STAGES.length - 1}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────

interface StageRowProps {
  stage: StageConfig;
  isCompleted: boolean;
  isActive: boolean;
  isPending: boolean;
  isLast: boolean;
}

function StageRow({ stage, isCompleted, isActive, isPending, isLast }: StageRowProps) {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // Pulsing animation for active stage spinner
  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive]);

  const getIcon = (): string => {
    if (isCompleted) return '✅';
    if (isActive) return '⏳';
    return '○';
  };

  const getLabel = (): string => {
    if (isCompleted) return stage.completedLabel;
    if (isActive) return stage.activeLabel;
    return stage.label;
  };

  const getStatusText = (): string => {
    if (isCompleted) return 'Done';
    if (isActive) return 'In progress';
    return 'Waiting';
  };

  return (
    <View style={styles.stageRow}>
      {/* Connector line (not for first item) */}
      {/* Icon */}
      <Animated.View style={[
        styles.iconContainer,
        isActive && { opacity: pulseAnim },
      ]}>
        <Text style={styles.stageIcon}>{getIcon()}</Text>
      </Animated.View>

      {/* Label */}
      <View style={styles.labelContainer}>
        <Text
          style={[
            styles.stageLabel,
            isCompleted && styles.stageLabelCompleted,
            isActive && styles.stageLabelActive,
            isPending && styles.stageLabelPending,
          ]}
        >
          {getLabel()}
        </Text>
      </View>

      {/* Status badge */}
      <View style={[
        styles.statusBadge,
        isCompleted && styles.statusBadgeCompleted,
        isActive && styles.statusBadgeActive,
      ]}>
        <Text style={[
          styles.statusText,
          isCompleted && styles.statusTextCompleted,
          isActive && styles.statusTextActive,
        ]}>
          {getStatusText()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.PRIMARY,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  stagesList: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 12,
    padding: 12,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
  },
  stageIcon: {
    fontSize: 16,
  },
  labelContainer: {
    flex: 1,
    marginLeft: 10,
  },
  stageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  stageLabelCompleted: {
    color: COLORS.SUCCESS,
  },
  stageLabelActive: {
    color: COLORS.WARNING,
    fontWeight: '700',
  },
  stageLabelPending: {
    color: COLORS.TEXT_MUTED,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: COLORS.BACKGROUND_LIGHT,
  },
  statusBadgeCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)', // green-500 20% opacity
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.2)', // orange-500 20% opacity
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextCompleted: {
    color: COLORS.SUCCESS,
  },
  statusTextActive: {
    color: COLORS.WARNING,
  },
});
