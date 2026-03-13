import React, { useCallback, useEffect, useState } from 'react';
import {
    View, 
    Text, 
    StyleSheet, 
    FlatList,
    TouchableOpacity, 
    Alert, 
    StatusBar,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Bell, 
  BellOff, 
  ChevronLeft, 
  Clock, 
  User, 
  ChevronRight, 
  Calendar,
  Zap,
  Info
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import {
    NotificationService,
    DEMO_FOLLOWUPS,
    FollowUp,
} from '../services/NotificationService';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';

export const FollowUpScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [scheduled, setScheduled] = useState(false);

    useEffect(() => {
        NotificationService.scheduleAll(DEMO_FOLLOWUPS)
            .then(() => setScheduled(true))
            .catch(console.error);
    }, []);

    const handleTestNow = useCallback(async (item: FollowUp) => {
        try {
            await NotificationService.scheduleReminder({
                ...item,
                followUpTimestamp: Date.now() + 60 * 60 * 1000 + 1000 
            });
            Alert.alert('Success', `Test notification for ${item.name} scheduled for 1s.`);
        } catch (e: any) {
            Alert.alert('Notice', e?.message || 'Notification service busy.');
        }
    }, []);

    const handleScheduleAll = useCallback(async () => {
        try {
            await NotificationService.scheduleAll(DEMO_FOLLOWUPS);
            setScheduled(true);
            Alert.alert('Updated', 'All follow-up reminders have been re-synced.');
        } catch (e: any) {
            Alert.alert('Error', 'Failed to synchronize reminders.');
        }
    }, []);

    const handleCancelAll = useCallback(async () => {
        await NotificationService.cancelAll();
        setScheduled(false);
        Alert.alert('Cancelled', 'All active reminders have been cleared.');
    }, []);

    const renderItem = ({ item }: { item: FollowUp }) => (
        <GlassCard style={styles.card}>
            <View style={styles.cardContent}>
                <View style={[styles.avatarContainer, { backgroundColor: `${colors.primary}15` }]}>
                    <User size={18} color={colors.primary} />
                </View>
                
                <View style={styles.mainInfo}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.nameText}>{item.name}</Text>
                        <View style={[styles.statusBadge, item.status === 'Pending' ? styles.pendingBadge : styles.doneBadge]}>
                            <Text style={[styles.statusText, item.status === 'Pending' ? styles.pendingText : styles.doneText]}>
                                {item.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                           <Calendar size={12} color={colors.textMuted} />
                           <Text style={styles.metaText}>{item.followUpDate}</Text>
                        </View>
                        <View style={styles.metaDivider} />
                        <View style={styles.metaItem}>
                           <Clock size={12} color={colors.textMuted} />
                           <Text style={styles.metaText}>{item.followUpTime}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <View style={styles.reminderInfo}>
                   <Bell size={12} color={colors.success} />
                   <Text style={styles.reminderText}>1h Reminder Active</Text>
                </View>
                <TouchableOpacity style={styles.testBtn} onPress={() => handleTestNow(item)}>
                    <Zap size={13} color={colors.primaryDark} />
                    <Text style={styles.testBtnText}>Quick Test</Text>
                </TouchableOpacity>
            </View>
        </GlassCard>
    );

    return (
        <ScreenWrapper navigation={navigation} title="Reminders">
            <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
            <SafeAreaView style={styles.container} edges={['bottom']}>
                
                <View style={styles.bannerArea}>
                   <GlassCard style={styles.bannerCard}>
                      <View style={styles.bannerHeader}>
                         <Info size={16} color={colors.primary} />
                         <Text style={styles.bannerTitle}>Engagement System</Text>
                      </View>
                      <Text style={styles.bannerDesc}>
                         {scheduled 
                           ? "Smart reminders are active. You'll receive a nudge 60 minutes before each scheduled call."
                           : "Configuring notification engine..."}
                      </Text>
                      <TouchableOpacity onPress={handleCancelAll} style={styles.clearBtn}>
                         <BellOff size={14} color={colors.textMuted} />
                         <Text style={styles.clearBtnText}>Disable All</Text>
                      </TouchableOpacity>
                   </GlassCard>
                </View>

                <FlatList
                    data={DEMO_FOLLOWUPS}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    ListHeaderComponent={() => (
                       <Text style={styles.listLabel}>Upcoming Follow-ups</Text>
                    )}
                    ListFooterComponent={() => (
                        <TouchableOpacity style={styles.syncBtn} onPress={handleScheduleAll}>
                            <Clock size={18} color={colors.white} />
                            <Text style={styles.syncBtnText}>Re-Sync All Reminders</Text>
                        </TouchableOpacity>
                    )}
                />
            </SafeAreaView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    bannerArea: {
        padding: 16,
    },
    bannerCard: {
        padding: 16,
        gap: 8,
    },
    bannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bannerTitle: {
        ...theme.typography.caption,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },
    bannerDesc: {
        ...theme.typography.body,
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    clearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        marginTop: 4,
        gap: 6,
        padding: 4,
    },
    clearBtnText: {
        ...theme.typography.caption,
        fontSize: 11,
        color: colors.textMuted,
        fontWeight: '700',
    },
    list: { 
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    listLabel: {
        ...theme.typography.caption,
        fontWeight: '800',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
        marginTop: 8,
    },
    card: {
        padding: 16,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainInfo: {
        flex: 1,
        gap: 4,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    nameText: {
        ...theme.typography.h3,
        fontSize: 16,
        color: colors.textPrimary,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    pendingBadge: { backgroundColor: 'rgba(255,193,7,0.1)' },
    doneBadge: { backgroundColor: 'rgba(16,185,129,0.1)' },
    statusText: {
        ...theme.typography.caption,
        fontSize: 10,
        fontWeight: '800',
    },
    pendingText: { color: colors.primaryDark },
    doneText: { color: colors.success },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        ...theme.typography.caption,
        color: colors.textMuted,
        fontWeight: '600',
    },
    metaDivider: {
        width: 1,
        height: 10,
        backgroundColor: colors.divider,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.3)',
    },
    reminderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    reminderText: {
        ...theme.typography.caption,
        color: colors.success,
        fontSize: 10,
        fontWeight: '700',
    },
    testBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
        ...theme.shadows.sm,
    },
    testBtnText: {
        ...theme.typography.button,
        fontSize: 11,
        color: colors.primaryDark,
        fontWeight: '800',
    },
    syncBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E293B', // Slate back
        marginTop: 24,
        paddingVertical: 16,
        borderRadius: 16,
        gap: 10,
        ...theme.shadows.md,
    },
    syncBtnText: {
        ...theme.typography.button,
        color: colors.white,
        fontSize: 15,
        fontWeight: '700',
    },
});
