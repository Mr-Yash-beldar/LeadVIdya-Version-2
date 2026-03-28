import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    Platform, Keyboard, Alert, Modal
} from 'react-native';
import {
    MessageCircle, MessageSquare, Check, X, Calendar as CalendarIcon,
    Clock, ChevronRight, Send, IndianRupee, Video
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import { GlassCard } from './GlassCard';

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAD_STATUS = {
    NEW: "New",
    QUALIFIED: "Qualified",
    FOLLOW_UP: "Follow up",
    DEMO_BOOKED: "Demo Booked",
    DEMO_COMPLETED: "Demo Completed",
    DEMO_RESCHEDULED: "Demo Rescheduled",
    NIFC: "Not Interested for Full Course",
    MAY_BE_BUY_LATER: "May be Buy Later",
    POSITIVE: "Positive",
    ENROLLED: "Enrolled",
};

const NOT_CONNECTED_REASONS = [
    "Did not pick",
    "Busy in another call",
    "User disconnected the call",
    "Switch off",
    "Out of coverage",
    "Wrong Number",
    "Incomings not available",
    "Not exist/ Out of service"
];

/** Statuses that should trigger the demo date/time modal */
const DEMO_STATUSES = new Set([
    LEAD_STATUS.DEMO_BOOKED,
    LEAD_STATUS.DEMO_COMPLETED,
    LEAD_STATUS.DEMO_RESCHEDULED,
]);

// ─── Props ────────────────────────────────────────────────────────────────────

interface DisposeFormProps {
    connected: boolean | null;
    setConnected: (val: boolean | null) => void;
    disposeStatus: string;
    setDisposeStatus: (val: string) => void;
    description: string;
    setDescription: (val: string) => void;
    expectedValue: string;
    setExpectedValue: (val: string) => void;
    followUpDate: Date;
    setFollowUpDate: (date: Date) => void;
    showDatePicker: boolean;
    setShowDatePicker: (val: boolean) => void;
    showTimePicker: boolean;
    setShowTimePicker: (val: boolean) => void;
    isProcessing: boolean;
    onProceed: () => void;
    onSendMessage: () => void;
    onSendWhatsApp: () => void;
    onDateChange?: (event: any, selectedDate?: Date) => void;
    onTimeChange?: (event: any, selectedDate?: Date) => void;

    // ── New: demo date/time ──────────────────────────────────────────────────
    demoDateTime: Date | null;
    setDemoDateTime: (date: Date | null) => void;

    // ── New: enrolled amount ─────────────────────────────────────────────────
    enrolledAmount: string;
    setEnrolledAmount: (val: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DisposeForm: React.FC<DisposeFormProps> = ({
    connected,
    setConnected,
    disposeStatus,
    setDisposeStatus,
    description,
    setDescription,
    expectedValue,
    setExpectedValue,
    followUpDate,
    showDatePicker,
    showTimePicker,
    isProcessing,
    onProceed,
    onSendMessage,
    onSendWhatsApp,
    setShowDatePicker,
    setShowTimePicker,
    setFollowUpDate,
    demoDateTime,
    setDemoDateTime,
    enrolledAmount,
    setEnrolledAmount,
}) => {

    // ── Demo modal state ─────────────────────────────────────────────────────
    const [showDemoModal, setShowDemoModal] = useState(false);
    // Temp date used inside the modal before confirmation
    const [tempDemoDate, setTempDemoDate] = useState<Date>(new Date());
    const [showDemoDatePicker, setShowDemoDatePicker] = useState(false);
    const [showDemoTimePicker, setShowDemoTimePicker] = useState(false);

    // ── Enrolled modal state ─────────────────────────────────────────────────
    const [showEnrolledModal, setShowEnrolledModal] = useState(false);
    const [tempAmount, setTempAmount] = useState('');

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Called when user taps a status pill */
    const handleStatusSelect = (s: string) => {
        setDisposeStatus(s);

        if (DEMO_STATUSES.has(s)) {
            // Pre-fill temp with existing demo time or 1hr from now
            setTempDemoDate(demoDateTime ?? new Date(Date.now() + 60 * 60 * 1000));
            setShowDemoModal(true);
        } else if (s === LEAD_STATUS.ENROLLED) {
            setTempAmount(enrolledAmount);
            setShowEnrolledModal(true);
        }
    };

    // ── Follow-up date/time handlers ─────────────────────────────────────────

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (event.type === 'dismissed') { setShowDatePicker(false); return; }
        if (selectedDate) {
            const updated = new Date(followUpDate);
            updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            setFollowUpDate(updated);
            setShowDatePicker(false);
            if (Platform.OS === 'android') {
                setTimeout(() => setShowTimePicker(true), 350);
            } else {
                setShowTimePicker(true);
            }
        } else {
            setShowDatePicker(false);
        }
    };

    const handleTimeChange = (event: any, selectedTime?: Date) => {
        if (event.type === 'dismissed') { setShowTimePicker(false); return; }
        if (selectedTime) {
            if (selectedTime <= new Date()) {
                Alert.alert("Invalid Time", "Please select a future time for follow-up.");
                setFollowUpDate(new Date(Date.now() + 30 * 60 * 1000));
            } else {
                setFollowUpDate(selectedTime);
            }
        }
        setShowTimePicker(false);
    };

    // ── Demo modal date/time handlers ─────────────────────────────────────────

    const handleDemoDateChange = (event: any, selectedDate?: Date) => {
        if (event.type === 'dismissed') { setShowDemoDatePicker(false); return; }
        if (selectedDate) {
            const updated = new Date(tempDemoDate);
            updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            setTempDemoDate(updated);
            setShowDemoDatePicker(false);
            if (Platform.OS === 'android') {
                setTimeout(() => setShowDemoTimePicker(true), 350);
            } else {
                setShowDemoTimePicker(true);
            }
        } else {
            setShowDemoDatePicker(false);
        }
    };

    const handleDemoTimeChange = (event: any, selectedTime?: Date) => {
        if (event.type === 'dismissed') { setShowDemoTimePicker(false); return; }
        if (selectedTime) {
            const updated = new Date(tempDemoDate);
            updated.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
            setTempDemoDate(updated);
        }
        setShowDemoTimePicker(false);
    };

    const confirmDemoDateTime = () => {
        setDemoDateTime(tempDemoDate);
        setShowDemoModal(false);
    };

    const dismissDemoModal = () => {
        // If user dismisses without confirming, clear the status selection
        setDemoDateTime(null);
        setDisposeStatus('');
        setShowDemoModal(false);
    };

    // ── Enrolled modal handlers ───────────────────────────────────────────────

    const confirmEnrolledAmount = () => {
        if (!tempAmount.trim() || isNaN(Number(tempAmount))) {
            Alert.alert('Invalid Amount', 'Please enter a valid numeric amount.');
            return;
        }
        setEnrolledAmount(tempAmount.trim());
        setShowEnrolledModal(false);
    };

    const dismissEnrolledModal = () => {
        setEnrolledAmount('');
        setDisposeStatus('');
        setShowEnrolledModal(false);
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <View style={styles.container}>

            {/* ── Demo Date/Time Modal ───────────────────────────────────── */}
            <Modal
                visible={showDemoModal}
                transparent
                animationType="slide"
                onRequestClose={dismissDemoModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconBadge}>
                                <Video size={20} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Schedule Demo</Text>
                                <Text style={styles.modalSubtitle}>{disposeStatus}</Text>
                            </View>
                            <TouchableOpacity onPress={dismissDemoModal} style={styles.modalCloseBtn}>
                                <X size={18} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Selected date/time display */}
                        <View style={styles.demoDateDisplay}>
                            <Text style={styles.demoDateLabel}>Selected Demo Date & Time</Text>
                            <Text style={styles.demoDateValue}>
                                {tempDemoDate.toLocaleString(undefined, {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </Text>
                        </View>

                        {/* Picker trigger buttons */}
                        <View style={styles.demoPickerRow}>
                            <TouchableOpacity
                                style={styles.demoPickerBtn}
                                onPress={() => setShowDemoDatePicker(true)}
                            >
                                <CalendarIcon size={16} color={colors.primary} />
                                <Text style={styles.demoPickerBtnText}>Change Date</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.demoPickerBtn}
                                onPress={() => setShowDemoTimePicker(true)}
                            >
                                <Clock size={16} color={colors.primary} />
                                <Text style={styles.demoPickerBtnText}>Change Time</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Inline pickers */}
                        {showDemoDatePicker && (
                            <DateTimePicker
                                value={tempDemoDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleDemoDateChange}
                                minimumDate={new Date()}
                            />
                        )}
                        {showDemoTimePicker && (
                            <DateTimePicker
                                value={tempDemoDate}
                                mode="time"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleDemoTimeChange}
                            />
                        )}

                        {/* Actions */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={dismissDemoModal}>
                                <Text style={styles.modalCancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmDemoDateTime}>
                                <Check size={16} color={colors.white} />
                                <Text style={styles.modalConfirmBtnText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Enrolled Amount Modal ──────────────────────────────────── */}
            <Modal
                visible={showEnrolledModal}
                transparent
                animationType="slide"
                onRequestClose={dismissEnrolledModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={[styles.modalIconBadge, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                                <IndianRupee size={20} color={colors.success} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Enrollment Amount</Text>
                                <Text style={styles.modalSubtitle}>Enter the amount paid by the student</Text>
                            </View>
                            <TouchableOpacity onPress={dismissEnrolledModal} style={styles.modalCloseBtn}>
                                <X size={18} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Amount input */}
                        <View style={styles.amountInputWrapper}>
                            <View style={styles.amountPrefix}>
                                <IndianRupee size={18} color={colors.success} />
                            </View>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0.00"
                                placeholderTextColor={colors.textMuted}
                                value={tempAmount}
                                onChangeText={setTempAmount}
                                keyboardType="numeric"
                                autoFocus
                                returnKeyType="done"
                                onSubmitEditing={confirmEnrolledAmount}
                            />
                        </View>
                        <Text style={styles.amountHint}>This amount will be logged with the enrollment record.</Text>

                        {/* Actions */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={dismissEnrolledModal}>
                                <Text style={styles.modalCancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalConfirmBtn, { backgroundColor: colors.success }]}
                                onPress={confirmEnrolledAmount}
                            >
                                <Check size={16} color={colors.white} />
                                <Text style={styles.modalConfirmBtnText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Main Form ─────────────────────────────────────────────── */}
            <GlassCard style={styles.mainCard}>
                <Text style={styles.sectionTitle}>Call Disposition</Text>
                <Text style={styles.question}>Was the call connected successfully?</Text>

                <View style={styles.choiceRow}>
                    <TouchableOpacity
                        style={[styles.choiceBtn, connected === false && styles.choiceBtnSelectedError]}
                        onPress={() => { setConnected(false); setDisposeStatus(''); }}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.choiceIcon, connected === false && { backgroundColor: 'white' }]}>
                            <X size={16} color={connected === false ? colors.error : colors.textMuted} />
                        </View>
                        <Text style={[styles.choiceText, connected === false && styles.choiceTextActive]}>No</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.choiceBtn, connected === true && styles.choiceBtnSelectedSuccess]}
                        onPress={() => { setConnected(true); setDisposeStatus(''); }}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.choiceIcon, connected === true && { backgroundColor: 'white' }]}>
                            <Check size={16} color={connected === true ? colors.success : colors.textMuted} />
                        </View>
                        <Text style={[styles.choiceText, connected === true && styles.choiceTextActive]}>Yes</Text>
                    </TouchableOpacity>
                </View>
            </GlassCard>

            {connected !== null && (
                <View style={styles.detailsContainer}>
                    <GlassCard style={styles.actionCard}>
                        <Text style={styles.label}>Quick Actions</Text>
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={onSendWhatsApp}>
                                <MessageCircle color="white" size={18} />
                                <Text style={styles.actionBtnText}>WhatsApp</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2196F3' }]} onPress={onSendMessage}>
                                <MessageSquare color="white" size={18} />
                                <Text style={styles.actionBtnText}>Message</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>

                    <GlassCard style={styles.formCard}>
                        <Text style={styles.label}>{connected ? 'Update Lead Stage' : 'Reason for Disconnect'}</Text>
                        <View style={styles.statusGrid}>
                            {(connected ? Object.values(LEAD_STATUS) : NOT_CONNECTED_REASONS).map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.statusOption, disposeStatus === s && styles.statusOptionSelected]}
                                    onPress={() => handleStatusSelect(s)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.statusOptionText, disposeStatus === s && styles.statusOptionTextActive]}>
                                        {s}
                                    </Text>
                                    {disposeStatus === s && <View style={styles.activeDot} />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* ── Demo info badge ─────────────────────────────────────── */}
                        {disposeStatus && DEMO_STATUSES.has(disposeStatus) && demoDateTime && (
                            <TouchableOpacity
                                style={styles.infoBadge}
                                onPress={() => {
                                    setTempDemoDate(demoDateTime);
                                    setShowDemoModal(true);
                                }}
                                activeOpacity={0.8}
                            >
                                <View style={styles.infoBadgeLeft}>
                                    <Video size={14} color={colors.primary} />
                                    <Text style={styles.infoBadgeLabel}>Demo Scheduled</Text>
                                </View>
                                <Text style={styles.infoBadgeValue}>
                                    {demoDateTime.toLocaleString(undefined, {
                                        day: 'numeric', month: 'short',
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                </Text>
                                <ChevronRight size={14} color={colors.textMuted} />
                            </TouchableOpacity>
                        )}

                        {/* ── Enrolled amount badge ───────────────────────────────── */}
                        {disposeStatus === LEAD_STATUS.ENROLLED && enrolledAmount !== '' && (
                            <TouchableOpacity
                                style={[styles.infoBadge, { borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.06)' }]}
                                onPress={() => {
                                    setTempAmount(enrolledAmount);
                                    setShowEnrolledModal(true);
                                }}
                                activeOpacity={0.8}
                            >
                                <View style={styles.infoBadgeLeft}>
                                    <IndianRupee size={14} color={colors.success} />
                                    <Text style={[styles.infoBadgeLabel, { color: colors.success }]}>Enrolled Amount</Text>
                                </View>
                                <Text style={[styles.infoBadgeValue, { color: colors.success, fontWeight: '800' }]}>
                                    ₹{enrolledAmount}
                                </Text>
                                <ChevronRight size={14} color={colors.success} />
                            </TouchableOpacity>
                        )}

                        <Text style={styles.label}>{connected ? 'Discussion Summary' : 'Disposition Remark'}</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.textArea}
                                placeholder={connected ? "Brief history of the conversation..." : "Why was the call not connected?"}
                                placeholderTextColor={colors.textMuted}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                            />
                        </View>

                        {connected && (
                            <>
                                <Text style={styles.label}>Expected Deal Value</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0.00"
                                        placeholderTextColor={colors.textMuted}
                                        value={expectedValue}
                                        onChangeText={setExpectedValue}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </>
                        )}

                        {/* Follow-up date/time */}
                        <TouchableOpacity
                            onPress={() => {
                                Keyboard.dismiss();
                                setShowDatePicker(true);
                            }}
                            style={styles.dateTimeBtn}
                            activeOpacity={0.7}
                        >
                            <View style={styles.dateTimeInner}>
                                <CalendarIcon size={18} color={colors.primary} />
                                <Text style={styles.dateTimeText}>
                                    {followUpDate.toLocaleString(undefined, {
                                        day: 'numeric', month: 'short', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </Text>
                            </View>
                            <ChevronRight size={18} color={colors.textMuted} />
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={followUpDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleDateChange}
                                minimumDate={new Date()}
                            />
                        )}
                        {showTimePicker && (
                            <DateTimePicker
                                value={followUpDate}
                                mode="time"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleTimeChange}
                            />
                        )}

                        <TouchableOpacity
                            style={[styles.proceedBtn, isProcessing && { opacity: 0.7 }]}
                            onPress={onProceed}
                            disabled={isProcessing}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.proceedText}>{isProcessing ? "Processing..." : "Finish Disposition"}</Text>
                            {!isProcessing && <Send size={18} color={colors.white} />}
                        </TouchableOpacity>
                    </GlassCard>
                </View>
            )}
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        gap: theme.spacing.md,
    },
    mainCard: {
        padding: theme.spacing.md,
    },
    sectionTitle: {
        ...theme.typography.h3,
        color: colors.textPrimary,
        marginBottom: 4,
    },
    question: {
        ...theme.typography.caption,
        color: colors.textSecondary,
        marginBottom: 20,
    },
    choiceRow: {
        flexDirection: 'row',
        gap: 12,
    },
    choiceBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.divider,
        backgroundColor: 'rgba(255,255,255,0.3)',
        gap: 10,
    },
    choiceBtnSelectedSuccess: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },
    choiceBtnSelectedError: {
        backgroundColor: colors.error,
        borderColor: colors.error,
    },
    choiceIcon: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center', justifyContent: 'center',
    },
    choiceText: {
        ...theme.typography.button,
        color: colors.textSecondary,
    },
    choiceTextActive: {
        color: colors.white,
        fontWeight: '800',
    },
    detailsContainer: {
        gap: theme.spacing.md,
    },
    actionCard: {
        padding: theme.spacing.md,
    },
    label: {
        ...theme.typography.caption,
        fontWeight: '800',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
        ...theme.shadows.sm,
    },
    actionBtnText: {
        ...theme.typography.button,
        color: colors.white,
        fontSize: 13,
    },
    formCard: {
        padding: theme.spacing.md,
    },
    statusGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    statusOption: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.divider,
        backgroundColor: 'rgba(255,255,255,0.4)',
        minWidth: '30%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusOptionSelected: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(255,193,7,0.08)',
    },
    statusOptionText: {
        ...theme.typography.caption,
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
        textAlign: 'center',
    },
    statusOptionTextActive: {
        color: colors.primaryDark,
        fontWeight: '800',
    },
    activeDot: {
        position: 'absolute',
        top: 4, right: 4,
        width: 6, height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
    },

    // ── Info badges ──────────────────────────────────────────────────────────
    infoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,193,7,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,193,7,0.25)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 16,
        gap: 8,
    },
    infoBadgeLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    infoBadgeLabel: {
        ...theme.typography.caption,
        fontWeight: '700',
        color: colors.primary,
        fontSize: 12,
    },
    infoBadgeValue: {
        ...theme.typography.caption,
        fontWeight: '700',
        color: colors.textPrimary,
        fontSize: 12,
    },

    // ── Form inputs ──────────────────────────────────────────────────────────
    inputWrapper: {
        marginBottom: 20,
    },
    input: {
        ...theme.typography.body,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.divider,
        color: colors.textPrimary,
    },
    textArea: {
        ...theme.typography.body,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.divider,
        color: colors.textPrimary,
        height: 100,
        textAlignVertical: 'top',
    },
    dateTimeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.divider,
        marginBottom: 32,
    },
    dateTimeInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dateTimeText: {
        ...theme.typography.body,
        fontSize: 14,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    proceedBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        gap: 12,
        ...theme.shadows.md,
    },
    proceedText: {
        ...theme.typography.button,
        color: colors.white,
        fontSize: 16,
        fontWeight: '800',
    },

    // ── Modal ────────────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: theme.spacing.lg,
        paddingBottom: 32,
        ...theme.shadows.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    modalIconBadge: {
        width: 44, height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,193,7,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        ...theme.typography.h3,
        color: colors.textPrimary,
        fontSize: 17,
    },
    modalSubtitle: {
        ...theme.typography.caption,
        color: colors.textMuted,
        marginTop: 2,
    },
    modalCloseBtn: {
        padding: 6,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.divider,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },
    modalCancelBtnText: {
        ...theme.typography.button,
        color: colors.textSecondary,
    },
    modalConfirmBtn: {
        flex: 2,
        flexDirection: 'row',
        paddingVertical: 13,
        borderRadius: 14,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...theme.shadows.sm,
    },
    modalConfirmBtnText: {
        ...theme.typography.button,
        color: colors.white,
    },

    // ── Demo modal specifics ─────────────────────────────────────────────────
    demoDateDisplay: {
        backgroundColor: 'rgba(255,193,7,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,193,7,0.2)',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
    },
    demoDateLabel: {
        ...theme.typography.caption,
        color: colors.textMuted,
        fontWeight: '600',
        marginBottom: 6,
    },
    demoDateValue: {
        ...theme.typography.h3,
        color: colors.textPrimary,
        fontSize: 16,
        textAlign: 'center',
    },
    demoPickerRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 4,
    },
    demoPickerBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 11,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: 'rgba(255,193,7,0.06)',
    },
    demoPickerBtnText: {
        ...theme.typography.caption,
        color: colors.primary,
        fontWeight: '700',
    },

    // ── Enrolled modal specifics ─────────────────────────────────────────────
    amountInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16,185,129,0.05)',
        borderWidth: 1.5,
        borderColor: 'rgba(16,185,129,0.3)',
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 8,
    },
    amountPrefix: {
        paddingHorizontal: 14,
        paddingVertical: 16,
        backgroundColor: 'rgba(16,185,129,0.08)',
        borderRightWidth: 1,
        borderRightColor: 'rgba(16,185,129,0.2)',
    },
    amountInput: {
        flex: 1,
        padding: 16,
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    amountHint: {
        ...theme.typography.caption,
        color: colors.textMuted,
        fontSize: 12,
        marginBottom: 4,
        textAlign: 'center',
    },
});
