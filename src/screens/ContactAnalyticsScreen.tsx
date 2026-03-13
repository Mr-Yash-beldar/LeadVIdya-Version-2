import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  Dimensions,
  Platform
} from 'react-native';
import { 
  ArrowLeft, 
  Funnel, 
  MoreVertical, 
  Activity, 
  History, 
  PieChart, 
  Zap, 
  Clock, 
  PhoneIncoming, 
  PhoneOutgoing,
  ShieldCheck,
  UserPlus
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import { CallLogService } from '../services/CallLogService';
import { CallLog } from '../types/CallLog';
import { calculateCallStats, formatDurationLong } from '../utils/analyticsUtils';
import { DonutChart } from '../components/DonutChart';
import { CallLogItem } from '../components/CallLogItem';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Tab = 'Summary' | 'History';

export const ContactAnalyticsScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { phoneNumber, name } = route.params;
  const [contactLogs, setContactLogs] = useState<CallLog[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('Summary');

  const loadContactLogs = useCallback(async () => {
    const logs = await CallLogService.getCallLogs();
    const filtered = logs.filter(log => log.phoneNumber === phoneNumber);
    setContactLogs(filtered);
  }, [phoneNumber]);

  useEffect(() => {
    loadContactLogs();
  }, [loadContactLogs]);

  const stats = useMemo(() => calculateCallStats(contactLogs), [contactLogs]);

  const durationRange = useMemo(() => {
    if (contactLogs.length === 0) return { start: '-', end: '-', days: 0 };
    const timestamps = contactLogs.map(l => l.timestamp).sort((a, b) => a - b);
    const start = new Date(timestamps[0]);
    const end = new Date(timestamps[timestamps.length - 1]);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    const formatDate = (d: Date) => 
      d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    return { start: formatDate(start), end: formatDate(end), days };
  }, [contactLogs]);

  return (
    <ScreenWrapper navigation={navigation} title="Contact Insight">
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View style={styles.container}>
        
        {/* Contact Header Card */}
        <View style={styles.headerCard}>
           <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{name?.charAt(0) || '?'}</Text>
           </View>
           <View style={styles.headerInfo}>
              <Text style={styles.contactName}>{name || 'Unknown Contact'}</Text>
              <Text style={styles.contactPhone}>{phoneNumber}</Text>
           </View>
           <View style={styles.badgeRow}>
              <View style={styles.activeBadge}>
                 <ShieldCheck size={12} color={colors.success} />
                 <Text style={styles.activeBadgeText}>Verified</Text>
              </View>
           </View>
        </View>

        {/* Professional Tab Navigation */}
        <View style={styles.tabContainer}>
           <View style={styles.segmentedControl}>
              {(['Summary', 'History'] as Tab[]).map((tab) => (
                <TouchableOpacity 
                  key={tab}
                  style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                </TouchableOpacity>
              ))}
           </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
           {activeTab === 'Summary' ? (
             <View style={styles.summaryContainer}>
                {/* Duration Insights */}
                <View style={styles.rangeBox}>
                   <View style={styles.rangeItem}>
                      <Clock size={16} color={colors.textMuted} />
                      <View>
                        <Text style={styles.rangeTitle}>Period</Text>
                        <Text style={styles.rangeValue}>{durationRange.start} - {durationRange.end}</Text>
                      </View>
                   </View>
                   <View style={styles.verticalDivider} />
                   <View style={styles.rangeItem}>
                      <Activity size={16} color={colors.textMuted} />
                      <View>
                        <Text style={styles.rangeTitle}>Interactions</Text>
                        <Text style={styles.rangeValue}>{durationRange.days} Days</Text>
                      </View>
                   </View>
                </View>

                {/* Engagement Chart */}
                <GlassCard style={styles.chartCard}>
                   <View style={styles.cardHeader}>
                      <PieChart size={18} color={colors.primary} />
                      <Text style={styles.cardTitle}>Call Distribution</Text>
                   </View>
                   <View style={styles.chartWrapper}>
                      <DonutChart
                        incoming={stats.incoming}
                        outgoing={stats.outgoing}
                        missed={stats.missed}
                        rejected={stats.rejected}
                        size={SCREEN_WIDTH * 0.5}
                      />
                   </View>
                </GlassCard>

                {/* Data Insights Grid */}
                <View style={styles.statsGrid}>
                   <SummaryMetric label="Incoming" value={stats.incoming} subValue={formatDurationLong(stats.incomingDuration)} color={colors.success} icon={PhoneIncoming} />
                   <SummaryMetric label="Outgoing" value={stats.outgoing} subValue={formatDurationLong(stats.outgoingDuration)} color={colors.accent} icon={PhoneOutgoing} />
                   <SummaryMetric label="No Answer" value={stats.missed + stats.rejected} subValue="Missed/Rejected" color={colors.error} icon={History} />
                   <SummaryMetric label="Total Talk" value={stats.total} subValue={formatDurationLong(stats.totalDuration)} color={colors.primary} icon={Zap} />
                </View>
             </View>
           ) : (
             <View style={styles.historyContainer}>
                <View style={styles.listHeader}>
                   <History size={16} color={colors.textMuted} />
                   <Text style={styles.listLabel}>Full Interaction Log</Text>
                </View>
                {contactLogs.map((log, idx) => (
                  <CallLogItem key={log.id || idx} item={log} simCount={2} />
                ))}
             </View>
           )}
        </ScrollView>

        <View style={styles.footer}>
           <TouchableOpacity style={styles.actionBtn}>
              <UserPlus size={18} color={colors.white} />
              <Text style={styles.actionBtnText}>Add to CRM Group</Text>
           </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
};

// -- Helper Components --
const SummaryMetric = ({ label, value, subValue, color, icon: Icon }: any) => (
  <View style={styles.metricWrapper}>
     <GlassCard style={styles.metricCard}>
        <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
           <Icon size={16} color={color} />
        </View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricSub}>{subValue}</Text>
     </GlassCard>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerCard: {
    backgroundColor: colors.surface,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,193,7,0.2)',
    ...theme.shadows.md,
  },
  avatarInitial: {
    ...theme.typography.h1,
    fontSize: 28,
    color: colors.white,
  },
  headerInfo: {
    alignItems: 'center',
  },
  contactName: {
    ...theme.typography.h2,
    fontSize: 22,
    color: colors.textPrimary,
  },
  contactPhone: {
    ...theme.typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  activeBadgeText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    textTransform: 'uppercase',
  },
  tabContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: colors.surface,
    ...theme.shadows.sm,
  },
  tabText: {
    ...theme.typography.button,
    fontSize: 13,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  summaryContainer: {
    gap: 20,
  },
  rangeBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  rangeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 16,
  },
  rangeTitle: {
    ...theme.typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rangeValue: {
    ...theme.typography.caption,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  chartCard: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  cardTitle: {
    ...theme.typography.caption,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricWrapper: {
    width: (SCREEN_WIDTH - 40 - 12) / 2,
  },
  metricCard: {
    padding: 16,
    gap: 4,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    ...theme.typography.h3,
    fontSize: 18,
    color: colors.textPrimary,
  },
  metricLabel: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  metricSub: {
    ...theme.typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyContainer: {
    gap: 16,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  listLabel: {
    ...theme.typography.caption,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    ...theme.shadows.md,
  },
  actionBtnText: {
    ...theme.typography.button,
    color: colors.white,
    fontWeight: '800',
  },
});
