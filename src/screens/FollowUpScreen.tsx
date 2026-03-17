import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Bell,
    BellOff,
    Clock,
    User,
    Calendar,
    CheckCircle,
    AlarmClock,
    AlertTriangle,
    RefreshCw,
    Inbox,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import { api } from '../services/api';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FollowUpTask {

    id?: string;
    name: string;
    timing: any;
    followupDate?: string;
    followUpTime?: string;
    followUpTimestamp?: number;
    status?: string;
    phone?: string;
}

function getDateTimeAndMinutesLeft(dateString: any) {
    const target: any = new Date(dateString);
    const now: any = new Date();

    // format date
    const date = target.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    // format time
    const time = target.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });


    const diffMs = target - now;
    const minutesLeft = Math.floor(diffMs / (1000 * 60));

    return {
        date,
        time,
        minutesLeft: minutesLeft > 0 ? `${minutesLeft} minutes left` : "Time passed"
    };
}


/** Handles both Mongoose _id and plain id from the API */
const getId = (task: FollowUpTask): string => task.id || '';

type Section = 'overdue' | 'upcoming';

// ─── Screen ───────────────────────────────────────────────────────────────────

export const FollowUpScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [overdue, setOverdue] = useState<FollowUpTask[]>([]);
    const [upcoming, setUpcoming] = useState<FollowUpTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<Section>('overdue');

    const fetchFollowUps = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const data = await api.getUrgentNotifications();
            if (data) {
                setOverdue(Array.isArray(data.overdue) ? data.overdue : []);
                setUpcoming(Array.isArray(data.upcoming) ? data.upcoming : []);
            }
        } catch (e: any) {
            Alert.alert('Error', 'Could not load follow-ups. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchFollowUps();
    }, [fetchFollowUps]);

    // ── Actions ────────────────────────────────────────────────────────────────

    const handleComplete = useCallback(async (task: FollowUpTask) => {
        const taskId = getId(task);
        if (!taskId) {
            Alert.alert('Error', 'Could not identify this follow-up. Please refresh and try again.');
            return;
        }
        Alert.alert(
            'Complete Follow-up',
            `Mark follow-up with ${task.name} as completed?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete',
                    onPress: async () => {
                        setActionLoading(taskId);
                        try {
                            await api.completeFollowUp(taskId, 'qualified', '');
                            await api.markNotificationAsRead(taskId);
                            Alert.alert('Done ✅', `Follow-up with ${task.name} marked as complete.`);
                            fetchFollowUps(true);
                        } catch {
                            Alert.alert('Error', 'Could not complete follow-up.');
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    }, [fetchFollowUps]);

    const handleSnooze = useCallback(async (task: FollowUpTask) => {
        const taskId = getId(task);
        if (!taskId) {
            Alert.alert('Error', 'Could not identify this follow-up. Please refresh and try again.');
            return;
        }
        Alert.alert(
            'Snooze Follow-up',
            `Snooze reminder for ${task.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Snooze 15 min',
                    onPress: async () => {
                        setActionLoading(taskId);
                        try {
                            await api.snoozeNotification(taskId, 15);
                            Alert.alert('Snoozed 💤', `Reminder snoozed for 15 minutes.`);
                            fetchFollowUps(true);
                        } catch {
                            Alert.alert('Error', 'Could not snooze. Try again.');
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    }, [fetchFollowUps]);

    // ── Render item ─────────────────────────────────────────────────────────────

    const renderItem = ({ item }: { item: FollowUpTask }) => {
        // console.log('item', item);
        item.timing = getDateTimeAndMinutesLeft(item.followupDate);
        const isOverdueItem = activeSection === 'overdue';
        const taskId = getId(item);
        const isActing = actionLoading === taskId;
        const name = `${item.name}`;

        return (
            <GlassCard style={styles.card}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                        const leadId = (item as any).leadId || taskId;
                        if (leadId) {
                            navigation.navigate('LeadDetails', { leadId });
                        } else {
                            Alert.alert('Error', 'Lead ID not found for this task.');
                        }
                    }}
                >
                    <View style={styles.cardRow}>
                        <View style={[
                            styles.avatarBox,
                            { backgroundColor: isOverdueItem ? `${colors.error}15` : `${colors.primary} 15` },
                        ]}>
                            {isOverdueItem
                                ? <AlertTriangle size={20} color={colors.error} />
                                : <Clock size={20} color={colors.primary} />}
                        </View>

                        <View style={styles.cardInfo}>
                            <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
                            <View style={styles.metaRow}>
                                {item.timing ? (
                                    <View style={styles.metaItem}>
                                        <Calendar size={11} color={colors.textMuted} />
                                        <Text style={styles.metaText}>{item.timing.date}</Text>
                                    </View>
                                ) : null}
                                {item.timing ? (
                                    <View style={styles.metaItem}>
                                        <AlarmClock size={11} color={colors.textMuted} />
                                        <Text style={styles.metaText}>{item.timing.time}</Text>
                                    </View>
                                ) : null}
                            </View>
                            {item.status ? (
                                <View style={[styles.statusBadge, { backgroundColor: isOverdueItem ? `${colors.error} 15` : `${colors.primary} 15` }]}>
                                    <Text style={[styles.statusText, { color: isOverdueItem ? colors.error : colors.primary }]}>
                                        {item.status.toUpperCase()}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Actions */}
                <View style={styles.actionRow}>
                    {isActing ? (
                        <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                        <>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.snoozeBtn]}
                                onPress={() => handleSnooze(item)}
                            >
                                <AlarmClock size={14} color={colors.textSecondary} />
                                <Text style={styles.snoozeBtnText}>Snooze 15m</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.completeBtn]}
                                onPress={() => handleComplete(item)}
                            >
                                <CheckCircle size={14} color={colors.white} />
                                <Text style={styles.completeBtnText}>Complete</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </GlassCard>
        );
    };

    // ── Sections ────────────────────────────────────────────────────────────────

    const currentData = activeSection === 'overdue' ? overdue : upcoming;

    return (
        <ScreenWrapper navigation={navigation} title="Notifications">
            <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
            <SafeAreaView style={styles.container} edges={['bottom']}>

                {/* Section Tabs */}
                <View style={styles.tabRow}>
                    <TouchableOpacity
                        style={[styles.tab, activeSection === 'overdue' && styles.tabActive]}
                        onPress={() => setActiveSection('overdue')}
                    >
                        <AlertTriangle size={14} color={activeSection === 'overdue' ? colors.error : colors.textMuted} />
                        <Text style={[styles.tabText, activeSection === 'overdue' && styles.tabTextActive]}>
                            Overdue {overdue.length > 0 ? `(${overdue.length})` : ''}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeSection === 'upcoming' && styles.tabActive]}
                        onPress={() => setActiveSection('upcoming')}
                    >
                        <Clock size={14} color={activeSection === 'upcoming' ? colors.primary : colors.textMuted} />
                        <Text style={[styles.tabText, activeSection === 'upcoming' && styles.tabTextActive]}>
                            Upcoming {upcoming.length > 0 ? `(${upcoming.length})` : ''}
                        </Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator color={colors.primary} size="large" />
                        <Text style={styles.loadingText}>Loading follow-ups...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={currentData}
                        keyExtractor={(item) => getId(item) || Math.random().toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => fetchFollowUps(true)}
                                colors={[colors.primary]}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Inbox size={52} color={colors.divider} />
                                <Text style={styles.emptyTitle}>
                                    {activeSection === 'overdue' ? 'No Overdue Tasks 🎉' : 'No Upcoming Follow-ups'}
                                </Text>
                                <Text style={styles.emptySubtitle}>
                                    {activeSection === 'overdue'
                                        ? 'You are all caught up!'
                                        : 'No follow-ups scheduled for the next 60 minutes.'}
                                </Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </ScreenWrapper>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    tabRow: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 4,
        borderRadius: 14,
        padding: 4,
        gap: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    tabActive: {
        backgroundColor: colors.background,
        ...theme.shadows.sm,
    },
    tabText: {
        ...theme.typography.caption,
        fontWeight: '700',
        color: colors.textMuted,
        fontSize: 13,
    },
    tabTextActive: {
        color: colors.textPrimary,
    },
    list: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        padding: 16,
        gap: 14,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    avatarBox: {
        width: 46,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfo: {
        flex: 1,
        gap: 4,
    },
    nameText: {
        ...theme.typography.h3,
        fontSize: 16,
        color: colors.textPrimary,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        ...theme.typography.caption,
        color: colors.textMuted,
        fontWeight: '600',
        fontSize: 11,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 2,
    },
    statusText: {
        ...theme.typography.caption,
        fontSize: 10,
        fontWeight: '800',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.06)',
        paddingTop: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
    },
    snoozeBtn: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    snoozeBtnText: {
        ...theme.typography.caption,
        fontWeight: '700',
        color: colors.textSecondary,
        fontSize: 12,
    },
    completeBtn: {
        backgroundColor: colors.success,
    },
    completeBtnText: {
        ...theme.typography.caption,
        fontWeight: '700',
        color: colors.white,
        fontSize: 12,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        ...theme.typography.body,
        color: colors.textMuted,
    },
    emptyBox: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
        paddingHorizontal: 40,
        gap: 10,
    },
    emptyTitle: {
        ...theme.typography.h3,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    emptySubtitle: {
        ...theme.typography.body,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
});
