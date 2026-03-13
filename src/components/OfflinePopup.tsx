import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloudOff } from 'lucide-react-native';
import { useNetwork } from '../context/NetworkContext';
import { colors } from '../theme/colors';

export const OfflinePopup: React.FC = () => {
    const { isOffline } = useNetwork();

    return (
        <Modal
            visible={isOffline}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <SafeAreaView style={styles.container}>
                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <CloudOff size={48} color={colors.white} />
                        </View>
                        <Text style={styles.title}>No Internet Connection</Text>
                        <Text style={styles.message}>
                            Your device is offline. Please check your WiFi or mobile data connection to continue using LeadVidya.
                        </Text>
                        <View style={styles.loaderContainer}>
                            <View style={styles.dot} />
                            <View style={[styles.dot, styles.pulse]} />
                            <View style={styles.dot} />
                        </View>
                        <Text style={styles.waitingText}>Waiting for network...</Text>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '85%',
        alignItems: 'center',
    },
    content: {
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.error,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 6,
        borderColor: '#FFEBEE',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    loaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    pulse: {
        transform: [{ scale: 1.2 }],
        opacity: 0.6,
    },
    waitingText: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '600',
        letterSpacing: 0.5,
    }
});
