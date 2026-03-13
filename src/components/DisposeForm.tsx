import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, ScrollView, Keyboard, Alert } from 'react-native';
import { MessageCircle, MessageSquare, Check, X, Calendar as CalendarIcon, Clock, ChevronRight, Send } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import { GlassCard } from './GlassCard';

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
}

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
}) => {
    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (event.type === 'dismissed') {
            setShowDatePicker(false);
            return;
        }

        if (selectedDate) {
            const updatedDate = new Date(followUpDate);
            updatedDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            setFollowUpDate(updatedDate);
            setShowDatePicker(false);

            // Sequential time picker for Android
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
        if (event.type === 'dismissed') {
            setShowTimePicker(false);
            return;
        }

        if (selectedTime) {
            const now = new Date();
            if (selectedTime <= now) {
                Alert.alert("Invalid Time", "Please select a future time for follow-up.");
                // Set to 30 mins from now
                setFollowUpDate(new Date(Date.now() + 30 * 60 * 1000));
            } else {
                setFollowUpDate(selectedTime);
            }
        }
        setShowTimePicker(false);
    };

    return (
        <View style={styles.container}>
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
                <AnimatedView style={styles.detailsContainer}>
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
                                    onPress={() => setDisposeStatus(s)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.statusOptionText, disposeStatus === s && styles.statusOptionTextActive]}>
                                        {s}
                                    </Text>
                                    {disposeStatus === s && <View style={styles.activeDot} />}
                                </TouchableOpacity>
                            ))}
                        </View>

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
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
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
                </AnimatedView>
            )}
        </View>
    );
};

const AnimatedView = View; // Simple proxy for now

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
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
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
        top: 4,
        right: 4,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
    },
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
});
