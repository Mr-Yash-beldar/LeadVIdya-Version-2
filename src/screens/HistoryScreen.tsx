import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  Linking,
  NativeModules,
  ScrollView,
  Dimensions,
  Animated,
  AppState,
  NativeEventEmitter,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchBar } from '../components/SearchBar';
import { FilterBar } from '../components/FilterBar';
import { CallLogItem } from '../components/CallLogItem';
import { CallLogService } from '../services/CallLogService';
import { LeadsService } from '../services/LeadsService';
import { DialerModal } from '../components/DialerModal';
import apiClient from '../services/apiClient';
import { useAutoPost } from '../hooks/useAutoPost';
import { api } from '../services/api';
import { AddLeadModal } from '../components/AddLeadModal';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import { 
  Plus, 
  Phone, 
  PhoneCall, 
  Settings, 
  Clock, 
  Search, 
  Filter, 
  Layout, 
  Users, 
  User,
  Zap,
  ChevronRight,
  Layers,
  Bell,
} from 'lucide-react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';
import { CallType, CallLog } from '../types/CallLog';
import { Lead } from '../types/Lead';

const { PhoneModule } = NativeModules;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = ['all', 'incoming', 'outgoing', 'missed'];

// -- Skeleton Component --
const SkeletonCard = () => (
  <GlassCard style={styles.skeletonCard}>
    <View style={styles.skeletonHeader}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonTextContainer}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSubtitle} />
      </View>
    </View>
    <View style={styles.skeletonActions}>
      <View style={styles.skeletonCircle} />
      <View style={styles.skeletonCircle} />
      <View style={styles.skeletonCircle} />
    </View>
  </GlassCard>
);

const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { isOffline } = useNetwork();
  const isConnected = !isOffline;
  const [activeTab, setActiveTab] = useState<'personal' | 'leads'>('leads');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rawLogs, setRawLogs] = useState<CallLog[]>([]);
  const [assignedLeads, setAssignedLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [simCount, setSimCount] = useState(1);
  const [selectedSim, setSelectedSim] = useState<number | null>(null);
  const [ongoingCall, setOngoingCall] = useState<any>(null);
  const [isDialerVisible, setIsDialerVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState('');
  const [notifCount, setNotifCount] = useState(0);

  // -- Services --
  const callLogService = CallLogService;
  
  // -- Auto Post Hook --
  const leadsRef = useRef<Lead[]>(assignedLeads);
  useEffect(() => {
    leadsRef.current = assignedLeads;
  }, [assignedLeads]);
  const { checkAndPostNewCalls } = useAutoPost(leadsRef);

  useEffect(() => {
    checkAndPostNewCalls();
    const interval = setInterval(checkAndPostNewCalls, 15000);
    return () => clearInterval(interval);
  }, [checkAndPostNewCalls]);

  const { checkNow } = useNetwork();

  const fetchNotifCount = useCallback(async () => {
    try {
      const data = await api.getNotificationCount();
      // Backend may return { count: N } or just a number
      const count =
        typeof data === 'number'
          ? data
          : (data?.count ?? data?.total ?? 0);
      setNotifCount(Number(count) || 0);
    } catch {
      // Silently ignore — badge is optional
    }
  }, []);

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
        setRefreshing(true);
        checkNow();
    }
    else setLoading(true);

    try {
      const logs = await callLogService.getCallLogs(isRefresh);
      setRawLogs(logs);
      
      const count = (await NativeModules.PhoneModule?.getSimCount?.()) || 1;
      setSimCount(count);

      let currentCall = null;
      try {
        if (PhoneModule?.getOngoingCall) {
          currentCall = await PhoneModule.getOngoingCall();
        }
      } catch (e) {}
      setOngoingCall(currentCall);
    } catch (error) {
      console.error('Fetch logs error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [callLogService, checkNow]);

  const loadLeadsForMatching = useCallback(async () => {
    // Check if we have a user/session before fetching from backend
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    try {
      const leads = await LeadsService.getAssignedLeads(1, 1000);
      setAssignedLeads(leads);
    } catch (e) {
      console.warn('History: Failed to load leads for matching', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLeadsForMatching();
      fetchLogs();
      fetchNotifCount();
    }, [fetchLogs, loadLeadsForMatching, fetchNotifCount])
  );

  // Computed Call Logs (Matched & Filtered)
  const callLogs = useMemo(() => {
    let processed = rawLogs;

    // 1. Initial Mapping & Local Matching
    processed = processed.map(log => {
      const cleanNum = log.phoneNumber?.replace(/[^\d]/g, '');
      if (!cleanNum || cleanNum.length < 10) return log;

      const matchedLead = assignedLeads.find(lead => {
        const leadNum = (lead.phone || '').replace(/[^\d]/g, '');
        const leadAltNum = (lead.alt_phone || '').replace(/[^\d]/g, '');
        
        // Exact match or suffix match (to handle country codes)
        const isMatch = (leadNum.length >= 10 && (leadNum === cleanNum || leadNum.endsWith(cleanNum) || cleanNum.endsWith(leadNum))) ||
                       (leadAltNum.length >= 10 && (leadAltNum === cleanNum || leadAltNum.endsWith(cleanNum) || cleanNum.endsWith(leadAltNum)));
        return isMatch;
      });

      if (matchedLead) {
        return {
          ...log,
          leadId: matchedLead._id || (matchedLead as any).id,
          leadName: `${matchedLead.firstName || ''} ${matchedLead.lastName || ''}`.trim() || (matchedLead as any).name,
          leadData: matchedLead,
          canAssignSelf: false
        };
      }
      return log;
    });

    // 2. Filter by SIM
    if (selectedSim !== null) {
      processed = processed.filter(l => l.simSlot === selectedSim);
    }

    // 3. Filter by Type
    if (selectedFilter !== 'all') {
      processed = processed.filter(log => {
        const t = log.type.toString().toUpperCase();
        if (selectedFilter === 'incoming') return t === 'INCOMING';
        if (selectedFilter === 'outgoing') return t === 'OUTGOING';
        if (selectedFilter === 'missed') return t === 'MISSED' || t === 'REJECTED';
        return true;
      });
    }

    // 4. Filter by Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      processed = processed.filter(l => 
        (l.name && l.name.toLowerCase().includes(q)) || 
        (l.phoneNumber && l.phoneNumber.toLowerCase().includes(q)) ||
        ((l as any).leadName && (l as any).leadName.toLowerCase().includes(q))
      );
    }

    // 5. Filter by Tab
    if (activeTab === 'leads') {
      processed = processed.filter(l => !!(l as any).leadId);
    }

    return processed;
  }, [rawLogs, assignedLeads, selectedSim, selectedFilter, searchQuery, activeTab]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        fetchLogs();
      }
    });
    return () => subscription.remove();
  }, [fetchLogs]);

  const handleAssignSelf = useCallback(async (item: any) => {
    try {
      const response = await api.assignSelf(item.leadId, item.phoneNumber);
      if (response.success) {
        Alert.alert('Success', 'Lead assigned to you');
        fetchLogs(true);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not assign lead');
    }
  }, [fetchLogs]);

  const handleDial = useCallback(() => {
    setIsDialerVisible(true);
  }, []);

  const handleAddLead = useCallback((num: string) => {
    setSelectedPhoneNumber(num);
    setIsAddModalVisible(true);
  }, []);

  const handleAddLeadSubmit = useCallback(async (data: { firstName: string; lastName: string; campaign: string }) => {
    try {
      const response = await api.createLead({
        firstName: data.firstName,
        lastName: data.lastName,
        campaign: data.campaign,
        phone: selectedPhoneNumber
      });
      if (response.success) {
        setIsAddModalVisible(false);
        fetchLogs(true);
        loadLeadsForMatching();
      }
    } catch (error) {
      console.error('Failed to create lead:', error);
      throw error;
    }
  }, [selectedPhoneNumber, fetchLogs, loadLeadsForMatching]);

  const renderCallLogItem = useCallback(({ item }: { item: any }) => (
    loading ? (
      <SkeletonCard />
    ) : (
      <CallLogItem 
        item={item as CallLog} 
        simCount={simCount}
        isLeadLog={activeTab === 'leads'}
        onAssignSelf={handleAssignSelf}
        onAddLead={handleAddLead}
      />
    )
  ), [loading, simCount, activeTab, handleAssignSelf, handleAddLead]);

  const callLogKeyExtractor = useCallback((item: any, index: number) => 
    loading ? `skeleton-${index}` : (item as CallLog).id || index.toString()
  , [loading]);

  const renderOngoingCall = () => {
    if (!ongoingCall) return null;
    return (
      <GlassCard style={styles.ongoingCard}>
        <View style={styles.ongoingHeader}>
          <Zap size={18} color={colors.primary} />
          <Text style={styles.ongoingTitle}>Ongoing Call</Text>
        </View>
        <Text style={styles.ongoingName} numberOfLines={1}>
          {ongoingCall.name || ongoingCall.phoneNumber}
        </Text>
        <Text style={styles.ongoingStatus}>In Progress...</Text>
      </GlassCard>
    );
  };

  const skeletonData = [1, 2, 3, 4, 5];

  return (
    <ScreenWrapper navigation={navigation} title="History" transparentHeader={false}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View style={styles.topContainer}>
        {/* Header Content (Internal) */}
        <View style={styles.subHeader}>
          <View>
            <Text style={styles.metaText}>{callLogs.length} recent calls</Text>
          </View>
          <View style={styles.headerActions}>
             {simCount > 1 && (
               <View style={styles.simContainer}>
                 {[...Array(simCount)].map((_, i) => (
                   <TouchableOpacity
                     key={i}
                     style={[
                       styles.simButton,
                       selectedSim === i && styles.simButtonActive
                     ]}
                     onPress={() => setSelectedSim(selectedSim === i ? null : i)}
                   >
                     <Layers size={14} color={selectedSim === i ? colors.white : colors.textSecondary} />
                     <Text style={[styles.simLabel, selectedSim === i && styles.simLabelActive]}>L{i + 1}</Text>
                   </TouchableOpacity>
                 ))}
               </View>
             )}

            {/* Bell with notification badge */}
            <TouchableOpacity
              onPress={() => navigation.navigate('FollowUp')}
              style={styles.bellBtn}
            >
              <Bell size={20} color={colors.textSecondary} />
              {notifCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {notifCount > 99 ? '99+' : notifCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('More')} style={styles.settingsBtn}>
              <Settings size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Source Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'leads' && styles.toggleButtonActive]}
            onPress={() => setActiveTab('leads')}
          >
            <Users size={16} color={activeTab === 'leads' ? colors.primaryDark : colors.textMuted} />
            <Text style={[styles.toggleText, activeTab === 'leads' && styles.toggleTextActive]}>Leads</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, activeTab === 'personal' && styles.toggleButtonActive]}
            onPress={() => setActiveTab('personal')}
          >
            <User size={16} color={activeTab === 'personal' ? colors.primaryDark : colors.textMuted} />
            <Text style={[styles.toggleText, activeTab === 'personal' && styles.toggleTextActive]}>Personal</Text>
          </TouchableOpacity>
        </View>

        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        <FilterBar selectedFilter={selectedFilter} onSelectFilter={setSelectedFilter} />
      </View>

      <FlatList
        data={(loading ? skeletonData : callLogs) as any[]}
        keyExtractor={callLogKeyExtractor}
        renderItem={renderCallLogItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchLogs(true)} colors={[colors.primary]} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderOngoingCall}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyContainer}>
            <Clock size={48} color={colors.divider} />
            <Text style={styles.emptyTitle}>No History Found</Text>
            <Text style={styles.emptySubtitle}>Calls from your device will appear here</Text>
          </View>
        ) : null}
      />

      <TouchableOpacity style={styles.fab} onPress={handleDial}>
        <Phone size={24} color={colors.white} />
        <View style={styles.fabOverlay} />
      </TouchableOpacity>

      <DialerModal 
        isVisible={isDialerVisible} 
        onClose={() => setIsDialerVisible(false)}
        onAddLead={handleAddLead}
      />

      <AddLeadModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSubmit={handleAddLeadSubmit}
        phoneNumber={selectedPhoneNumber}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  topContainer: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: theme.radii.xl,
    borderBottomRightRadius: theme.radii.xl,
    marginBottom: theme.spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4
      },
      android: { elevation: 4 }
    }),
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  metaText: {
    ...theme.typography.caption,
    color: colors.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  simContainer: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.background,
    padding: 2,
    borderRadius: theme.radii.md,
  },
  simButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
    gap: 4,
  },
  simButtonActive: {
    backgroundColor: colors.primary,
  },
  simLabel: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  simLabelActive: {
    color: colors.white,
  },
  settingsBtn: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  bellBtn: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.white,
    lineHeight: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    marginHorizontal: theme.spacing.md,
    padding: 4,
    borderRadius: theme.radii.xl,
    marginBottom: theme.spacing.md,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.radii.lg,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: colors.surface,
    ...theme.shadows.sm,
  },
  toggleText: {
    ...theme.typography.button,
    fontSize: 14,
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 100,
  },
  ongoingCard: {
    margin: theme.spacing.md,
    backgroundColor: 'rgba(255,193,7,0.08)',
    borderColor: colors.primary,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  ongoingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ongoingTitle: {
    ...theme.typography.caption,
    color: colors.primaryDark,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ongoingName: {
    ...theme.typography.h3,
    fontSize: 18,
    color: colors.textPrimary,
  },
  ongoingStatus: {
    ...theme.typography.body,
    fontSize: 12,
    color: colors.success,
    fontWeight: '700',
    marginTop: 2,
  },
  skeletonCard: {
    marginBottom: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    height: 100,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.divider,
  },
  skeletonTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  skeletonTitle: {
    height: 14,
    width: '50%',
    backgroundColor: colors.divider,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    height: 10,
    width: '30%',
    backgroundColor: colors.divider,
    borderRadius: 4,
  },
  skeletonActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    gap: 12,
    marginTop: -10,
  },
  skeletonCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.divider,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
    overflow: 'hidden',
  },
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});

export default HistoryScreen;