import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BarChart3,
  Users,
  Briefcase,
  Phone,
  LayoutDashboard,
  ChevronRight,
  TrendingUp,
  Clock,
  Zap,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const sections = useMemo(() => [
    {
      title: 'Campaigns',
      subtitle: 'Manage active projects',
      icon: Briefcase,
      color: colors.primary,
      screen: 'Campaigns',
      stat: '12 Active'
    },
    {
      title: 'Leads',
      subtitle: 'Track your prospects',
      icon: Users,
      color: colors.success,
      screen: 'Leads',
      stat: '45 New'
    },
    {
      title: 'Reports',
      subtitle: 'Call & performance stats',
      icon: BarChart3,
      color: colors.accent,
      screen: 'Analytics',
      stat: 'Today'
    },
    {
      title: 'Call Logs',
      subtitle: 'History & recordings',
      icon: Phone,
      color: colors.warning,
      screen: 'Call History',
      stat: 'View All'
    },
  ], []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const dateStr = new Date().toLocaleDateString('en-GB', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'short' 
  });

  return (
    <ScreenWrapper navigation={navigation} title="Dashboard">
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Greeting Header */}
          <View style={styles.headerArea}>
            <View>
              <Text style={styles.greetingText}>{greeting}, Sales Agent</Text>
              <Text style={styles.dateText}>{dateStr}</Text>
            </View>
            <View style={styles.statBox}>
               <Zap size={14} color={colors.primaryDark} />
               <Text style={styles.statText}>Lvl 4</Text>
            </View>
          </View>

          {/* Quick Metrics */}
          <GlassCard style={styles.metricsCard}>
             <View style={styles.metricsHeader}>
                <TrendingUp size={18} color={colors.primary} />
                <Text style={styles.metricsTitle}>Performance Metrics</Text>
             </View>
             <View style={styles.metricsRow}>
                <MetricItem label="Connected" value="84%" />
                <View style={styles.verticalDivider} />
                <MetricItem label="Avg Talk" value="4:22" />
                <View style={styles.verticalDivider} />
                <MetricItem label="Targets" value="12/15" />
             </View>
          </GlassCard>

          <Text style={styles.sectionLabel}>Quick Access</Text>

          {/* 2-Column Grid */}
          <View style={styles.grid}>
            {sections.map((section, index) => (
              <TouchableOpacity
                key={index}
                style={styles.cardWrapper}
                activeOpacity={0.8}
                onPress={() => {
                  navigation.navigate('MainTabs', {
                    screen: section.screen,
                  });
                }}
              >
                <GlassCard style={styles.cardInner}>
                  <View style={[styles.iconBox, { backgroundColor: `${section.color}15` }]}>
                    <section.icon size={24} color={section.color} />
                  </View>
                  
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{section.title}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{section.subtitle}</Text>
                  </View>

                  <View style={styles.cardFooter}>
                     <Text style={[styles.statBadge, { color: section.color }]}>{section.stat}</Text>
                     <ChevronRight size={16} color={colors.textMuted} />
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>

          {/* Ongoing Task Card */}
          <TouchableOpacity style={styles.ongoingTask}>
             <GlassCard style={styles.ongoingInner}>
                <View style={styles.ongoingHeader}>
                   <View style={styles.row}>
                      <Clock size={16} color={colors.primary} />
                      <Text style={styles.ongoingLabel}>NEXT FOLLOW-UP</Text>
                   </View>
                   <Text style={[styles.statBadge, { color: colors.primary }]}>In 25m</Text>
                </View>
                <Text style={styles.ongoingTitle}>Reviewing 'Smart Health' Campaign</Text>
                <Text style={styles.ongoingDesc}>Discuss premium plan enrollment with Megha Shah.</Text>
             </GlassCard>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </ScreenWrapper>
  );
};

const MetricItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metricItem}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingText: {
    ...theme.typography.h2,
    fontSize: 22,
    color: colors.textPrimary,
  },
  dateText: {
    ...theme.typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,193,7,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statText: {
    ...theme.typography.caption,
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 11,
  },
  metricsCard: {
    padding: 20,
    marginBottom: 32,
  },
  metricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  metricsTitle: {
    ...theme.typography.caption,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    ...theme.typography.h3,
    fontSize: 18,
    color: colors.textPrimary,
  },
  metricLabel: {
    ...theme.typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.divider,
    opacity: 0.5,
  },
  sectionLabel: {
    ...theme.typography.caption,
    color: colors.textMuted,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  cardWrapper: {
    width: (SCREEN_WIDTH - 40 - 12) / 2,
  },
  cardInner: {
    padding: 16,
    height: 160,
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    marginTop: 12,
  },
  cardTitle: {
    ...theme.typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
  },
  cardSubtitle: {
    ...theme.typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  statBadge: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ongoingTask: {
    marginTop: 8,
  },
  ongoingInner: {
    padding: 20,
  },
  ongoingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ongoingLabel: {
    ...theme.typography.caption,
    fontWeight: '800',
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1,
  },
  ongoingTitle: {
    ...theme.typography.h3,
    fontSize: 15,
    color: colors.textPrimary,
  },
  ongoingDesc: {
    ...theme.typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

export default DashboardScreen;