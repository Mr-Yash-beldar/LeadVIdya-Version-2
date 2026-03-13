import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  StatusBar,
  Platform,
} from 'react-native';
import {
  ChevronRight,
  Search,
  Clock,
  UserPlus,
  CheckSquare,
  BarChart2,
  Activity,
  Filter,
  Users,
  Calendar,
  PhoneOff,
  Star
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LeadsService } from '../services/LeadsService';
import { api } from '../services/api';
import { Lead } from '../types/Lead';
import { useNetwork } from '../context/NetworkContext';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';
import { SearchBar } from '../components/SearchBar';
import { AddLeadModal } from '../components/AddLeadModal';

type TabType = 'myLeads' | 'myTasks' | 'stages';
type ViewType = 'dashboard' | 'list';
type CategoryType = 'new' | 'followup' | 'notConnected';

// -- Enhanced Coming Soon Placeholder --
const ComingSoonView = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View style={csStyles.container}>
    <View style={csStyles.iconCircle}>
      {title === 'My Tasks' ?
        <CheckSquare size={36} color={colors.primary} /> :
        <BarChart2 size={36} color={colors.primary} />
      }
    </View>
    <Text style={csStyles.title}>{title}</Text>
    <Text style={csStyles.subtitle}>{subtitle}</Text>
    <GlassCard style={csStyles.badge}>
      <Text style={csStyles.badgeText}>🚀 Premium Feature</Text>
    </GlassCard>
  </View>
);

const csStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,193,7,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.15)',
  },
  title: {
    ...theme.typography.h2,
    color: colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  badge: {
    backgroundColor: 'rgba(255,193,7,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.2)',
  },
  badgeText: {
    ...theme.typography.caption,
    fontWeight: '800',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

// -- Modern Lead Card Component --
const LeadCard = React.memo(({ item, onPress }: { item: Lead; onPress: (lead: Lead) => void }) => {
  const name = `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.name || 'Unknown Lead';
  const campaign = item.campaignName || item.campaign?.name || 'General';
  const status = item.leadStatus || item.status || 'OPEN';
  
  const getStatusStyle = (s: string) => {
    const lower = s.toLowerCase();
    if (lower.includes('open')) return { bg: 'rgba(16,185,129,0.1)', text: colors.success };
    if (lower.includes('follow')) return { bg: 'rgba(245,158,11,0.1)', text: colors.warning };
    if (lower.includes('not')) return { bg: 'rgba(239,68,68,0.1)', text: colors.error };
    return { bg: colors.divider, text: colors.textSecondary };
  };

  const statusStyle = getStatusStyle(status);

  return (
    <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.7}>
      <GlassCard style={styles.leadCard}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
             <View style={styles.avatar}>
               <Text style={styles.avatarText}>{name.charAt(0)}</Text>
             </View>
          </View>
          <View style={styles.cardMain}>
            <View style={styles.nameRow}>
              <Text style={styles.leadName} numberOfLines={1}>{name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]}>{status}</Text>
              </View>
            </View>
            <View style={styles.campaignRow}>
              <Activity size={12} color={colors.textMuted} />
              <Text style={styles.campaignText}>{campaign}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerInfo}>
             <Calendar size={14} color={colors.textMuted} />
             <Text style={styles.footerLabel}>Next follow-up:</Text>
             <Text style={styles.footerValue}>{item.next_followup_date || 'Not set'}</Text>
          </View>
          <ChevronRight size={18} color={colors.divider} />
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
});

export const LeadsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const campaignId = route.params?.campaignId;
  const campaignName = route.params?.campaignName;
  const initialSearch = route.params?.initialSearch;
  const openAdd = route.params?.openAdd;

  const [activeTab, setActiveTab] = useState<TabType>('myLeads');
  const [view, setView] = useState<ViewType>(campaignId ? 'list' : 'dashboard');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  useEffect(() => {
    if (openAdd) {
      setIsAddModalVisible(true);
    }
  }, [openAdd]);

  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
      setView('list');
    }
  }, [initialSearch]);

  const fetchLeads = useCallback(async (force = false) => {
    try {
      if (!force) setLoading(true);
      const data = await LeadsService.getAssignedLeads(1, 100, force);
      setLeads(data);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const { checkNow } = useNetwork();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    checkNow();
    fetchLeads(true);
  }, [fetchLeads, checkNow]);

  const handleLeadPress = useCallback((l: Lead) => {
    navigation.navigate('LeadDetails', { lead: l });
  }, [navigation]);

  const handleAddLeadSubmit = useCallback(async (data: { firstName: string; lastName: string; campaign: string }) => {
    try {
      const response = await api.createLead({
        firstName: data.firstName,
        lastName: data.lastName,
        campaign: data.campaign,
        phone: initialSearch
      });
      if (response.success) {
        setIsAddModalVisible(false);
        fetchLeads(true);
      }
    } catch (error) {
      console.error('Failed to create lead:', error);
      throw error;
    }
  }, [initialSearch, fetchLeads]);

  const renderLeadItem = useCallback(({ item }: { item: Lead }) => (
    <LeadCard item={item} onPress={handleLeadPress} />
  ), [handleLeadPress]);

  const filteredLeads = useMemo(() => {
    let result = leads;

    if (campaignId) {
      result = result.filter((l: Lead) => 
        (l as any).campaignId === campaignId || 
        l.campaign?._id === campaignId || 
        l.campaignName === campaignName ||
        l.campaign?.name === campaignName
      );
    }

    if (selectedCategory === 'new') {
      result = result.filter((l: Lead) => !l.last_contacted_date);
    } else if (selectedCategory === 'followup') {
      result = result.filter((l: Lead) => l.next_followup_date || l.followUpDate);
    } else if (selectedCategory === 'notConnected') {
      result = result.filter((l: Lead) => l.leadStatus === 'Not Connected' || l.status === 'Not Connected');
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((l: Lead) =>
        (l.firstName && l.firstName.toLowerCase().includes(query)) ||
        (l.lastName && l.lastName.toLowerCase().includes(query)) ||
        (l.name && l.name.toLowerCase().includes(query)) ||
        (l.phone && l.phone.includes(query)) ||
        (l.campaignName && l.campaignName.toLowerCase().includes(query)) ||
        (l.campaign?.name && l.campaign?.name.toLowerCase().includes(query))
      );
    }

    return result;
  }, [leads, selectedCategory, searchQuery, campaignId, campaignName]);

  const renderDashboard = () => (
    <View style={styles.dashboardContainer}>
      <View style={styles.summaryHeader}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <Text style={styles.metaText}>{leads.length} Total Leads</Text>
      </View>

      <TouchableOpacity
        onPress={() => { setSelectedCategory('new'); setView('list'); }}
        activeOpacity={0.8}
        style={styles.categoryPressable}
      >
        <GlassCard style={styles.categoryCard}>
          <View style={[styles.categoryIconContainer, { backgroundColor: 'rgba(99,102,241,0.08)' }]}>
            <UserPlus size={24} color={colors.accent} />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryTitle}>New Leads</Text>
            <Text style={styles.categorySubtitle}>Awaiting initial contact</Text>
          </View>
          <View style={styles.countBadge}>
             <Text style={styles.countText}>{leads.filter(l => !l.last_contacted_date).length}</Text>
          </View>
        </GlassCard>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => { setSelectedCategory('followup'); setView('list'); }}
        activeOpacity={0.8}
        style={styles.categoryPressable}
      >
        <GlassCard style={styles.categoryCard}>
          <View style={[styles.categoryIconContainer, { backgroundColor: 'rgba(245,158,11,0.08)' }]}>
            <Clock size={24} color={colors.warning} />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryTitle}>Follow-ups</Text>
            <Text style={styles.categorySubtitle}>Scheduled tasks & callbacks</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
             <Text style={[styles.countText, { color: colors.warning }]}>
               {leads.filter(l => l.next_followup_date || l.followUpDate).length}
             </Text>
          </View>
        </GlassCard>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => { setSelectedCategory('notConnected'); setView('list'); }}
        activeOpacity={0.8}
        style={styles.categoryPressable}
      >
        <GlassCard style={styles.categoryCard}>
          <View style={[styles.categoryIconContainer, { backgroundColor: 'rgba(239,68,68,0.08)' }]}>
            <PhoneOff size={24} color={colors.error} />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryTitle}>Unresolved</Text>
            <Text style={styles.categorySubtitle}>Not connected or rejected</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
             <Text style={[styles.countText, { color: colors.error }]}>
               {leads.filter(l => l.leadStatus === 'Not Connected' || l.status === 'Not Connected').length}
             </Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenWrapper
      navigation={navigation}
      title={campaignName ? `${campaignName} Leads` : (activeTab === 'myLeads' ? (view === 'dashboard' ? 'My Leads' : (selectedCategory === 'new' ? 'New Leads' : selectedCategory === 'followup' ? 'Follow-ups' : 'Unresolved')) : (activeTab === 'myTasks' ? 'My Tasks' : 'Stages'))}
      onBackPress={() => {
        if (campaignId) {
          navigation.setParams({ campaignId: undefined, campaignName: undefined });
          setView('dashboard');
          return true;
        }
        if (activeTab === 'myLeads' && view === 'list') {
          setView('dashboard');
          setSelectedCategory(null);
          return true;
        }
        return false;
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      
      <View style={styles.tabContainer}>
        <View style={styles.tabBar}>
          {(['myLeads', 'myTasks', 'stages'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => {
                setActiveTab(tab);
                if (tab === 'myLeads') { setView('dashboard'); setSelectedCategory(null); }
              }}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'myLeads' ? 'Leads' : tab === 'myTasks' ? 'Tasks' : 'Stages'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.content}>
        {activeTab === 'myLeads' && (
          <View style={styles.flexOne}>
            {view === 'list' && (
              <View style={styles.searchWrapper}>
                <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
              </View>
            )}

            {loading && !refreshing ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Syncing your leads...</Text>
              </View>
            ) : (
              <View style={styles.flexOne}>
                {view === 'dashboard' ? renderDashboard() : (
                  <FlatList
                    data={filteredLeads}
                    keyExtractor={(item, index) => item._id || item.id || `lead-${index}`}
                    renderItem={renderLeadItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
                    ListEmptyComponent={
                      <View style={styles.emptyContainer}>
                        <Activity size={48} color={colors.divider} />
                        <Text style={styles.emptyTitle}>No leads found</Text>
                        <Text style={styles.emptySubtitle}>Try adjusting your filters or search</Text>
                      </View>
                    }
                  />
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === 'myTasks' && (
          <ComingSoonView
            title="My Tasks"
            subtitle="Centralized management for your daily lead activities and follow-up tasks."
          />
        )}

        {activeTab === 'stages' && (
          <ComingSoonView
            title="Pipeline Stages"
            subtitle="Visualize your sales funnel and track leads through different stages of conversion."
          />
        )}
      </View>

      <AddLeadModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSubmit={handleAddLeadSubmit}
        phoneNumber={initialSearch || ''}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flexOne: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    ...theme.typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth:1,
    borderBottomColor: colors.divider,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: theme.radii.lg,
    padding: 2,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.radii.md,
  },
  tabItemActive: {
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
  searchWrapper: {
    backgroundColor: colors.surface,
    paddingBottom: theme.spacing.sm,
  },
  dashboardContainer: {
    padding: theme.spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: colors.textPrimary,
  },
  metaText: {
    ...theme.typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  categoryPressable: {
    marginBottom: theme.spacing.md,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  categoryIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  categoryInfo: {
    flex: 1,
    gap: 2,
  },
  categoryTitle: {
    ...theme.typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
  },
  categorySubtitle: {
    ...theme.typography.caption,
    color: colors.textSecondary,
  },
  countBadge: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countText: {
    ...theme.typography.button,
    fontSize: 14,
    color: colors.accent,
    fontWeight: '800',
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  leadCard: {
    marginBottom: theme.spacing.md,
    padding: 0, // Let internal padding handle it for better control
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  avatarText: {
    ...theme.typography.h3,
    color: colors.textSecondary,
  },
  cardMain: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leadName: {
    ...theme.typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  campaignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  campaignText: {
    ...theme.typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerLabel: {
    ...theme.typography.caption,
    color: colors.textMuted,
  },
  footerValue: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
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
  },
});
