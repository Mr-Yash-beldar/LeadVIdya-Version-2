import React, { useEffect } from 'react';
import { 
  View, 
  Image, 
  StyleSheet, 
  Dimensions, 
  Text, 
  ActivityIndicator, 
  StatusBar,
  Animated 
} from 'react-native';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const SplashScreen: React.FC = () => {
    const fadeAnim = new Animated.Value(0);
    const scaleAnim = new Animated.Value(0.95);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            {/* Ambient Background Elements */}
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />

            <Animated.View style={[
                styles.contentContainer,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
            ]}>
                <View style={styles.logoRing}>
                    <Image
                        source={require('../assets/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>
                
                <View style={styles.brandContainer}>
                    <Text style={styles.appName}>LeadVidya</Text>
                    <View style={styles.underline} />
                </View>

                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>Initializing Secure Connection...</Text>
                </View>
            </Animated.View>

            <View style={styles.footerContainer}>
                <Text style={styles.footerText}>Enterprise CRM Solutions</Text>
                <Text style={styles.footerBrand}>Powered by YSPInfotech Team</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A', // Match Login background
        alignItems: 'center',
        justifyContent: 'center',
    },
    bgCircle1: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(255, 193, 7, 0.08)',
    },
    bgCircle2: {
        position: 'absolute',
        bottom: -50,
        left: -100,
        width: 350,
        height: 350,
        borderRadius: 175,
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoRing: {
        padding: 20,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,193,7,0.15)',
        marginBottom: 24,
    },
    logo: {
        width: 140,
        height: 80,
    },
    brandContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    appName: {
        ...theme.typography.h1,
        fontSize: 36,
        color: colors.white,
        letterSpacing: 1,
    },
    underline: {
        width: 40,
        height: 4,
        backgroundColor: colors.primary,
        borderRadius: 2,
        marginTop: 8,
    },
    loaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    loadingText: {
        ...theme.typography.caption,
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
    },
    footerContainer: {
        position: 'absolute',
        bottom: 50,
        alignItems: 'center',
    },
    footerText: {
        ...theme.typography.caption,
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    footerBrand: {
        ...theme.typography.caption,
        fontSize: 13,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.6)',
        marginTop: 6,
    }
});
