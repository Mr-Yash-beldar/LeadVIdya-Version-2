// src/components/ScreenWrapper.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNetwork } from '../context/NetworkContext';
import { NetworkStatusBar } from './NetworkStatusBar';
import { ConnectionQuality } from './ConnectionQuality';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  navigation: any;
  title: string;
  showBack?: boolean;
  onBackPress?: () => boolean;
  rightComponent?: React.ReactNode;
  transparentHeader?: boolean;
}

export const ScreenWrapper = ({
  children,
  navigation,
  title,
  showBack = true,
  onBackPress,
  rightComponent,
  transparentHeader = false,
}: ScreenWrapperProps) => {
  const { isOffline, pendingSyncCount } = useNetwork();

  const handleBackPress = () => {
    if (onBackPress) {
      const shouldPreventDefault = onBackPress();
      if (shouldPreventDefault) return;
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={[styles.headerContainer, !transparentHeader && styles.headerShadow]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {showBack && title !== "Call Logs" ? (
              <TouchableOpacity onPress={handleBackPress} activeOpacity={0.7} style={styles.backButton}>
                <ChevronLeft size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>

          <View style={styles.headerRight}>
            {rightComponent}
            <ConnectionQuality />
          </View>
        </View>
      </SafeAreaView>

      <NetworkStatusBar />

      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.surface,
  },
  headerShadow: {
    ...theme.shadows.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    height: 56,
  },
  headerLeft: {
    width: 40,
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minWidth: 40,
    justifyContent: 'flex-end',
  },
  headerTitle: {
    ...theme.typography.h3,
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginLeft: -theme.spacing.xs,
  },
  content: {
    flex: 1,
  },
  statusBanner: {
    backgroundColor: colors.secondary,
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.md,
  },
  statusText: {
    ...theme.typography.caption,
    color: colors.white,
    textAlign: 'center',
    fontWeight: '600',
  },
});