import React, { useState, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Image, 
    TouchableOpacity, 
    Dimensions, 
    FlatList,
    Animated,
    StatusBar
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { theme } from '../../theme/theme';
import { GlassCard } from '../../components/GlassCard';
import { CustomButton } from '../../components/CustomButton';
import { 
    ShieldCheck, 
    PhoneCall, 
    BarChart3, 
    Users, 
    ChevronRight,
    Sparkles
} from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Lead Management',
        description: 'Track, manage, and follow up with your prospects through a high-performance workflow.',
        icon: Users,
        color: colors.primary,
        image: require('../../assets/logo.png'), // Using logo as fallback for now
    },
    {
        id: '2',
        title: 'Smart Analytics',
        description: 'Gain deep insights into your call performance and conversion rates with real-time reporting.',
        icon: BarChart3,
        color: colors.accent,
        image: require('../../assets/call-default.png'),
    },
    {
        id: '3',
        title: 'Secure Operations',
        description: 'Enterprise-grade security for your call logs and lead data, ensuring privacy and compliance.',
        icon: ShieldCheck,
        color: colors.success,
        image: require('../../assets/logo.png'),
    }
];

export const OnboardingScreen = () => {
    const { completeOnboarding } = useAuth();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef(null);

    const viewableItemsChanged = useRef(({ viewableItems }: any) => {
        setCurrentIndex(viewableItems[0].index);
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const scrollTo = () => {
        if (currentIndex < SLIDES.length - 1) {
            (slidesRef.current as any).scrollToIndex({ index: currentIndex + 1 });
        } else {
            completeOnboarding();
        }
    };

    const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => {
        const Icon = item.icon;
        return (
            <View style={styles.slideContainer}>
                <View style={styles.imageArea}>
                    <View style={[styles.glowCircle, { backgroundColor: `${item.color}20` }]} />
                    <Icon size={120} color={item.color} strokeWidth={1.5} />
                </View>

                <GlassCard style={styles.contentCard}>
                    <View style={styles.cardHeader}>
                        <Sparkles size={16} color={item.color} />
                        <Text style={[styles.badgeText, { color: item.color }]}>PREMIUM FEATURE</Text>
                    </View>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.description}>{item.description}</Text>
                </GlassCard>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={completeOnboarding} style={styles.skipBtn}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={SLIDES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                    useNativeDriver: false,
                })}
                onViewableItemsChanged={viewableItemsChanged}
                viewabilityConfig={viewConfig}
                scrollEventThrottle={32}
                ref={slidesRef}
                renderItem={renderSlide}
            />

            <View style={styles.footer}>
                <View style={styles.indicatorArea}>
                    {SLIDES.map((_, i) => {
                        const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [10, 24, 10],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View 
                                key={i} 
                                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: colors.primary }]} 
                            />
                        );
                    })}
                </View>

                <CustomButton
                    title={currentIndex === SLIDES.length - 1 ? "Start Journey" : "Continue"}
                    onPress={scrollTo}
                    style={styles.actionBtn}
                    textStyle={styles.actionBtnText}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        alignItems: 'flex-end',
    },
    skipBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    skipText: {
        ...theme.typography.caption,
        color: colors.textSecondary,
        fontWeight: '700',
    },
    slideContainer: {
        width: SCREEN_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    imageArea: {
        height: SCREEN_HEIGHT * 0.4,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    glowCircle: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
    },
    contentCard: {
        width: '100%',
        padding: 32,
        borderRadius: 40,
        marginTop: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    badgeText: {
        ...theme.typography.caption,
        fontWeight: '800',
        letterSpacing: 1,
        fontSize: 10,
    },
    title: {
        ...theme.typography.h1,
        color: colors.textPrimary,
        fontSize: 32,
        marginBottom: 16,
    },
    description: {
        ...theme.typography.body,
        color: colors.textSecondary,
        fontSize: 16,
        lineHeight: 24,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 60,
    },
    indicatorArea: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 40,
    },
    dot: {
        height: 10,
        borderRadius: 5,
    },
    actionBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 20,
        borderRadius: 24,
        ...theme.shadows.lg,
    },
    actionBtnText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
    },
});
