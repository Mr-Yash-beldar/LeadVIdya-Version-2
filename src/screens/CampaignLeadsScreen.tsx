import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Platform,
    Dimensions,
    StatusBar
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import { campaignService } from '../services/campaignService';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';
import { SearchBar } from '../components/SearchBar';
import { Lead } from '../types/Lead';
import {
    PhoneCall,
    ChevronRight,
    User,
    Activity,
    Tag as TagIcon,
    Search,
    Zap,
    Phone
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// -- Integrated Lead Card for Campaign View --
const CampaignLeadCard = React.memo(({ item, onPress }: { item: Lead; onPress: (lead: Lead) => void }) => {
    const name = item.name || item.firstName || 'Unknown';
    const phone = item.number || item.phone || 'N/A';
    const stage = item.stage || 'N/A';
    const status = item.status || 'OPEN';

    return (
        <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.7}>
            <GlassCard style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                        <User size={20} color={colors.textSecondary} />
                    </View>
                    <View style={styles.headerTitle}>
                        <Text style={styles.leadName} numberOfLines={1}>{name}</Text>
                        <View style={styles.phoneRow}>
                            <Phone size={12} color={colors.textMuted} />
                            <Text style={styles.phoneNumber}>{phone}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status === 'OPEN' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }]}>
                        <Text style={[styles.statusText, { color: status === 'OPEN' ? colors.success : colors.warning }]}>{status}</Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.infoCol}>
                        <Activity size={12} color={colors.textMuted} />
                        <Text style={styles.infoLabel}>Stage:</Text>
                        <Text style={styles.infoValue}>{stage}</Text>
                    </View>
                    <View style={styles.infoCol}>
                        <TagIcon size={12} color={colors.textMuted} />
                        <Text style={styles.infoLabel}>Tag:</Text>
                        <Text style={styles.infoValue}>{item.tag || 'N/A'}</Text>
                    </View>
                </View>
            </GlassCard>
        </TouchableOpacity>
    );
});

export const CampaignLeadsScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { campaignId, title } = route.params;

    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchDetails = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const data = await campaignService.getCampaignDetails(campaignId);
            setLeads(data.data.leads || []);
        } catch (error) {
            console.error('Failed to fetch campaign leads', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [campaignId]);

    const filteredLeads = useMemo(() => {
        if (!searchQuery) return leads;
        const q = searchQuery.toLowerCase();
        return leads.filter(l =>
            (l.name && l.name.toLowerCase().includes(q)) ||
            (l.firstName && l.firstName.toLowerCase().includes(q)) ||
            (l.phone && l.phone.includes(q)) ||
            (l.number && l.number.includes(q))
        );
    }, [leads, searchQuery]);

    // const handleStartCalling = () => {
    //     if (filteredLeads.length > 0) {
    //         navigation.navigate('CallScreen', { lead: filteredLeads[0] });
    //     }
    // };

    if (loading && !refreshing) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading campaign leads...</Text>
            </View>
        );
    }

    return (
        <ScreenWrapper navigation={navigation} title={title}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
            <View style={styles.container}>
                <View style={styles.searchSection}>
                    <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
                </View>

                <FlatList
                    data={filteredLeads}
                    renderItem={({ item }) => <CampaignLeadCard item={item} onPress={(l) => navigation.navigate('LeadDetails', { lead: l })} />}
                    keyExtractor={(item, index) => item._id || item.id || `lead-${index}`}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => fetchDetails(true)} colors={[colors.primary]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Activity size={48} color={colors.divider} />
                            <Text style={styles.emptyText}>No leads matches your search.</Text>
                        </View>
                    }
                />

                {/* <View style={styles.bottomActions}>
                    <TouchableOpacity style={styles.callFab} onPress={handleStartCalling} activeOpacity={0.8}>
                        <Zap size={20} color={colors.white} />
                        <Text style={styles.callFabText}>Start Calling</Text>
                    </TouchableOpacity>
                </View> */}
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.background,
    },
    loadingText: {
        ...theme.typography.caption,
        color: colors.textMuted,
        fontWeight: '600',
    },
    searchSection: {
        backgroundColor: colors.surface,
        paddingBottom: theme.spacing.sm,
    },
    listContent: {
        padding: theme.spacing.md,
        paddingBottom: 120, // Extra space for FAB
    },
    card: {
        marginBottom: theme.spacing.md,
        padding: 0,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.divider,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerTitle: {
        flex: 1,
        gap: 2,
    },
    leadName: {
        ...theme.typography.h3,
        fontSize: 16,
        color: colors.textPrimary,
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    phoneNumber: {
        ...theme.typography.caption,
        color: colors.textMuted,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusText: {
        ...theme.typography.caption,
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    cardBody: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.3)',
        gap: 24,
    },
    infoCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoLabel: {
        ...theme.typography.caption,
        color: colors.textMuted,
    },
    infoValue: {
        ...theme.typography.caption,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    bottomActions: {
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    callFab: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
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
        fontWeight: '800',
        fontSize: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
        gap: 12,
    },
    emptyText: {
        ...theme.typography.body,
        color: colors.textMuted,
        textAlign: 'center',
    }
});
