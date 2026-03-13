import React from 'react';
import { 
    TouchableOpacity, 
    Text, 
    StyleSheet, 
    ActivityIndicator, 
    ViewStyle, 
    TextStyle,
    View
} from 'react-native';
import { theme } from '../theme/theme';
import { colors } from '../theme/colors';

interface CustomButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export const CustomButton = ({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    style,
    textStyle,
}: CustomButtonProps) => {
    const isPrimary = variant === 'primary';
    const isSecondary = variant === 'secondary';
    const isOutline = variant === 'outline';
    const isGhost = variant === 'ghost';
    const isDanger = variant === 'danger';

    const getButtonStyle = () => {
        let base: ViewStyle = styles.base;
        
        // Variants
        if (isPrimary) base = { ...base, backgroundColor: colors.primary, borderColor: colors.primary };
        if (isSecondary) base = { ...base, backgroundColor: colors.secondary, borderColor: colors.secondary };
        if (isOutline) base = { ...base, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border };
        if (isGhost) base = { ...base, backgroundColor: 'transparent', borderWidth: 0 };
        if (isDanger) base = { ...base, backgroundColor: colors.error, borderColor: colors.error };

        // Sizes
        if (size === 'sm') base = { ...base, paddingVertical: 8, paddingHorizontal: 16 };
        if (size === 'lg') base = { ...base, paddingVertical: 16, paddingHorizontal: 32 };

        if (disabled || loading) base = { ...base, opacity: 0.6 };

        return base;
    };

    const getTextStyle = () => {
        let base: TextStyle = { ...theme.typography.button };

        if (isPrimary) base = { ...base, color: colors.black };
        if (isSecondary) base = { ...base, color: colors.white };
        if (isOutline) base = { ...base, color: colors.textPrimary };
        if (isGhost) base = { ...base, color: colors.textSecondary };
        if (isDanger) base = { ...base, color: colors.white };

        if (size === 'sm') base = { ...base, fontSize: 13 };
        if (size === 'lg') base = { ...base, fontSize: 16 };

        return base;
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[getButtonStyle(), style]}
        >
            {loading ? (
                <ActivityIndicator color={isPrimary ? colors.black : colors.white} size="small" />
            ) : (
                <View style={styles.content}>
                    {icon && <View style={styles.iconContainer}>{icon}</View>}
                    <Text style={[getTextStyle(), textStyle]}>{title}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        borderRadius: theme.radii.lg,
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        marginRight: 8,
    },
});
