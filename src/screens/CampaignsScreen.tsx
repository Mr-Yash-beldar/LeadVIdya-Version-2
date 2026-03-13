import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';
import { CustomButton } from '../components/CustomButton';
import { Search, ChevronRight, Layout, Users, Calendar, Activity } from 'lucide-react-native';
import { campaignService } from '../services/campaignService';
import { Campaign } from '../types/Campaign';
import { useNetwork } from '../context/NetworkContext';
export const CampaignsScreen = () => {
    const navigation = useNavigation<any>();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const fetchCampaigns = useCallback(async () => {
        try {
            const data = await campaignService.getCampaigns();
            setCampaigns(data);
        } catch (error) {
            console.error('Failed to fetch campaigns', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    const { checkNow } = useNetwork();

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        checkNow();
        fetchCampaigns();
    }, [fetchCampaigns, checkNow]);

    const filteredCampaigns = useMemo(() => {
        if (!searchQuery) return campaigns;
        const query = searchQuery.toLowerCase();
        return campaigns.filter(c => c.name.toLowerCase().includes(query));
    }, [searchQuery, campaigns]);

    const handleCampaignPress = useCallback((item: Campaign) => {
        navigation.navigate('CampaignLeads', { campaignId: item._id, title: item.name });
    }, [navigation]);

    const renderCampaignItem = useCallback(({ item }: { item: Campaign }) => (
        <TouchableOpacity
            onPress={() => handleCampaignPress(item)}
            activeOpacity={0.9}
        >
            <GlassCard style={styles.campaignCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.iconBox}>
                        <Layout size={20} color={colors.primary} />
                    </View>
                    <View style={styles.titleInfo}>
                        <Text style={styles.campaignName}>{item.name}</Text>
                        <View style={styles.dateRow}>
                            <Calendar size={12} color={colors.textMuted} />
                            <Text style={styles.dateText}>
                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Active'}
                            </Text>
                        </View>
                    </View>
                    <ChevronRight size={20} color={colors.textMuted} />
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardFooter}>
                    <View style={styles.statContainer}>
                        <Users size={16} color={colors.textSecondary} />
                        <View style={styles.statInfo}>
                            <Text style={styles.statValue}>{item.assignedCount || 0}</Text>
                            <Text style={styles.statLabel}>My Leads</Text>
                        </View>
                    </View>
                    <CustomButton
                        title="View Leads"
                        variant="ghost"
                        size="sm"
                        onPress={() => handleCampaignPress(item)}
                    />
                </View>
            </GlassCard>
        </TouchableOpacity>
    ), [handleCampaignPress]);

    if (loading && !refreshing) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <ScreenWrapper navigation={navigation} title="Campaigns">
            <View style={styles.container}>
                <View style={styles.searchSection}>
                    <View style={styles.searchContainer}>
                        <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search campaigns..."
                            placeholderTextColor={colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {loading && !refreshing ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator color={colors.primary} size="large" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredCampaigns}
                        renderItem={renderCampaignItem}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Activity size={48} color={colors.divider} />
                                <Text style={styles.emptyText}>No campaigns found</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchSection: {
        paddingTop: theme.spacing.lg,
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.md,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: theme.radii.lg,
        paddingHorizontal: theme.spacing.md,
        height: 48,
        ...theme.shadows.sm,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    searchIcon: {
        marginRight: theme.spacing.sm,
    },
    searchInput: {
        ...theme.typography.body,
        flex: 1,
        height: '100%',
    },
    listContent: {
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    campaignCard: {
        marginBottom: theme.spacing.md,
        padding: theme.spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: theme.radii.md,
        backgroundColor: '#FFF9E6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.md,
    },
    titleInfo: {
        flex: 1,
    },
    campaignName: {
        ...theme.typography.h3,
        fontSize: 16,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dateText: {
        ...theme.typography.caption,
        color: colors.textMuted,
    },
    cardDivider: {
        height: 1,
        backgroundColor: colors.divider,
        marginVertical: theme.spacing.md,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    statInfo: {
        flexDirection: 'column',
    },
    statValue: {
        ...theme.typography.body,
        fontWeight: '700',
        color: colors.textPrimary,
        lineHeight: 18,
    },
    statLabel: {
        ...theme.typography.caption,
        color: colors.textSecondary,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: theme.spacing.md,
    },
    emptyText: {
        ...theme.typography.body,
        color: colors.textSecondary,
    },
});
