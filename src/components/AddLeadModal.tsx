import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList
} from 'react-native';
import { X, CheckCircle } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../services/api';

interface Campaign {
  _id: string;
  name: string;
}

interface AddLeadModalProps {
  visible: boolean;
  onClose: () => void;
  phoneNumber: string;
  onSubmit: (data: { firstName: string; lastName: string; campaign: string }) => Promise<void>;
}

export const AddLeadModal = memo(({
  visible,
  onClose,
  phoneNumber,
  onSubmit
}: AddLeadModalProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Simple local cache to avoid fetching every time the modal opens if no search
  const campaignsCache = useRef<Campaign[] | null>(null);

  const fetchCampaigns = useCallback(async (pageNumber = 1, search = searchQuery) => {
    // If it's the first page and we have cache and no search, use cache first
    if (pageNumber === 1 && !search && campaignsCache.current) {
      setCampaigns(campaignsCache.current);
      setPage(1);
      setHasMore(true);
      return;
    }

    try {
      setLoadingCampaigns(true);
      const res = await api.getCampaigns({ page: pageNumber, limit: 10, search });
      if (res?.data) {
        const newCampaigns = res.data;
        if (pageNumber === 1) {
          setCampaigns(newCampaigns);
          if (!search) campaignsCache.current = newCampaigns;
        } else {
          setCampaigns(prev => [...prev, ...newCampaigns]);
        }

        // If we got fewer than the limit, there's no more
        setHasMore(newCampaigns.length === 10);
        setPage(pageNumber);
      }
    } catch (error) {
      console.error('Error fetching campaigns', error);
    } finally {
      setLoadingCampaigns(false);
    }
  }, [searchQuery]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (visible) {
        fetchCampaigns(1, searchQuery);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, visible, fetchCampaigns]);

  const resetForm = useCallback(() => {
    setFirstName('');
    setLastName(' ');
    setSelectedCampaign('');
    setSearchQuery('');
    setPage(1);
    setHasMore(true);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!firstName || !selectedCampaign) {
      Alert.alert('Error', 'Please fill in First Name and select a Campaign.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ firstName, lastName, campaign: selectedCampaign });
      handleClose();
    } catch (error) {
      // Error handled in onSubmit usually, but if not:
      Alert.alert('Error', 'Failed to create lead.');
    } finally {
      setLoading(false);
    }
  }, [firstName, lastName, selectedCampaign, onSubmit, handleClose]);

  useEffect(() => {
    if (visible) {
      fetchCampaigns();
    }
  }, [visible, fetchCampaigns]);

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Lead</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={campaigns}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            onEndReached={() => {
              if (!loadingCampaigns && hasMore) {
                fetchCampaigns(page + 1);
              }
            }}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              <>
                <View style={styles.phoneDisplayContainer}>
                  <Text style={styles.phoneLabel}>Phone Number:</Text>
                  <Text style={styles.phoneNumber}>{phoneNumber}</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>First Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter first name"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholderTextColor="#999"
                  />

                  {/* <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter last name"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholderTextColor="#999"
                  /> */}
                </View>

                <Text style={styles.label}>Select Campaign *</Text>
                <View style={[styles.searchContainer, { borderTopLeftRadius: 12, borderTopRightRadius: 12, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E0E0E0' }]}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search campaign..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#999"
                  />
                </View>
              </>
            }
            renderItem={({ item: c }) => (
              <View style={{ borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#F9F9F9', paddingHorizontal: 8 }}>
                <TouchableOpacity
                  style={[styles.campaignItem, selectedCampaign === c._id && styles.campaignItemSelected]}
                  onPress={() => setSelectedCampaign(c._id)}
                >
                  <Text
                    style={[
                      styles.campaignItemText,
                      selectedCampaign === c._id && styles.campaignItemTextSelected,
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            ListFooterComponent={
              <>
                <View style={{ borderBottomWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E0E0E0', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: '#F9F9F9', minHeight: 10 }}>
                  {loadingCampaigns && (
                    <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
                  )}
                  {!loadingCampaigns && campaigns.length === 0 && (
                    <Text style={[styles.emptyText, { marginBottom: 10 }]}>No active campaigns found.</Text>
                  )}
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, (loading || !firstName || !selectedCampaign) && styles.saveButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading || !firstName || !selectedCampaign}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <>
                        <CheckCircle size={18} color={colors.white} />
                        <Text style={styles.saveButtonText}>Save Lead</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  phoneDisplayContainer: {
    padding: 16,
    backgroundColor: '#FFF8E1',
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  phoneLabel: {
    fontSize: 14,
    color: '#795548',
    marginRight: 8,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  selectorContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
    overflow: 'hidden',
  },
  searchContainer: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#FFF',
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  campaignListContainer: {
    height: 200, // Fixed height for scrolling
  },
  campaignFlatList: {
    padding: 4,
  },
  campaignItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
    backgroundColor: '#FFFFFF',
  },
  campaignItemSelected: {
    backgroundColor: colors.primary + '15',
  },
  campaignItemText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  campaignItemTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  loader: {
    marginVertical: 10,
    alignSelf: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
