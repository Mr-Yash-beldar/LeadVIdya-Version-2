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
  Modal,
  ScrollView,
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
type CategoryType = 'new' | 'inprogress' | 'notConnected';

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

const LEAD_STATUSES = [
  { label: "All Statuses", value: "all" },
  { label: "In Progress", value: "in_progress" },
  { label: "Demo Booked", value: "demo booked" },
  { label: "Course", value: "course" },
  { label: "Transferred", value: "transferred" },
  { label: "Converted", value: "converted" },
  { label: "Follow Up", value: "follow up" },
  { label: "Approved", value: "approved" },
  { label: "Lost", value: "lost" },
  { label: "Closed", value: "closed" },
  { label: "Qualified", value: "qualified" },
  { label: "Demo Completed", value: "demo completed" },
  { label: "Demo Rescheduled", value: "demo rescheduled" },
  { label: "NIFC", value: "not interested for full course" },
  { label: "May Buy Later", value: "may be buy later" },
  { label: "Positive", value: "positive" },
  { label: "Enrolled", value: "enrolled" }
];

// -- Modern Lead Card Component --
const LeadCard = React.memo(({ item, onPress }: { item: Lead; onPress: (lead: Lead) => void }) => {
  const date = item.created?.split('T')[0];
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
            <Text style={styles.footerLabel}>Created Date:</Text>
            <Text style={styles.footerValue}>{date || 'Not set'}</Text>
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

  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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

  const fetchLeads = useCallback(async (pageNum = 1, force = false) => {
    try {
      if (pageNum === 1 && !force) setLoading(true);
      if (pageNum > 1) setLoadingMore(true);
      
      let data: Lead[] = [];
      const limit = 15;

      if (selectedCategory === 'inprogress' && selectedStatus !== 'all') {
        data = await LeadsService.getLeadsByStatus(selectedStatus, pageNum, limit);
      } else if (selectedCategory === 'new') {
        data = await LeadsService.getNewLeads(pageNum, limit);
      } else if (selectedCategory === 'inprogress') {
        data = await LeadsService.getInProgressLeads(pageNum, limit);
      } else {
        data = await LeadsService.getAssignedLeads(pageNum, limit, force); // getAssignedLeads handles force locally
      }

      setLeads(prev => {
        if (pageNum === 1) return data;
        const existingIds = new Set(prev.map(l => l._id || l.id));
        const newUniqueData = data.filter(l => !existingIds.has(l._id || l.id));
        return [...prev, ...newUniqueData];
      });
      setHasMore(data.length === limit);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      if (pageNum === 1) setLeads([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchLeads(1);
  }, [fetchLeads]);

  const { checkNow } = useNetwork();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    checkNow();
    fetchLeads(1, true);
  }, [fetchLeads, checkNow]);

  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      fetchLeads(page + 1);
    }
  }, [loading, loadingMore, hasMore, page, fetchLeads]);

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
        fetchLeads(1, true);
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

    if (selectedCategory === 'notConnected') {
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
      {/*<View style={styles.summaryHeader}>
        <Text style={styles.sectionTitle}>Overview</Text>
         <Text style={styles.metaText}>{leads.length} Total Leads</Text> 
      </View>*/}

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
          {/* <View style={styles.countBadge}>
            <Text style={styles.countText}>{leads.filter(l => !l.last_contacted_date).length}</Text>
          </View> */}
        </GlassCard>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => { setSelectedCategory('inprogress'); setView('list'); }}
        activeOpacity={0.8}
        style={styles.categoryPressable}
      >
        <GlassCard style={styles.categoryCard}>
          <View style={[styles.categoryIconContainer, { backgroundColor: 'rgba(245,158,11,0.08)' }]}>
            <Clock size={24} color={colors.warning} />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryTitle}>In Progress Leads</Text>
            <Text style={styles.categorySubtitle}>Scheduled tasks, callbacks & more</Text>
          </View>
          {/* <View style={[styles.countBadge, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
            <Text style={[styles.countText, { color: colors.warning }]}>
              {leads.filter(l => l.next_followup_date || l.followUpDate).length}
            </Text>
          </View> */}
        </GlassCard>
      </TouchableOpacity>

      {/* <TouchableOpacity
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
      </TouchableOpacity> */}
    </View>
  );

  return (
    <ScreenWrapper
      navigation={navigation}
      title={campaignName ? `${campaignName} Leads` : (activeTab === 'myLeads' ? (view === 'dashboard' ? 'My Leads' : (selectedCategory === 'new' ? 'New Leads' : selectedCategory === 'inprogress' ? 'In Progress Leads' : 'Unresolved')) : (activeTab === 'myTasks' ? 'My Tasks' : 'Stages'))}
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

      {/* <View style={styles.tabContainer}>
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
      </View> */}

      <View style={styles.content}>
        {activeTab === 'myLeads' && (
          <View style={styles.flexOne}>
            {view === 'list' && (
              <View>
                <View style={styles.searchWrapper}>
                  <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
                </View>

                {/* Status Filter for In Progress Leads */}
                {selectedCategory === 'inprogress' && (
                  <View style={styles.filterSection}>
                    <TouchableOpacity
                      style={styles.dropdownTrigger}
                      onPress={() => setShowStatusModal(true)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dropdownLabelContainer}>
                        <Filter size={16} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.dropdownLabel}>Filter by Status:</Text>
                        <Text style={styles.dropdownValue}>
                          {LEAD_STATUSES.find(s => s.value === selectedStatus)?.label}
                        </Text>
                      </View>
                      <ChevronRight size={20} color={colors.textMuted} style={{ transform: [{ rotate: '90deg' }] }} />
                    </TouchableOpacity>
                  </View>
                )}
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
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                      loadingMore ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                          <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                      ) : (!hasMore && leads.length > 0) ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                          <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>You've reached the end!</Text>
                        </View>
                      ) : null
                    }
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

        {/* {activeTab === 'myTasks' && (
          <ComingSoonView
            title="My Tasks"
            subtitle="Centralized management for your daily lead activities and follow-up tasks."
          />
        )} */}

        {/* {activeTab === 'stages' && (
          <ComingSoonView
            title="Pipeline Stages"
            subtitle="Visualize your sales funnel and track leads through different stages of conversion."
          />
        )} */}
      </View>

      <AddLeadModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSubmit={handleAddLeadSubmit}
        phoneNumber={initialSearch || ''}
      />

      {/* Status Selection Modal */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Lead Status</Text>
            </View>
            <ScrollView style={styles.statusList} showsVerticalScrollIndicator={false}>
              {LEAD_STATUSES.map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    styles.statusOption,
                    selectedStatus === status.value && styles.activeStatusOption
                  ]}
                  onPress={() => {
                    setSelectedStatus(status.value);
                    setShowStatusModal(false);
                  }}
                >
                  <Text style={[
                    styles.statusOptionText,
                    selectedStatus === status.value && styles.activeStatusOptionText
                  ]}>
                    {status.label}
                  </Text>
                  {selectedStatus === status.value && (
                    <View style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

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
    borderBottomWidth: 1,
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
  filterSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  dropdownLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownLabel: {
    ...theme.typography.caption,
    color: colors.textMuted,
    marginRight: 6,
    fontWeight: '600',
  },
  dropdownValue: {
    ...theme.typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 30,
  },
  modalHeader: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    alignItems: 'center',
  },
  modalTitle: {
    ...theme.typography.h3,
    color: colors.textPrimary,
  },
  statusList: {
    padding: theme.spacing.md,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 12,
    marginBottom: 4,
  },
  activeStatusOption: {
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  statusOptionText: {
    ...theme.typography.body,
    color: colors.textSecondary,
  },
  activeStatusOptionText: {
    color: colors.primary,
    fontWeight: '700',
  },
  checkIcon: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
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
