import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { 
  User, 
  Settings, 
  Shield, 
  HelpCircle, 
  LogOut, 
  ChevronRight, 
  Download,
  Bell,
  Info,
  ExternalLink,
  ShieldCheck,
  UserCircle
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';

export const SettingsScreen = () => {
  const { logout, user } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout failed:', error);
            }
          }
        },
      ]
    );
  }, [logout]);

  const renderSettingItem = useCallback(({ icon: Icon, title, subtitle, onPress, showChevron = true, danger = false }: any) => (
    <TouchableOpacity 
      style={styles.itemContainer} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, danger && styles.iconBoxDanger]}>
        <Icon size={20} color={danger ? colors.error : colors.primary} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, danger && styles.itemTitleDanger]}>{title}</Text>
        {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
      </View>
      {showChevron && <ChevronRight size={18} color={colors.textMuted} />}
    </TouchableOpacity>
  ), []);

  return (
    <ScreenWrapper navigation={navigation} title="More" transparentHeader={false}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <GlassCard style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.onlineStatus} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user?.name || 'User Name'}</Text>
              <Text style={styles.userRole}>{user?.role || 'Sales Representative'}</Text>
              <View style={styles.phoneBadge}>
                <Text style={styles.phoneText}>{user?.number || 'No Phone'}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => {}}>
               <UserCircle size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Section: Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <GlassCard style={styles.sectionCard}>
            {renderSettingItem({
              icon: User,
              title: 'Edit Profile',
              subtitle: 'Update your personal information',
              onPress: () => {}
            })}
            <View style={styles.divider} />
            {renderSettingItem({
              icon: Bell,
              title: 'Notifications',
              subtitle: 'Manage your alerts and preferences',
              onPress: () => {}
            })}
          </GlassCard>
        </View>

        {/* Section: App */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          <GlassCard style={styles.sectionCard}>
            {renderSettingItem({
              icon: Download,
              title: 'Check for Updates',
              subtitle: 'Current version: 1.0.5',
              onPress: () => navigation.navigate('UpdateApp')
            })}
            <View style={styles.divider} />
            {renderSettingItem({
              icon: ShieldCheck,
              title: 'Permissions',
              subtitle: 'Manage app access & security',
              onPress: () => {}
            })}
          </GlassCard>
        </View>

        {/* Section: Help & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          <GlassCard style={styles.sectionCard}>
            {renderSettingItem({
              icon: HelpCircle,
              title: 'Help Center',
              subtitle: 'FAQs and contact support',
              onPress: () => {}
            })}
            <View style={styles.divider} />
            {renderSettingItem({
              icon: Shield,
              title: 'Privacy Policy',
              subtitle: 'How we handle your data',
              onPress: () => navigation.navigate('Privacy')
            })}
            <View style={styles.divider} />
            {renderSettingItem({
              icon: Info,
              title: 'About LeadVidya',
              subtitle: 'Version, licenses and terms',
              onPress: () => {}
            })}
          </GlassCard>
        </View>

        {/* Logout Section */}
        <View style={[styles.section, styles.logoutSection]}>
          <GlassCard style={[styles.sectionCard, styles.logoutCard]}>
            {renderSettingItem({
              icon: LogOut,
              title: 'Sign Out',
              onPress: handleLogout,
              showChevron: false,
              danger: true
            })}
          </GlassCard>
          <Text style={styles.versionText}>LeadVidya CRM v1.0.5</Text>
          <Text style={styles.copyrightText}>© 2026 LeadVidya. All rights reserved.</Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  profileCard: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    backgroundColor: 'rgba(255,193,7,0.05)',
    borderColor: 'rgba(255,193,7,0.15)',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  avatarText: {
    ...theme.typography.h1,
    fontSize: 28,
    color: colors.textPrimary,
  },
  onlineStatus: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  profileInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  userName: {
    ...theme.typography.h3,
    fontSize: 20,
    color: colors.textPrimary,
  },
  userRole: {
    ...theme.typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  phoneBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  phoneText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  editBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h1,
    fontSize: 14,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
    paddingLeft: 4,
  },
  sectionCard: {
    padding: 0,
    overflow: 'hidden',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,193,7,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  iconBoxDanger: {
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    ...theme.typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemTitleDanger: {
    color: colors.error,
  },
  itemSubtitle: {
    ...theme.typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: theme.spacing.md,
    opacity: 0.5,
  },
  logoutSection: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  logoutCard: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  versionText: {
    ...theme.typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  copyrightText: {
    ...theme.typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  }
});
