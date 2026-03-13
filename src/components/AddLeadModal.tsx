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
  Alert
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

  // Simple local cache to avoid fetching every time the modal opens
  const campaignsCache = useRef<Campaign[] | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (campaignsCache.current) {
      setCampaigns(campaignsCache.current);
      return;
    }

    try {
      setLoadingCampaigns(true);
      const res = await api.getCampaigns();
      if (res?.data) {
        setCampaigns(res.data);
        campaignsCache.current = res.data;
      }
    } catch (error) {
      console.error('Error fetching campaigns', error);
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  const resetForm = useCallback(() => {
    setFirstName('');
    setLastName('');
    setSelectedCampaign('');
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

          <View style={styles.phoneDisplayContainer}>
            <Text style={styles.phoneLabel}>Phone Number:</Text>
            <Text style={styles.phoneNumber}>{phoneNumber}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter first name"
                value={firstName}
                onChangeText={setFirstName}
                placeholderTextColor="#999"
              />
              
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter last name"
                value={lastName}
                onChangeText={setLastName}
                placeholderTextColor="#999"
              />
            </View>

            <Text style={styles.label}>Select Campaign *</Text>
            {loadingCampaigns ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            ) : (
              <View style={styles.campaignList}>
                {campaigns.map((c) => (
                  <TouchableOpacity
                    key={c._id}
                    style={[styles.campaignChip, selectedCampaign === c._id && styles.campaignChipSelected]}
                    onPress={() => setSelectedCampaign(c._id)}
                  >
                    <Text
                      style={[
                        styles.campaignChipText,
                        selectedCampaign === c._id && styles.campaignChipTextSelected,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                {campaigns.length === 0 && !loadingCampaigns && (
                    <Text style={styles.emptyText}>No active campaigns found.</Text>
                )}
              </View>
            )}

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
          </ScrollView>
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
    color: colors.text,
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
  campaignList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 10,
  },
  campaignChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  campaignChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  campaignChipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  campaignChipTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  loader: {
    marginVertical: 20,
    alignSelf: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
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
