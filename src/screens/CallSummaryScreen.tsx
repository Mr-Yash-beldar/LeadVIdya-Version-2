import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    Calendar,
    FileText,
    User,
    ShieldCheck,
    Activity,
    Zap,
    ChevronRight
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import { LeadsService } from '../services/LeadsService';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';

export const CallSummaryScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { leadId, formData, callLog, leadName } = route.params;
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const payload = {
                leadId: leadId,
                status: formData.connected ? formData.status : 'follow up',
                followupdate: formData.followUpDate,
                contacted: formData.connected,
                ...(formData.connected && {
                    note_desc: formData.description,
                    expectedValue: formData.expectedValue,
                }),
                ...(!formData.connected && {
                    note_desc: formData.status,
                }),
                // Send Demo and Enrollment data
                ...(formData.demoDateTime && { 
                    demoDateTime: formData.demoDateTime,
                    demoDate: new Date(formData.demoDateTime).toLocaleDateString('en-IN'),
                    demoTime: new Date(formData.demoDateTime).toLocaleTimeString('en-IN'),
                }),
                ...(formData.enrolledAmount && { 
                    enrolledAmount: formData.enrolledAmount,
                    enrolledDate: new Date().toLocaleDateString(),
                    enrolledDateISO: new Date().toISOString(),
                }),
            };

            if (callLog) {
                const callPayload = {
                    leadId: leadId,
                    callTime: new Date(callLog.timestamp).toISOString(),
                    durationSeconds: callLog.duration,
                    callStatus: formData.connected ? 'connected' : 'not_connected',
                    callType: callLog.type ? callLog.type.toLowerCase() : 'outgoing',
                    recordingLink: callLog.recordingPath || null,
                    notes: `Call Summary: ${formData.status}`
                };
                await LeadsService.logCall(callPayload);
            }

            await LeadsService.updateLeadBySalesperson(payload);

            Alert.alert("Success", "Disposition logged correctly", [
                {
                    text: "Done",
                    onPress: () => {
                        navigation.navigate('LeadDetails', { leadId, activeTab: 'LEAD_INFO', refresh: true });
                    }
                }
            ]);
        } catch (error: any) {
            if (error.response && error.response.status === 409) {
                Alert.alert("Conflict", "This lead was already updated by someone else.");
            } else {
                Alert.alert("Submission Failed", "Please try again later.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <ScreenWrapper navigation={navigation} title="Verification">
            <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
            <View style={styles.container}>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                    <View style={styles.successHeader}>
                        <View style={styles.iconCircle}>
                            <ShieldCheck size={40} color={colors.success} />
                        </View>
                        <Text style={styles.title}>Ready to Submit</Text>
                        <Text style={styles.subtitle}>Review your call disposition summary below.</Text>
                    </View>

                    <GlassCard style={styles.infoCard}>
                        <View style={styles.sectionHeader}>
                            <User size={18} color={colors.primary} />
                            <Text style={styles.sectionTitle}>Lead Information</Text>
                        </View>
                        <View style={styles.divider} />
                        <SummaryRow label="Client Name" value={leadName || 'Unknown'} />
                        <SummaryRow label="Connection" value={formData.connected ? "Successful" : "Not Range"} success={formData.connected} />
                    </GlassCard>


                    {/* {callLog && (
                        <GlassCard style={styles.infoCard}>
                            <View style={styles.sectionHeader}>
                                <Activity size={18} color={colors.accent} />
                                <Text style={styles.sectionTitle}>Call Details</Text>
                            </View>
                            <View style={styles.divider} />
                            <SummaryRow label="Call Duration" value={formatDuration(callLog.duration)} icon={Clock} />
                            <SummaryRow label="Timestamp" value={new Date(callLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} icon={Calendar} />
                            {callLog.recordingPath && (
                                <SummaryRow label="Recording" value="Stored on device" icon={FileText} />
                            )}
                        </GlassCard>
                    )} */}

                    <GlassCard style={styles.infoCard}>
                        <View style={styles.sectionHeader}>
                            <Zap size={18} color={colors.warning} />
                            <Text style={styles.sectionTitle}>Update Results</Text>
                        </View>
                        <View style={styles.divider} />
                        <SummaryRow label="Next Status" value={formData.status.toUpperCase()} />
                        <SummaryRow label="Follow-up On" value={new Date(formData.followUpDate).toDateString()} />
                        {formData.expectedValue ? (
                            <SummaryRow label="Expected Val" value={`₹${formData.expectedValue}`} />
                        ) : null}

                        <View style={styles.remarkBox}>
                            <Text style={styles.remarkLabel}>Remark Summary:</Text>
                            <Text style={styles.remarkText}>
                                {formData.description || 'No detailed remark provided.'}
                            </Text>
                        </View>
                    </GlassCard>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={submitting}
                        activeOpacity={0.8}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <View style={styles.btnContent}>
                                <CheckCircle2 size={20} color={colors.white} />
                                <Text style={styles.submitText}>Confirm & Sync Data</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.footerNote}>This will update the lead status globally.</Text>
                </View>
            </View>
        </ScreenWrapper>
    );
};

// -- Helper: Summary Row --
const SummaryRow = ({ label, value, icon: Icon, success }: any) => (
    <View style={styles.summaryRow}>
        <View style={styles.labelRow}>
            {Icon && <Icon size={14} color={colors.textMuted} style={{ marginRight: 6 }} />}
            <Text style={styles.sumLabel}>{label}</Text>
        </View>
        <Text style={[styles.sumValue, success !== undefined && { color: success ? colors.success : colors.error }]}>
            {value}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.md,
        paddingBottom: 40,
    },
    successHeader: {
        alignItems: 'center',
        marginVertical: 24,
        gap: 8,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(16,185,129,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(16,185,129,0.2)',
    },
    title: {
        ...theme.typography.h2,
        color: colors.textPrimary,
    },
    subtitle: {
        ...theme.typography.body,
        color: colors.textMuted,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    infoCard: {
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        ...theme.typography.h3,
        fontSize: 16,
        color: colors.textPrimary,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sumLabel: {
        ...theme.typography.caption,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    sumValue: {
        ...theme.typography.caption,
        color: colors.textPrimary,
        fontWeight: '800',
    },
    remarkBox: {
        marginTop: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    remarkLabel: {
        ...theme.typography.caption,
        color: colors.textMuted,
        fontWeight: '800',
        marginBottom: 4,
    },
    remarkText: {
        ...theme.typography.body,
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    footer: {
        padding: theme.spacing.lg,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        gap: 12,
    },
    submitBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.md,
    },
    btnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    submitText: {
        ...theme.typography.button,
        color: colors.white,
        fontSize: 16,
        fontWeight: '800',
    },
    footerNote: {
        ...theme.typography.caption,
        color: colors.textMuted,
        textAlign: 'center',
        fontSize: 11,
    }
});
