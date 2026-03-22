import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  TextInput,
  PermissionsAndroid,
  NativeModules,
  NativeEventEmitter,
  Linking,
  Animated,
  StatusBar,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  RefreshCw,
  Phone,
  ChevronUp,
  ChevronDown,
  Info,
  History,
  Edit3,
  User,
  Mail,
  MapPin,
  Calendar,
  Zap,
  Activity,
  BarChart3,
  Clock,
  Star as StarIcon,
  Megaphone,
  Trash2
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import { Lead } from '../types/Lead';
import { CallLogService } from '../services/CallLogService';
import { LeadsService } from '../services/LeadsService';
import { api } from '../services/api';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { TimelineList } from '../components/TimelineList';
import { DisposeForm } from '../components/DisposeForm';
import { GlassCard } from '../components/GlassCard';

const { PhoneModule } = NativeModules;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Tab = 'LEAD_INFO' | 'DISPOSE_LEAD';
type SubTab = 'About' | 'Timeline';

export const LeadDetailsScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const params = route.params as {
    lead?: Lead;
    leadId?: string;
    callInfo?: any;
    fromCall?: boolean;
    allowOtherDispose?: boolean;
  };

  const [lead, setLead] = useState<Lead>(params.lead ?? {} as Lead);
  const [leadLoading, setLeadLoading] = useState(true);
  const shimmerValue = useRef(new Animated.Value(0)).current;

  const [activeTab, setActiveTab] = useState<Tab>(params.fromCall ? 'DISPOSE_LEAD' : 'LEAD_INFO');
  const [subTab, setSubTab] = useState<SubTab>('About');
  const [basicDetailsOpen, setBasicDetailsOpen] = useState(true);
  const [progressOpen, setProgressOpen] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [disposeStatus, setDisposeStatus] = useState('');
  const [description, setDescription] = useState('');
  const [expectedValue, setExpectedValue] = useState('');
  const [followUpDate, setFollowUpDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRecordingPath, setLastRecordingPath] = useState<string | null>(null);
  const [timelineLogs, setTimelineLogs] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [expandedLogIndex, setExpandedLogIndex] = useState<number | null>(null);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', phone: '', alt_phone: '', email: '' });
  const [isUpdatingLead, setIsUpdatingLead] = useState(false);

  const openEditModal = () => {
    setEditFormData({
      name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.name || '',
      phone: lead.phone || '',
      alt_phone: lead.alt_phone || '',
      email: lead.email || '',
    });
    setIsEditModalVisible(true);
  };

  const handleDeleteLead = async () => {
    Alert.alert(
      'Delete Lead',
      'Are you sure this lead is wrong number or not interest or invalid number?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
             try {
                const id = lead._id || lead.id || params.leadId;
                if (!id) throw new Error("Missing Lead ID");
                await LeadsService.deleteLead(id);
                Alert.alert('Success', 'Lead deleted successfully');
                navigation.goBack();
             } catch (e) {
                Alert.alert('Error', 'Failed to delete lead');
             }
          }
        }
      ]
    );
  };
 
   const handleUpdateLead = async () => {
    setIsUpdatingLead(true);
    try {
      const id = lead._id || lead.id || params.leadId;
      if (!id) throw new Error("Missing Lead ID");
      await LeadsService.updateLeadDetails(id, editFormData);
      Alert.alert('Success', 'Lead details updated successfully');
      setIsEditModalVisible(false);
      fetchLead(false);
    } catch(e) {
      Alert.alert('Error', 'Failed to update lead details');
    } finally {
      setIsUpdatingLead(false);
    }
  };

  const fetchLead = useCallback(async (showSkeleton = true) => {
    const id = (lead?._id || lead?.id || params.leadId || '');
    if (!id) return;
    if (showSkeleton) setLeadLoading(true);
    try {
      const fresh = await api.getLeadById(id);
      if (fresh) setLead(fresh);
    } catch (e: any) {
      // 403 = this lead is assigned to another agent
      if (e?.response?.status === 403) {
        const data = e.response.data;
        // Backend may return the agent in different shapes
        const agentName =
          data?.assignedTo?.name ||
          data?.assignedTo?.username ||
          data?.assigned_to?.name ||
          data?.assigned_to?.username ||
          data?.agentName ||
          data?.message?.match(/assigned to (.+)/i)?.[1] ||
          'another agent';
        setLeadLoading(false);
        if (params.allowOtherDispose) {
          // Stay on screen to allow disposition
          return;
        }
        navigation.goBack();
        setTimeout(() => {
          Alert.alert(
            '🔒 Lead Not Accessible',
            `This lead is already assigned to ${agentName}. You can only view leads assigned to you.`,
            [{ text: 'OK' }]
          );
        }, 300);
        return;
      }
      console.error('[LeadDetails] Failed to fetch lead:', e);
    } finally {
      setLeadLoading(false);
    }
  }, [lead?._id, lead?.id, params.leadId, navigation]);

  useEffect(() => {
    fetchLead();
  }, []);

  useEffect(() => {
    if (!leadLoading) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerValue, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [leadLoading]);

  const fetchTimeline = useCallback(async () => {
    const id = (lead?._id || lead?.id || params.leadId || '');
    if (!id) return;
    setTimelineLoading(true);
    try {
      const events = await CallLogService.getLeadTimeline(id);
      setTimelineLogs(events);
    } catch (e) {
      console.error('Timeline fetch error', e);
    } finally {
      setTimelineLoading(false);
    }
  }, [lead?._id, lead?.id, params.leadId]);

  useEffect(() => {
    if (activeTab === 'LEAD_INFO' && subTab === 'Timeline') {
      fetchTimeline();
    }
  }, [subTab, activeTab]);

  const handleCallNow = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        ]);
        if (grants['android.permission.CALL_PHONE'] === PermissionsAndroid.RESULTS.GRANTED) {
          PhoneModule.makeCall(lead?.phone || (lead as any)?.number);
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      Linking.openURL(`tel:${lead?.phone || (lead as any)?.number}`);
    }
  };

  const handleProceed = async () => {
    if (connected === null) return Alert.alert("Error", "Select if call was connected");
    if (!disposeStatus) return Alert.alert("Error", "Select a status");

    setIsProcessing(true);
    try {
      // Basic log object building
      const matchedCall = {
        duration: params.callInfo?.duration ?? 0,
        timestamp: params.callInfo?.timestamp ?? Date.now(),
        recordingPath: params.callInfo?.recordingUrl ?? lastRecordingPath,
        phoneNumber: params.callInfo?.phoneNumber || lead.phone,
        callType: params.callInfo?.callType,
      };

      navigation.navigate('CallSummary', {
        leadId: lead._id || lead.id,
        leadName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.name,
        formData: { connected, status: disposeStatus, description, expectedValue, followUpDate: followUpDate.toISOString() },
        callLog: matchedCall,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <Animated.View style={[styles.skeletonHeader, { opacity: shimmerValue.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }) }]} />
      {[1, 2, 3].map(i => (
        <Animated.View key={i} style={[styles.skeletonCard, { opacity: shimmerValue.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }) }]} />
      ))}
    </View>
  );

  return (
    <ScreenWrapper navigation={navigation} title="Lead Details">
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View style={styles.container}>

        {/* Modern Segmented Tab Bar */}
        <View style={styles.tabBarContainer}>
          <View style={styles.segmentedControl}>
            {(['LEAD_INFO', 'DISPOSE_LEAD'] as Tab[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.segmentBtn, activeTab === t && styles.segmentBtnActive]}
                onPress={() => setActiveTab(t)}
              >
                <Text style={[styles.segmentText, activeTab === t && styles.segmentTextActive]}>
                  {t === 'LEAD_INFO' ? 'Overview' : 'Disposition'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {leadLoading ? renderSkeleton() : (
          <View style={styles.mainContent}>
            {activeTab === 'LEAD_INFO' ? (
              <View style={styles.flexOne}>
                {/* Sub Tabs for Info */}
                <View style={styles.subTabContainer}>
                  <TouchableOpacity
                    style={[styles.subTab, subTab === 'About' && styles.subTabActive]}
                    onPress={() => setSubTab('About')}
                  >
                    <Info size={16} color={subTab === 'About' ? colors.primaryDark : colors.textMuted} />
                    <Text style={[styles.subTabText, subTab === 'About' && styles.subTabTextActive]}>About</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.subTab, subTab === 'Timeline' && styles.subTabActive]}
                    onPress={() => setSubTab('Timeline')}
                  >
                    <History size={16} color={subTab === 'Timeline' ? colors.primaryDark : colors.textMuted} />
                    <Text style={[styles.subTabText, subTab === 'Timeline' && styles.subTabTextActive]}>Timeline</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.flexOne} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                  {subTab === 'About' ? (
                    <>
                      <GlassCard style={styles.infoCard}>
                        <View style={styles.sectionHeader}>
                          <View style={styles.sectionTitleRow}>
                            <User size={18} color={colors.primary} />
                            <Text style={styles.sectionTitle}>Basic Information</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={handleDeleteLead}>
                              <Trash2 size={18} color={colors.error} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={openEditModal}>
                              <Edit3 size={18} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setBasicDetailsOpen(!basicDetailsOpen)}>
                              {basicDetailsOpen ? <ChevronUp size={20} color={colors.textMuted} /> : <ChevronDown size={20} color={colors.textMuted} />}
                            </TouchableOpacity>
                          </View>
                        </View>

                        {basicDetailsOpen && (
                          <View style={styles.sectionBody}>
                            <DetailItem label="Full Name" value={`${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.name || '-'} icon={User} />
                            <DetailItem label="Phone" value={lead.phone || '-'} icon={Phone} isInteractive />
                            <DetailItem label="Email" value={lead.email || '-'} icon={Mail} />
                            <DetailItem label="Alt Phone" value={lead.alt_phone || '-'} icon={Phone} />
                            <DetailItem label="Added On" value={lead.created ? new Date(lead.created).toLocaleDateString() : '-'} icon={Calendar} />
                          </View>
                        )}
                      </GlassCard>

                      <GlassCard style={styles.infoCard}>
                        <View style={styles.sectionHeader}>
                          <View style={styles.sectionTitleRow}>
                            <Zap size={18} color={colors.warning} />
                            <Text style={styles.sectionTitle}>Progress & Status</Text>
                          </View>
                          <TouchableOpacity onPress={() => setProgressOpen(!progressOpen)}>
                            {progressOpen ? <ChevronUp size={20} color={colors.textMuted} /> : <ChevronDown size={20} color={colors.textMuted} />}
                          </TouchableOpacity>
                        </View>
                        {progressOpen && (
                          <View style={styles.sectionBody}>
                            <View style={styles.badgeRow}>
                              <Text style={styles.detailLabel}>Lead Status</Text>
                              <View style={styles.statusBadge}>
                                <Text style={styles.statusText}>{lead.leadStatus || 'OPEN'}</Text>
                              </View>
                            </View>
                            <DetailItem
                              label="Assigned to"
                              value={
                                typeof lead.assigned_to === 'object' && lead.assigned_to !== null
                                  ? (lead.assigned_to as any).name || (lead.assigned_to as any).username || 'Unknown'
                                  : (lead.assigned_to as any) || '-'
                              }
                              icon={User}
                            />
                            <DetailItem label="Campaign" value={lead.campaign?.name || '-'} icon={Megaphone} />
                            <DetailItem label="Lead Source" value={lead.leadSource || 'Manual'} icon={Globe} />
                            <DetailItem label="Lead Segment" value={lead.tag || '-'} icon={TagIcon} />
                            <DetailItem label="Expected Value" value={lead.expectedValue ? `₹${lead.expectedValue}` : '-'} icon={TrendingUp} />
                            <DetailItem label="Follow-up" value={lead.next_followup_date ? new Date(lead.next_followup_date).toLocaleString() : 'Not Set'} icon={Clock} />
                          </View>
                        )}
                      </GlassCard>
                    </>
                  ) : (
                    <TimelineList
                      lead={lead}
                      timelineLogs={timelineLogs}
                      timelineLoading={timelineLoading}
                      expandedLogIndex={expandedLogIndex}
                      setExpandedLogIndex={setExpandedLogIndex}
                    />
                  )}
                </ScrollView>
              </View>
            ) : (
              <ScrollView style={styles.flexOne} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <DisposeForm
                  connected={connected}
                  setConnected={setConnected}
                  disposeStatus={disposeStatus}
                  setDisposeStatus={setDisposeStatus}
                  description={description}
                  setDescription={setDescription}
                  expectedValue={expectedValue}
                  setExpectedValue={setExpectedValue}
                  followUpDate={followUpDate}
                  setFollowUpDate={setFollowUpDate}
                  showDatePicker={showDatePicker}
                  setShowDatePicker={setShowDatePicker}
                  showTimePicker={showTimePicker}
                  setShowTimePicker={setShowTimePicker}
                  isProcessing={isProcessing}
                  onProceed={handleProceed}
                  onSendMessage={() => Linking.openURL(`sms:${lead.phone}`)}
                  onSendWhatsApp={() => Linking.openURL(`whatsapp://send?phone=+91${lead.phone}`)}
                  onDateChange={(e, d) => { setShowDatePicker(Platform.OS === 'ios'); if (d) setFollowUpDate(d); }}
                  onTimeChange={(e, d) => { setShowTimePicker(Platform.OS === 'ios'); if (d) setFollowUpDate(d); }}
                />
              </ScrollView>
            )}
          </View>
        )}

        {/* Global Footer Call FAB */}
        {!leadLoading && activeTab === 'LEAD_INFO' && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.callFab} onPress={handleCallNow} activeOpacity={0.8}>
              <Phone size={20} color={colors.white} />
              <Text style={styles.callFabText}>Initiate Call</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal visible={isEditModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Basic Information</Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editFormData.name}
                onChangeText={(text) => setEditFormData({ ...editFormData, name: text })}
                placeholder="Enter Name"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Phone</Text>
              <TextInput
                style={styles.modalInput}
                value={editFormData.phone}
                onChangeText={(text) => setEditFormData({ ...editFormData, phone: text })}
                placeholder="Enter Phone Number"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Alt Phone</Text>
              <TextInput
                style={styles.modalInput}
                value={editFormData.alt_phone}
                onChangeText={(text) => setEditFormData({ ...editFormData, alt_phone: text })}
                placeholder="Enter Alternate Phone Number"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Email</Text>
              <TextInput
                style={styles.modalInput}
                value={editFormData.email}
                onChangeText={(text) => setEditFormData({ ...editFormData, email: text })}
                placeholder="Enter Email Address"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalCancelBtn]}
                onPress={() => setIsEditModalVisible(false)}
                disabled={isUpdatingLead}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalSubmitBtn]}
                onPress={handleUpdateLead}
                disabled={isUpdatingLead}
              >
                {isUpdatingLead ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScreenWrapper>
  );
};

// -- Helper: Detail Item --
const DetailItem = ({ label, value, icon: Icon, isInteractive, color = colors.textMuted }: any) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIcon}>
      <Icon size={16} color={color} />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, isInteractive && { color: colors.primary, fontWeight: '700' }]}>{value}</Text>
    </View>
  </View>
);

const Globe = (props: any) => <Activity {...props} />;
const TagIcon = (props: any) => <MapPin {...props} />;
const TrendingUp = (props: any) => <BarChart3 {...props} />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flexOne: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: theme.radii.lg,
    padding: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.radii.md,
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    ...theme.shadows.sm,
  },
  segmentText: {
    ...theme.typography.button,
    fontSize: 13,
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  subTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    gap: 12,
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: 8,
  },
  subTabActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,193,7,0.08)',
  },
  subTabText: {
    ...theme.typography.button,
    fontSize: 12,
    color: colors.textMuted,
  },
  subTabTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  infoCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    ...theme.typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sectionBody: {
    marginTop: theme.spacing.sm,
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...theme.typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  detailValue: {
    ...theme.typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    ...theme.typography.caption,
    fontWeight: '800',
    color: colors.success,
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  callFab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 10,
    ...theme.shadows.lg,
  },
  callFabText: {
    ...theme.typography.button,
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  skeletonContainer: {
    padding: theme.spacing.md,
    gap: 16,
  },
  skeletonHeader: {
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.divider,
  },
  skeletonCard: {
    height: 180,
    borderRadius: 16,
    backgroundColor: colors.divider,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    width: '100%',
    ...theme.shadows.lg,
  },
  modalTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.lg,
    color: colors.textPrimary,
  },
  modalInputGroup: {
    marginBottom: theme.spacing.md,
  },
  modalInputLabel: {
    ...theme.typography.caption,
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: '600',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    ...theme.typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: theme.spacing.md,
  },
  modalActionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
    minWidth: 100,
  },
  modalCancelBtnText: {
    ...theme.typography.button,
    color: colors.textPrimary,
  },
  modalSubmitBtnText: {
    ...theme.typography.button,
    color: colors.white,
  },
});
