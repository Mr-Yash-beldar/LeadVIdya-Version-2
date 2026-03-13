import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Platform,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
    ArrowLeft,
    Check,
    Circle,
    Phone,
    PhoneOff,
    Calendar,
    FileText,
    Hash,
    ChevronRight,
    MessageSquare
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Lead } from '../types/Lead';
import { LeadsService } from '../services/LeadsService';
import { CallLogService } from '../services/CallLogService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ScreenWrapper } from '../components/ScreenWrapper';
export const LeadDisposeScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { lead, callData } = route.params as { lead: Lead, callData?: { path: string, duration: string } };

    const [connected, setConnected] = useState<boolean | null>(null);

    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('');
    const [expectedValue, setExpectedValue] = useState('');
    const [followUpDate, setFollowUpDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [purchaseDate, setPurchaseDate] = useState(''); // Keeping for now if needed, or remove? User said "plan date" before.

    const [submitting, setSubmitting] = useState(false);

    const fetchTodayCallLog = async () => {
        try {
            const logs = await CallLogService.getCallLogsByDay(0);
            // Normalize numbers for comparison (remove spaces, etc.)
            const normalize = (num: string) => num.replace(/[^0-9]/g, '');
            const leadNum = normalize(lead.phone || lead.number || '');

            // Find all calls to/from this number today
            const calls = logs.filter(log => normalize(log.phoneNumber).includes(leadNum) || leadNum.includes(normalize(log.phoneNumber)));
            return calls;
        } catch (e) {
            console.error("Error fetching logs", e);
            return [];
        }
    };

    const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleSubmit = async () => {
        if (connected === null) {
            Alert.alert("Error", "Please select if the call was connected.");
            return;
        }

        setSubmitting(true);
        try {
            const matchedCalls = await fetchTodayCallLog();

            if (matchedCalls && matchedCalls.length > 0) {
                for (const call of matchedCalls) {
                    let callStatus = 'not_connected';
                    const isConnectedType = (call.type === 'OUTGOING' || call.type === 'INCOMING');
                    if (isConnectedType) callStatus = 'connected';

                    const payload = {
                        leadId: lead._id || lead.id,
                        callTime: new Date(Number(call.timestamp)).toISOString(),
                        durationSeconds: call.duration,
                        callStatus: callStatus,
                        callType: call.type ? call.type.toLowerCase() : 'unknown',
                        recordingLink: null,
                        notes: `Dispose Status: ${status}, Notes: ${description}`
                    };

                    await LeadsService.logCall(payload);
                }
            }

            const apiStatus = status || (connected ? 'Connected' : 'Not Connected');

            const apiNotesObj = {
                description: description,
                expectedValue: expectedValue,
                followUpDate: formatLocalDate(followUpDate),
                disposeStatus: status,
                timestamp: new Date().toISOString()
            };

            const apiNotes = JSON.stringify(apiNotesObj);

            await LeadsService.updateLeadStatus(lead._id || lead.id!, apiStatus, apiNotes);

            Alert.alert("Success", "Lead updated successfully", [
                { text: "OK", onPress: () => navigation.navigate('Leads') }
            ]);
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || followUpDate;
        setShowDatePicker(Platform.OS === 'ios');
        setFollowUpDate(currentDate);
    };

    const StatusChip = ({ label }: { label: string }) => {
        const isActive = status === label;
        return (
            <TouchableOpacity
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setStatus(label)}
                activeOpacity={0.7}
            >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
                {isActive && <Check size={14} color={colors.black} style={{ marginLeft: 4 }} />}
            </TouchableOpacity>
        );
    };

    const renderConnectedForm = () => (
        <View style={styles.formSection}>
            <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                    <MessageSquare size={16} color={colors.primary} />
                    <Text style={styles.inputLabel}>Notes / Description</Text>
                </View>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter call details, customer interest, etc."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    placeholderTextColor="#999"
                />
            </View>

            <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                    <Circle size={16} color={colors.primary} />
                    <Text style={styles.inputLabel}>Disposition Status</Text>
                </View>
                <View style={styles.chipGrid}>
                    {['Interested', 'Callback', 'Not Interested', 'Wrong Number', 'Language Barrier'].map(s => (
                        <StatusChip key={s} label={s} />
                    ))}
                </View>
            </View>

            <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                    <Hash size={16} color={colors.primary} />
                    <Text style={styles.inputLabel}>Expected Deal Value</Text>
                </View>
                <TextInput
                    style={styles.input}
                    placeholder="Enter estimated value"
                    value={expectedValue}
                    onChangeText={setExpectedValue}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                />
            </View>

            <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                    <Calendar size={16} color={colors.primary} />
                    <Text style={styles.inputLabel}>Next Follow Up Date</Text>
                </View>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
                    <Text style={styles.dateText}>{followUpDate.toLocaleDateString(undefined, {
                        day: 'numeric', month: 'long', year: 'numeric'
                    })}</Text>
                    <ChevronRight size={18} color="#999" />
                </TouchableOpacity>
                {showDatePicker && (
                    <DateTimePicker
                        value={followUpDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        minimumDate={new Date()}
                    />
                )}
            </View>
        </View>
    );

    const renderNotConnectedForm = () => (
        <View style={styles.formSection}>
            <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                    <Circle size={16} color={colors.primary} />
                    <Text style={styles.inputLabel}>Reason / Status</Text>
                </View>
                <View style={styles.chipGrid}>
                    {['No Answer', 'Busy', 'Switch Off', 'Not Reachable', 'Disconnected'].map(s => (
                        <StatusChip key={s} label={s} />
                    ))}
                </View>
            </View>

            <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                    <Calendar size={16} color={colors.primary} />
                    <Text style={styles.inputLabel}>Retry On</Text>
                </View>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
                    <Text style={styles.dateText}>{followUpDate.toLocaleDateString(undefined, {
                        day: 'numeric', month: 'long', year: 'numeric'
                    })}</Text>
                    <ChevronRight size={18} color="#999" />
                </TouchableOpacity>
                {showDatePicker && (
                    <DateTimePicker
                        value={followUpDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        minimumDate={new Date()}
                    />
                )}
            </View>
        </View>
    );

    return (
        <ScreenWrapper navigation={navigation} title="Dispose Summary">
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.headerInfo}>
                        <Text style={styles.leadName}>{lead.firstName} {lead.lastName}</Text>
                        <Text style={styles.leadPhone}>{lead.phone}</Text>
                    </View>

                    <View style={styles.connectionCard}>
                        <Text style={styles.cardTitle}>Was the call connected?</Text>
                        <View style={styles.choiceGrid}>
                            <TouchableOpacity
                                style={[
                                    styles.choiceItem,
                                    connected === true && styles.choiceItemActive,
                                    connected === true && { borderColor: '#4CAF50' }
                                ]}
                                onPress={() => { setConnected(true); setStatus(''); }}
                            >
                                <View style={[styles.choiceIcon, connected === true && { backgroundColor: '#E8F5E9' }]}>
                                    <Phone color={connected === true ? '#4CAF50' : '#666'} size={24} />
                                </View>
                                <Text style={[styles.choiceLabel, connected === true && { color: '#4CAF50', fontWeight: 'bold' }]}>Yes, Connected</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.choiceItem,
                                    connected === false && styles.choiceItemActive,
                                    connected === false && { borderColor: colors.error }
                                ]}
                                onPress={() => { setConnected(false); setStatus(''); }}
                            >
                                <View style={[styles.choiceIcon, connected === false && { backgroundColor: '#FFEBEE' }]}>
                                    <PhoneOff color={connected === false ? colors.error : '#666'} size={24} />
                                </View>
                                <Text style={[styles.choiceLabel, connected === false && { color: colors.error, fontWeight: 'bold' }]}>Not Connected</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.formCard}>
                        {connected === true && renderConnectedForm()}
                        {connected === false && renderNotConnectedForm()}
                        {connected === null && (
                            <View style={styles.emptyState}>
                                <Circle size={48} color="#EEE" />
                                <Text style={styles.emptyText}>Please select connection status above to continue</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.submitBtn, submitting && styles.btnDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        <Text style={styles.submitText}>{submitting ? "Processing..." : "Complete Disposition"}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    headerInfo: {
        marginBottom: 24,
        alignItems: 'center',
    },
    leadName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    leadPhone: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 4,
    },
    connectionCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 16,
        textAlign: 'center',
    },
    choiceGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    choiceItem: {
        flex: 1,
        backgroundColor: '#FDFDFD',
        borderWidth: 2,
        borderColor: '#F0F0F0',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    choiceItemActive: {
        backgroundColor: '#FFFFFF',
    },
    choiceIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    choiceLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        textAlign: 'center',
    },
    formCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 20,
        marginBottom: 100,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    formSection: {
        gap: 20,
    },
    inputContainer: {
        gap: 8,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    input: {
        backgroundColor: '#FAFAFA',
        borderWidth: 1.5,
        borderColor: '#EEE',
        borderRadius: 12,
        padding: 14,
        color: colors.textPrimary,
        fontSize: 15,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    chip: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    chipActive: {
        backgroundColor: '#FFF9E6',
        borderColor: colors.primary,
    },
    chipText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    chipTextActive: {
        color: colors.black,
        fontWeight: '700',
    },
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FAFAFA',
        borderWidth: 1.5,
        borderColor: '#EEE',
        borderRadius: 12,
        padding: 14,
    },
    dateText: {
        fontSize: 15,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    footerStatus: {
        padding: 16,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    submitBtn: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        elevation: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    submitText: {
        color: colors.black,
        fontSize: 16,
        fontWeight: '700',
    },
    btnDisabled: {
        opacity: 0.6,
    }
});
