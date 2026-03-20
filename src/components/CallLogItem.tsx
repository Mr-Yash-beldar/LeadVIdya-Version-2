import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ToastAndroid,
  Clipboard,
  NativeModules,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CallLog, CallType } from '../types/CallLog';
import { formatDuration, formatTime } from '../utils/formatters';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import {
  Phone,
  Copy,
  StickyNote,
  MessageCircle,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  User,
  UserPlus,
  UserCheck,
  ChevronRight,
} from 'lucide-react-native';
import { api } from '../services/api';
import { GlassCard } from './GlassCard';

const { PhoneModule } = NativeModules;

const CALL_TYPE_INFO = {
  [CallType.Incoming]: { color: colors.success, Icon: PhoneIncoming, label: 'Incoming' },
  [CallType.Outgoing]: { color: colors.primary, Icon: PhoneOutgoing, label: 'Outgoing' },
  [CallType.Missed]: { color: colors.error, Icon: PhoneMissed, label: 'Missed' },
  [CallType.Unknown]: { color: colors.textMuted, Icon: Phone, label: 'Unknown' }
};

const getCallTypeInfo = (type: CallType) => CALL_TYPE_INFO[type] || CALL_TYPE_INFO[CallType.Unknown];

interface CallLogItemProps {
  item: CallLog & {
    leadName?: string;
    leadEmail?: string;
    leadMobile?: string;
    notes?: string;
    callStatus?: string;
    recordingUrl?: string;
    leadId?: string;
    leadData?: any;
    disposed?: boolean;
    canAssignSelf?: boolean;
    isAssignedToOther?: boolean;
    assignedToName?: string;
    _enrichedLeadId?: string;
    _enrichedLeadData?: any;
    simSlot?: number;
    ownerName?: string;
    isMyCall?: boolean;
  };
  simCount?: number;
  isLeadLog?: boolean;
  onAddLead?: (number: string) => void;
  onDispose?: (item: any) => void;
  onAssignSelf?: (item: any) => void;
}

export const CallLogItem: React.FC<CallLogItemProps> = memo((
  {
    item,
    simCount = 0,
    isLeadLog = false,
    onAddLead,
    onDispose,
    onAssignSelf,
  }) => {
  const navigation = useNavigation<any>();

  const isMyLead = useMemo(() => {
    if (item.canAssignSelf || item.isAssignedToOther) return false;
    return !!(item.leadId || item.leadData);
  }, [item.leadId, item.leadData, item.canAssignSelf, item.isAssignedToOther]);

  const assignedToName = useMemo(() => {
    // console.log(item);
    if (item.assignedToName) return item.assignedToName;
    const lead = item._enrichedLeadData || item.leadData;
    if (!lead) return null;
    const a = lead.assigned_to || lead.assignedTo;
    if (!a) return null;
    if (typeof a === 'object') return (a as any).name || (a as any).username || null;
    return null;
  }, [item.assignedToName, item._enrichedLeadData, item.leadData]);

  const showAddLeadButton = useMemo(() =>
    !isLeadLog && !isMyLead && !item._enrichedLeadId && !item.disposed && !item.isAssignedToOther && !item.canAssignSelf,
    [isLeadLog, isMyLead, item._enrichedLeadId, item.disposed, item.isAssignedToOther, item.canAssignSelf]
  );

  const displayName = useMemo(() => {
    // If we have an explicit lead name from enrichment or data
    const explicitLeadName = item.leadName ||
      (item.leadData ? `${item.leadData.firstName || ''} ${item.leadData.lastName || ''}`.trim() : null);

    if (explicitLeadName && explicitLeadName !== '') {
      return explicitLeadName;
    }

    // Fallback to system name or phone number
    return item.name || item.phoneNumber || 'Unknown';
  }, [item.leadName, item.leadData, item.name, item.phoneNumber]);

  const displayNumber = useMemo(() =>
    item.phoneNumber || item.leadMobile || 'No number',
    [item.phoneNumber, item.leadMobile]
  );

  const { color, Icon: TypeIcon, label: typeLabel } = useMemo(() =>
    getCallTypeInfo(item.type),
    [item.type]
  );

  const handleCopy = useCallback(() => {
    Clipboard.setString(displayNumber);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Number copied', ToastAndroid.SHORT);
    }
  }, [displayNumber]);

  const handleWhatsApp = useCallback(() => {
    const clean = displayNumber.replace(/[^\d+]/g, '');
    Linking.openURL(`whatsapp://send?phone=${clean}`).catch(() =>
      Alert.alert('Error', 'WhatsApp not installed')
    );
  }, [displayNumber]);

  const handleCall = useCallback(() => {
    if (PhoneModule?.makeCall) {
      PhoneModule.makeCall(displayNumber, item.simSlot || 0);
    } else {
      Linking.openURL(`tel:${displayNumber}`);
    }
  }, [displayNumber, item.simSlot]);

  const handleLeadPress = useCallback(() => {
    // 1. ALWAYS check isAssignedToOther FIRST — prevents 403 from LeadDetails
    if (item.isAssignedToOther) {
      Alert.alert(
        '🔒 Lead Not Accessible',
        `This lead is already assigned to ${assignedToName || 'another agent'}.\nYou can only view leads assigned to you.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // 2. My lead — safe to navigate
    if (isMyLead) {
      const callInfo = {
        id: item.id,
        duration: item.duration,
        timestamp: item.timestamp,
        phoneNumber: item.phoneNumber || item.leadMobile,
        callType: item.type,
        recordingUrl: item.recordingUrl,
      };
      if (item.leadData) {
        navigation.navigate('LeadDetails', { lead: item.leadData, fromCall: true, callInfo });
      } else if (item.leadId) {
        navigation.navigate('LeadDetails', { leadId: item.leadId, fromCall: true, callInfo });
      }
      return;
    }

    // 3. Lead in system but unassigned — offer to claim
    if (item.canAssignSelf) {
      Alert.alert(
        'Assign Lead',
        `"${displayName}" is in the system but not yet assigned.\nAssign this lead to yourself?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Assign to Me', onPress: () => onAssignSelf && onAssignSelf(item) },
        ]
      );
      return;
    }

    // 4. Not in system — show contact analytics
    navigation.navigate('ContactAnalytics', {
      phoneNumber: displayNumber,
      name: displayName,
      isLead: false,
    });
  }, [isMyLead, item, navigation, displayName, displayNumber, onAssignSelf, assignedToName]);

  const handleAddLeadPress = useCallback(async () => {
    if (onAddLead) onAddLead(displayNumber);
  }, [displayNumber, onAddLead]);

  return (
    <GlassCard style={styles.card}>
      <TouchableOpacity
        style={styles.container}
        onPress={handleLeadPress}
        activeOpacity={0.7}
      >
        <View style={styles.topRow}>
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: isMyLead ? 'rgba(255,193,7,0.1)' : colors.divider }]}>
              {isMyLead ? (
                <User size={22} color={colors.primary} />
              ) : item.canAssignSelf ? (
                <UserCheck size={22} color={colors.warning} />
              ) : item.isAssignedToOther ? (
                <User size={22} color={colors.textMuted} />
              ) : (
                <UserPlus size={22} color={colors.primary} />
              )}
            </View>
            <View style={[styles.callTypeBadge, { backgroundColor: color }]}>
              <TypeIcon size={10} color="#FFF" />
            </View>
          </View>

          <View style={styles.mainInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>
                {displayName}
              </Text>
              {item.simSlot !== undefined && simCount > 1 && (
                <View style={styles.simBadge}>
                  <Text style={styles.simText}>SIM {item.simSlot + 1}</Text>
                </View>
              )}
            </View>
            <Text style={styles.phoneNumber}>{displayNumber}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{formatTime(item.timestamp)}</Text>
              <View style={styles.dot} />
              <Text style={styles.metaText}>{formatDuration(item.duration)}</Text>
              <View style={styles.dot} />
              <Text style={[styles.metaText, { color }]}>{typeLabel}</Text>
            </View>
          </View>

          <ChevronRight size={18} color={colors.textMuted} />
        </View>

        <View style={styles.divider} />

        <View style={styles.bottomActions}>
          <View style={styles.statusSection}>
            {isMyLead ? (
              <View style={styles.tag}>
                <View style={[styles.tagDot, { backgroundColor: colors.success }]} />
                <Text style={styles.tagText}> {item.ownerName || 'Unassigned'}</Text>
              </View>
            ) : item.isAssignedToOther ? (
              <View style={styles.tag}>
                <View style={[styles.tagDot, { backgroundColor: colors.textMuted }]} />
                <Text style={styles.tagText}>Assigned: {assignedToName || 'Other'}{item.ownerName ? ` • ${item.ownerName}` : ''}</Text>
              </View>
            ) : item.canAssignSelf ? (
              <TouchableOpacity
                style={[styles.tag, { backgroundColor: 'rgba(255,193,7,0.1)' }]}
                onPress={() => onAssignSelf && onAssignSelf(item)}
              >
                <View style={[styles.tagDot, { backgroundColor: colors.warning }]} />
                <Text style={[styles.tagText, { color: colors.warning, fontWeight: '800' }]}>UNASSIGNED • ASSIGN NOW</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.tag}>
                <View style={[styles.tagDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.tagText}>{item.ownerName ? `Call by: ${item.ownerName}` : 'New Contact'}</Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            {showAddLeadButton && (
              <TouchableOpacity style={styles.iconBtn} onPress={handleAddLeadPress}>
                <UserPlus size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
            {!isMyLead && item.canAssignSelf && !item.isAssignedToOther && (
              <TouchableOpacity style={styles.iconBtn} onPress={() => onAssignSelf && onAssignSelf(item)}>
                <UserCheck size={18} color={colors.warning} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconBtn} onPress={handleCopy}>
              <Copy size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleWhatsApp}>
              <MessageCircle size={18} color="#25D366" />
            </TouchableOpacity>
          </View>
        </View>

        {isMyLead && (item.notes || item.callStatus) && (
          <View style={styles.notesSection}>
            <View style={styles.notesHeader}>
              <StickyNote size={14} color={colors.textMuted} />
              <Text style={styles.notesLabel}>Notes & Status</Text>
            </View>
            <Text style={styles.notesText} numberOfLines={2}>
              {item.callStatus ? `[${item.callStatus}] ` : ''}{item.notes}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </GlassCard>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.disposed === nextProps.item.disposed &&
    prevProps.item.notes === nextProps.item.notes &&
    prevProps.item.callStatus === nextProps.item.callStatus &&
    prevProps.item.leadName === nextProps.item.leadName &&
    prevProps.item.canAssignSelf === nextProps.item.canAssignSelf &&
    prevProps.item.isAssignedToOther === nextProps.item.isAssignedToOther &&
    prevProps.item.assignedToName === nextProps.item.assignedToName &&
    prevProps.item.ownerName === nextProps.item.ownerName &&
    prevProps.item.isMyCall === nextProps.item.isMyCall &&
    prevProps.item.leadId === nextProps.item.leadId &&
    prevProps.simCount === nextProps.simCount &&
    prevProps.isLeadLog === nextProps.isLeadLog
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    padding: 0,
    borderRadius: theme.radii.xl,
  },
  container: {
    padding: theme.spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSection: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callTypeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  mainInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  displayName: {
    ...theme.typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  simBadge: {
    backgroundColor: colors.divider,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  simText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  phoneNumber: {
    ...theme.typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...theme.typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.divider,
    marginHorizontal: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: theme.spacing.md,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusSection: {
    flex: 1,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 6,
  },
  tagText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesSection: {
    marginTop: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: theme.spacing.sm,
    borderRadius: theme.radii.md,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notesLabel: {
    ...theme.typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  notesText: {
    ...theme.typography.body,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    maxWidth: 120,
  },
  assignedText: {
    ...theme.typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
  },
});