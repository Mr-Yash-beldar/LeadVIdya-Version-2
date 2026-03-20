import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import {
  Calendar,
  Activity,
  X,
  Clock,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Zap,
  TrendingUp,
  BarChart3,
  ChevronRight,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import { api } from '../services/api';
import { ReportMetrics } from '../types/Report';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';
import { CustomButton } from '../components/CustomButton';
import { useNetwork } from '../context/NetworkContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// -- Premium Skeleton Loading --
const SkeletonCard = () => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6]
  });

  return (
    <View style={styles.card}>
      <GlassCard style={styles.skeletonInner}>
        <Animated.View style={[styles.skeletonValue, { opacity }]} />
        <Animated.View style={[styles.skeletonLabel, { opacity, width: '70%' }]} />
      </GlassCard>
    </View>
  );
};

const SkeletonSection = ({ title, rows = 4 }: { title: string; rows?: number }) => (
  <View style={styles.sectionContainer}>
    <View style={styles.skeletonTitle} />
    <View style={styles.grid}>
      {Array.from({ length: rows }).map((_, i) => <SkeletonCard key={i} />)}
    </View>
  </View>
);

// -- Professional Metric Component --
const MetricCard = ({ label, value, subValue, icon: Icon, color = colors.primary }: any) => (
  <View style={styles.card}>
    <GlassCard style={styles.metricCardInner}>
      <View style={styles.metricHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <Icon size={18} color={color} />
        </View>
        <Text style={styles.cardValue}>{value ?? 0}</Text>
      </View>
      <Text style={styles.cardLabel} numberOfLines={1}>{label}</Text>
      {subValue ? (
        <View style={styles.subValueRow}>
          <TrendingUp size={12} color={colors.success} />
          <Text style={styles.cardSubValue}>{subValue}</Text>
        </View>
      ) : null}
    </GlassCard>
  </View>
);

export const CallAnalyticsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'custom'>('today');

  const [customStart, setCustomStart] = useState<Date>(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d;
  });
  const [customEnd, setCustomEnd] = useState<Date>(new Date());
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end'>('start');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const getISOLocalBoundaries = (date: Date, type: 'start' | 'end') => {
    const d = new Date(date);
    if (type === 'start') {
      d.setHours(0, 0, 0, 0);
    } else {
      d.setHours(23, 59, 59, 999);
    }
    return d.toISOString();
  };

  const getDateRange = useCallback(() => {
    const now = new Date();
    if (dateFilter === 'today') {
      return { start: getISOLocalBoundaries(now, 'start'), end: getISOLocalBoundaries(now, 'end') };
    }
    if (dateFilter === 'yesterday') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      return { start: getISOLocalBoundaries(y, 'start'), end: getISOLocalBoundaries(y, 'end') };
    }
    return {
      start: getISOLocalBoundaries(customStart, 'start'),
      end: getISOLocalBoundaries(customEnd, 'end'),
    };
  }, [dateFilter, customStart, customEnd]);

  const { checkNow } = useNetwork();

  const fetchReport = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      checkNow();
    }
    else setLoading(true);
    try {
      const { start, end } = getDateRange();
      const response = await api.getCallReports(start, end);
      if (response.success) {
        // Use metrics directly from API response as requested
        setMetrics(response.metrics || response.data?.metrics || null);
      } else {
        Alert.alert('Report Error', response.message || 'Could not fetch report data.');
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
      Alert.alert('Error', 'Failed to connect to report server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getDateRange, checkNow]);

  useEffect(() => { fetchReport(); }, [dateFilter]);

  return (
    <ScreenWrapper navigation={navigation} title="Reports">
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View style={styles.container}>
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {(['today', 'yesterday'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.dateChip, dateFilter === filter && styles.dateChipActive]}
                onPress={() => setDateFilter(filter)}
              >
                <Text style={[styles.dateChipText, dateFilter === filter && styles.dateChipTextActive]}>
                  {filter.charAt(0) + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.dateChip, dateFilter === 'custom' && styles.dateChipActive]}
              onPress={() => setShowRangeModal(true)}
            >
              <Calendar size={14} color={dateFilter === 'custom' ? colors.primaryDark : colors.textMuted} />
              <Text style={[styles.dateChipText, dateFilter === 'custom' && styles.dateChipTextActive]}>
                {dateFilter === 'custom' ? `${fmtDate(customStart)} - ${fmtDate(customEnd)}` : 'Custom Range'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchReport(true)} colors={[colors.primary]} />
          }
        >
          {loading && !refreshing ? (
            <View style={styles.reportsContainer}>
              <SkeletonSection title="Performance" rows={4} />
              <SkeletonSection title="Traffic" rows={4} />
              <SkeletonSection title="Engagement" rows={4} />
              <SkeletonSection title="Dispositions" rows={4} />
            </View>
          ) : metrics ? (
            <View style={styles.reportsContainer}>
              <View style={styles.sectionHeader}>
                <Zap size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Performance Overview</Text>
              </View>
              <View style={styles.grid}>
                <MetricCard label="Total Calls" value={metrics.callOverview.totalCalls} icon={Phone} color={colors.primary} />
                <MetricCard label="Unique Calls" value={metrics.callOverview.uniqueCalls} icon={Phone} color={colors.primary} />
                <MetricCard label="Total Time" value={metrics.callOverview.totalCallTime} icon={Clock} color={colors.accent} />
                <MetricCard label="Avg Duration" value={metrics.callOverview.avgCallDuration} icon={Activity} color={colors.warning} />
                <MetricCard label="Connected" value={metrics.callOverview.totalConnected} icon={Zap} color={colors.success} />
              </View>

              <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <PhoneIncoming size={20} color={colors.success} />
                <Text style={styles.sectionTitle}>Inbound Traffic</Text>
              </View>
              <View style={styles.grid}>
                <MetricCard label="Total Incoming" value={metrics.incomingCalls.totalIncoming} icon={PhoneIncoming} color={colors.success} />
                <MetricCard label="Connected" value={metrics.incomingCalls.incomingConnected} icon={Zap} color={colors.success} />
                <MetricCard label="Missed" value={metrics.incomingCalls.incomingUnanswered} icon={X} color={colors.error} />
                <MetricCard label="Avg Duration" value={metrics.incomingCalls.avgIncomingDuration} icon={Clock} color={colors.textSecondary} />
              </View>

              <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <PhoneOutgoing size={20} color={colors.accent} />
                <Text style={styles.sectionTitle}>Outbound Traffic</Text>
              </View>
              <View style={styles.grid}>
                <MetricCard label="Total Outgoing" value={metrics.outgoingCalls.totalOutgoing} icon={PhoneOutgoing} color={colors.accent} />
                <MetricCard label="Outbound Connected" value={metrics.outgoingCalls.outgoingConnected} icon={Zap} color={colors.success} />
                <MetricCard label="No Answer" value={metrics.outgoingCalls.outgoingUnanswered} icon={X} color={colors.error} />
                <MetricCard label="Avg Duration" value={metrics.outgoingCalls.avgOutgoingDuration} icon={Clock} color={colors.textSecondary} />
              </View>


            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <BarChart3 size={64} color={colors.divider} />
              <Text style={styles.emptyTitle}>No Data Found</Text>
              <Text style={styles.emptySubtitle}>We couldn't find any reports for the selected range.</Text>
            </View>
          )}
        </ScrollView>

        {/* Custom Range Modal */}
        <Modal visible={showRangeModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date Range</Text>
                <TouchableOpacity onPress={() => setShowRangeModal(false)} style={styles.closeBtn}>
                  <X size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.datePickerSection}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <TouchableOpacity
                    style={styles.dateDisplay}
                    onPress={() => { setPickerTarget('start'); setShowDatePicker(true); }}
                  >
                    <Calendar size={18} color={colors.primary} />
                    <Text style={styles.dateText}>{fmtDate(customStart)}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.datePickerSection}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <TouchableOpacity
                    style={styles.dateDisplay}
                    onPress={() => { setPickerTarget('end'); setShowDatePicker(true); }}
                  >
                    <Calendar size={18} color={colors.primary} />
                    <Text style={styles.dateText}>{fmtDate(customEnd)}</Text>
                  </TouchableOpacity>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={pickerTarget === 'start' ? customStart : customEnd}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    maximumDate={new Date()}
                    onChange={(event, selected) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (selected) {
                        if (pickerTarget === 'start') setCustomStart(selected);
                        else setCustomEnd(selected);
                      }
                    }}
                  />
                )}

                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() => {
                    if (customStart > customEnd) {
                      Alert.alert('Invalid Range', 'Start date cannot be after end date.');
                      return;
                    }
                    setDateFilter('custom');
                    setShowRangeModal(false);
                    fetchReport();
                  }}
                >
                  <Text style={styles.applyBtnText}>Apply Custom Range</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        </Modal>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterBar: {
    backgroundColor: colors.surface,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    ...theme.shadows.sm,
  },
  chipScroll: {
    paddingHorizontal: theme.spacing.md,
    gap: 8,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: 6,
  },
  dateChipActive: {
    backgroundColor: 'rgba(255,193,7,0.1)',
    borderColor: colors.primary,
  },
  dateChipText: {
    ...theme.typography.button,
    fontSize: 13,
    color: colors.textMuted,
  },
  dateChipTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  reportsContainer: {
    padding: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    ...theme.typography.h3,
    fontSize: 18,
    color: colors.textPrimary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: (SCREEN_WIDTH - theme.spacing.md * 2 - 12) / 2,
    marginBottom: 4,
  },
  metricCardInner: {
    padding: theme.spacing.md,
    height: 120,
    justifyContent: 'space-between',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardValue: {
    ...theme.typography.h2,
    fontSize: 22,
    color: colors.textPrimary,
  },
  cardLabel: {
    ...theme.typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 8,
  },
  subValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardSubValue: {
    ...theme.typography.caption,
    fontSize: 10,
    color: colors.success,
    fontWeight: '800',
  },
  skeletonInner: {
    padding: theme.spacing.md,
    height: 120,
  },
  skeletonValue: {
    height: 28,
    width: '50%',
    backgroundColor: colors.divider,
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonLabel: {
    height: 14,
    width: '80%',
    backgroundColor: colors.divider,
    borderRadius: 4,
  },
  skeletonTitle: {
    height: 24,
    width: '40%',
    backgroundColor: colors.divider,
    borderRadius: 6,
    marginBottom: 16,
    marginHorizontal: theme.spacing.md,
  },
  sectionContainer: {
    marginTop: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: theme.spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    ...theme.typography.h2,
    fontSize: 22,
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    gap: 20,
  },
  datePickerSection: {
    gap: 8,
  },
  dateLabel: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: 12,
  },
  dateText: {
    ...theme.typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  applyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
    ...theme.shadows.md,
  },
  applyBtnText: {
    ...theme.typography.button,
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
